import { createServerFn } from "@tanstack/react-start";
import { normalizeInput, validateInputFormat } from "./normalizer";
import { checkRateLimit, getClientIpHash } from "./rate-limiter";
import { readSettingsRaw } from "./admin-server.server";

export interface SMMOrderInput {
  networkId: string;
  benefitId: string;
  inputType: "profile" | "link";
  input: string;
  quantity: number;
  idempotencyKey: string;
  campaignSource?: string;
  sessionId: string;
}

// Singleton do Prisma em nível de módulo
let prismaInstance: any = null;

async function getPrisma() {
  if (!prismaInstance) {
    const { PrismaClient } = await import("@prisma/client");
    const globalRef = globalThis as any;
    if (!globalRef._prisma) {
      globalRef._prisma = new PrismaClient();
    }
    prismaInstance = globalRef._prisma;
  }
  return prismaInstance;
}

export async function submitFreeTestOrderHandler(data: SMMOrderInput) {
  const prisma = await getPrisma();
  const { networkId, benefitId, input, quantity, idempotencyKey, campaignSource, sessionId } = data;

  // 1. Rate Limiting por IP (Prevenção de Abuso)
  const ipHash = await getClientIpHash();
  const rateCheck = await checkRateLimit(`submit_order:${ipHash}`, 5, 3600);
  if (rateCheck.limited) {
    return {
      success: false,
      error: `Você atingiu o limite de solicitações temporárias. Tente novamente em ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minutos.`,
    };
  }

  // 2. Idempotência: Retorna o pedido existente se a chave for repetida
  const existingByIdempotency = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  if (existingByIdempotency) {
    console.log(`[IDEMPOTÊNCIA] Pedido já processado para a chave: ${idempotencyKey}`);
    return {
      success: existingByIdempotency.status === "completed",
      orderId: existingByIdempotency.providerOrderId || undefined,
      error: existingByIdempotency.errorMessage || undefined,
    };
  }

  // 3. Verifica se a campanha está ativa
  const settings = await readSettingsRaw();
  if (!settings.testCampaignActive) {
    return {
      success: false,
      error: "A campanha de testes gratuitos está pausada no momento. Aproveite nossas ofertas promocionais!",
    };
  }

  // 4. Busca Provedor SMM
  const provider = await prisma.providerConfiguration.findUnique({ where: { id: "default-provider" } });
  if (!provider || !provider.active || !provider.apiUrl || !provider.encryptedApiKey) {
    return {
      success: false,
      error: "O envio de testes grátis está temporariamente indisponível. Contate o suporte.",
    };
  }

  // 5. Validação de Input
  const formatCheck = validateInputFormat(networkId, benefitId, input);
  if (!formatCheck.valid) {
    return { success: false, error: formatCheck.error };
  }

  // 6. Busca Redes e Serviços relacionais
  const net = await prisma.socialNetwork.findUnique({ where: { slug: networkId } });
  const st = await prisma.serviceType.findUnique({ where: { slug: benefitId } });
  if (!net || !st || !net.active || !st.active) {
    return { success: false, error: "Serviço indisponível no momento." };
  }

  const netService = await prisma.networkService.findUnique({
    where: { socialNetworkId_serviceTypeId: { socialNetworkId: net.id, serviceTypeId: st.id } },
  });
  if (!netService || !netService.active) {
    return { success: false, error: "Serviço de entrega não mapeado ou inativo." };
  }

  // Valida Opção de Teste e Quantidade
  const trialOption = await prisma.freeTrialOption.findUnique({
    where: { networkServiceId_quantity: { networkServiceId: netService.id, quantity: Number(quantity) } },
  });
  if (!trialOption || !trialOption.active) {
    return { success: false, error: "A quantidade solicitada não é válida para este teste grátis." };
  }

  // 7. Limite Diário Geral
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const ordersToday = await prisma.order.count({
    where: {
      createdAt: { gte: startOfToday },
      status: { in: ["completed", "processing"] },
    },
  });
  if (ordersToday >= settings.dailyGlobalLimit) {
    return {
      success: false,
      error: "Atingimos o limite diário de testes grátis para hoje. Tente novamente amanhã ou aproveite nossos descontos!",
    };
  }

  // 8. Normalização de Destinatário
  const norm = await normalizeInput(networkId, benefitId, input);

  // 9. Transação Atômica: Reserva do Destinatário no Banco
  try {
    const transactionResult = await prisma.$transaction(async (tx: any) => {
      // Verifica se o hash do alvo já está bloqueado
      const blocked = await tx.blockedTarget.findUnique({
        where: {
          socialNetworkId_targetHash: {
            socialNetworkId: net.id,
            targetHash: norm.hash,
          },
        },
      });

      if (blocked && blocked.active) {
        return {
          allowed: false,
          errorCode: "DUPLICATE_TARGET",
          error: "Este perfil ou conteúdo já utilizou o teste gratuito. O benefício está disponível apenas uma vez por conta.",
        };
      }

      // Se o target não existe, ou se já existe mas a trava foi removida,
      // nós criamos/atualizamos apenas se ele NÃO for marcado explicitamente como ilimitado (active: false).
      const isUnlimited = blocked && !blocked.active;
      
      if (!isUnlimited) {
        // Cria a trava atômica no BlockedTarget
        await tx.blockedTarget.upsert({
          where: {
            socialNetworkId_targetHash: {
              socialNetworkId: net.id,
              targetHash: norm.hash,
            },
          },
          update: { active: true, reason: `Pedido em andamento: ${idempotencyKey}` },
          create: {
            socialNetworkId: net.id,
            targetHash: norm.hash,
            reason: `Pedido em andamento: ${idempotencyKey}`,
            active: true,
          },
        });
      }

      // Cria o registro do Pedido
      const newOrder = await tx.order.create({
        data: {
          socialNetworkId: net.id,
          serviceTypeId: st.id,
          networkServiceId: netService.id,
          freeTrialOptionId: trialOption.id,
          quantity: Number(quantity),
          originalTarget: input,
          normalizedTarget: norm.normalized,
          targetHash: norm.hash,
          status: "processing",
          idempotencyKey,
          campaignSource: campaignSource || null,
          sessionIdentifier: sessionId,
          ipHash,
          attemptsCount: 1,
        },
      });

      return { allowed: true, orderId: newOrder.id };
    });

    if (!transactionResult.allowed) {
      return { success: false, error: transactionResult.error, errorCode: transactionResult.errorCode };
    }

    const localOrderId = transactionResult.orderId!;

    // Registra histórico inicial
    await prisma.orderStatusHistory.create({
      data: {
        orderId: localOrderId,
        previousStatus: "pending",
        newStatus: "processing",
        reason: "Solicitação recebida, iniciando despacho ao provedor SMM.",
      },
    }).catch(() => {});

    // 10. Envio à API do Provedor SMM
    try {
      const formData = new URLSearchParams();
      formData.append("key", provider.encryptedApiKey);
      formData.append("action", "add");
      formData.append("service", netService.providerServiceId);
      formData.append("link", input.trim());
      formData.append("quantity", quantity.toString());

      console.log(`[SMM EXEC POSTGRES] Despachando: ID local=${localOrderId}, Service=${netService.providerServiceId}, Qty=${quantity}`);

      const response = await fetch(provider.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SMMClient/1.0",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`Conexão HTTP falhou: Status ${response.status}`);
      }

      const resData = await response.json();

      // 11. Erros do Provedor SMM
      if (resData.error) {
        const rawError = resData.error.toString().toLowerCase();
        let friendlyError = "Falha temporária ao despachar o engajamento grátis.";

        if (rawError.includes("not enough funds") || rawError.includes("balance")) {
          friendlyError = "Servidor instável. O suporte já foi notificado. Tente novamente mais tarde.";
        } else if (rawError.includes("link") || rawError.includes("bad link")) {
          friendlyError = "O link ou usuário parece inválido. Certifique-se de que a conta está pública.";
        } else if (rawError.includes("quantity")) {
          friendlyError = "A quantidade solicitada é incompatível com as regras de entrega.";
        }

        await prisma.order.update({
          where: { id: localOrderId },
          data: {
            status: "failed",
            errorCode: "SMM_Error",
            errorMessage: resData.error,
          },
        });

        await prisma.orderAttempt.create({
          data: {
            orderId: localOrderId,
            attemptNumber: 1,
            status: "failed",
            requestSummary: formData.toString(),
            responseSummary: JSON.stringify(resData),
          },
        });

        await prisma.orderStatusHistory.create({
          data: {
            orderId: localOrderId,
            previousStatus: "processing",
            newStatus: "failed",
            reason: `Erro no SMM: ${resData.error}`,
          },
        });

        await prisma.blockedTarget.update({
          where: {
            socialNetworkId_targetHash: {
              socialNetworkId: net.id,
              targetHash: norm.hash,
            },
          },
          data: { active: false, reason: `Falhou na tentativa de envio: ${resData.error}` },
        }).catch(() => {});

        return { success: false, error: friendlyError };
      }

      if (resData.order) {
        const providerOrderId = resData.order.toString();

        await prisma.order.update({
          where: { id: localOrderId },
          data: {
            status: "completed",
            providerOrderId,
            completedAt: new Date(),
          },
        });

        await prisma.orderAttempt.create({
          data: {
            orderId: localOrderId,
            attemptNumber: 1,
            providerOrderId,
            status: "completed",
            requestSummary: formData.toString(),
            responseSummary: JSON.stringify(resData),
          },
        });

        await prisma.orderStatusHistory.create({
          data: {
            orderId: localOrderId,
            previousStatus: "processing",
            newStatus: "completed",
            reason: `Despacho efetuado com sucesso. ID SMM: ${providerOrderId}`,
          },
        });

        return {
          success: true,
          orderId: providerOrderId,
        };
      }

      throw new Error("Provedor retornou resposta inesperada sem ID de pedido.");

    } catch (err: any) {
      console.error(`[SMM EXCEPTION] Erro crítico no envio do Pedido ${localOrderId}:`, err);

      await prisma.order.update({
        where: { id: localOrderId },
        data: {
          status: "failed",
          errorCode: "Network_Exception",
          errorMessage: err.message || "Erro de conexão",
        },
      });

      await prisma.orderAttempt.create({
        data: {
          orderId: localOrderId,
          attemptNumber: 1,
          status: "failed",
          responseSummary: err.message || "Exceção de rede",
        },
      });

      await prisma.blockedTarget.update({
        where: {
          socialNetworkId_targetHash: {
            socialNetworkId: net.id,
            targetHash: norm.hash,
          },
        },
        data: { active: false, reason: `Erro de conexão: ${err.message}` },
      }).catch(() => {});

      return {
        success: false,
        error: "Falha de rede ao conectar com o servidor de entrega. Tente novamente em alguns instantes.",
      };
    }

  } catch (err: any) {
    console.error("[TRANSACTION EXCEPTION] Falha crítica de transação:", err);
    return {
      success: false,
      error: err.message || "Erro interno de concorrência. Tente novamente.",
    };
  }
}

export const submitFreeTestOrder = createServerFn({ method: "POST" })
  .validator((d: SMMOrderInput) => d)
  .handler(async ({ data }) => {
    return await submitFreeTestOrderHandler(data);
  });
