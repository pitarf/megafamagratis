import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function runMigration() {
  console.log("🚀 Iniciando migração de JSON para PostgreSQL...");

  const dataDir = path.resolve("src", "data");
  const settingsFile = path.join(dataDir, "settings.json");
  const ordersFile = path.join(dataDir, "orders.json");

  let settingsMigrated = false;
  let ordersCount = 0;
  let ordersSkipped = 0;
  let ordersFailed = 0;

  // 1. Mapeamento de Redes Sociais e Serviços no Postgres para obter IDs válidos
  const networks = await prisma.socialNetwork.findMany();
  const serviceTypes = await prisma.serviceType.findMany();

  const netMap = new Map(networks.map((n) => [n.slug, n.id]));
  const typeMap = new Map(serviceTypes.map((t) => [t.slug, t.id]));

  // 1. MIGRAÇÃO DE CONFIGURAÇÕES (settings.json)
  try {
    const settingsExists = await fs.access(settingsFile).then(() => true).catch(() => false);
    
    if (settingsExists) {
      console.log("🔍 Arquivo settings.json localizado. Importando configurações...");
      const rawData = await fs.readFile(settingsFile, "utf-8");
      const settings = JSON.parse(rawData);

      // Migrar SystemSetting
      const systemKeys = [
        { key: "siteTitle", value: settings.siteTitle },
        { key: "siteDescription", value: settings.siteDescription },
        { key: "faviconUrl", value: settings.faviconUrl },
        { key: "whatsappNumber", value: settings.whatsappNumber },
        { key: "testCampaignActive", value: String(settings.testCampaignActive ?? true) },
        { key: "dailyGlobalLimit", value: String(settings.dailyGlobalLimit ?? 100) },
      ];

      for (const item of systemKeys) {
        if (item.value !== undefined) {
          await prisma.systemSetting.upsert({
            where: { key: item.key },
            update: { value: item.value },
            create: { key: item.key, value: item.value, visibility: "public" },
          });
        }
      }

      // Migrar ProviderConfiguration
      if (settings.smmApiUrl || settings.smmApiKey) {
        await prisma.providerConfiguration.upsert({
          where: { id: "default-provider" },
          update: {
            apiUrl: settings.smmApiUrl || "https://dukefornecedor.com/api/v2",
            encryptedApiKey: settings.smmApiKey || "",
          },
          create: {
            id: "default-provider",
            providerName: "Duke Fornecedor",
            apiUrl: settings.smmApiUrl || "https://dukefornecedor.com/api/v2",
            encryptedApiKey: settings.smmApiKey || "",
            active: true,
          },
        });
      }

      // Migrar IDs de Serviços nos NetworkServices
      const serviceMappings = [
        { net: "instagram", type: "followers", key: "instagramFollowersServiceId" },
        { net: "instagram", type: "likes", key: "instagramLikesServiceId" },
        { net: "instagram", type: "views", key: "instagramViewsServiceId" },
        { net: "tiktok", type: "followers", key: "tiktokFollowersServiceId" },
        { net: "tiktok", type: "likes", key: "tiktokLikesServiceId" },
        { net: "tiktok", type: "views", key: "tiktokViewsServiceId" },
        { net: "kwai", type: "followers", key: "kwaiFollowersServiceId" },
        { net: "kwai", type: "likes", key: "kwaiLikesServiceId" },
        { net: "kwai", type: "views", key: "kwaiViewsServiceId" },
      ];

      for (const mapping of serviceMappings) {
        const providerId = settings[mapping.key];
        if (providerId) {
          const netId = netMap.get(mapping.net);
          const typeId = typeMap.get(mapping.type);

          if (netId && typeId) {
            await prisma.networkService.upsert({
              where: { socialNetworkId_serviceTypeId: { socialNetworkId: netId, serviceTypeId: typeId } },
              update: { providerServiceId: String(providerId) },
              create: {
                socialNetworkId: netId,
                serviceTypeId: typeId,
                providerServiceId: String(providerId),
                unitCost: 0.0,
                active: true,
              },
            });
          }
        }
      }

      settingsMigrated = true;
      console.log("✅ Configurações importadas com sucesso.");
    } else {
      console.log("ℹ️ settings.json não localizado. Nenhuma configuração importada.");
    }
  } catch (err: any) {
    console.error("❌ Erro ao migrar settings.json:", err.message || err);
  }

  // 2. MIGRAÇÃO DE PEDIDOS (orders.json)
  try {
    const ordersExists = await fs.access(ordersFile).then(() => true).catch(() => false);

    if (ordersExists) {
      console.log("🔍 Arquivo orders.json localizado. Importando pedidos...");
      const rawData = await fs.readFile(ordersFile, "utf-8");
      const orders: any[] = JSON.parse(rawData);

      for (const order of orders) {
        try {
          // Validação e normalização de IDs de rede/serviço
          const netId = netMap.get(order.networkId);
          const typeId = typeMap.get(order.benefitId);

          if (!netId || !typeId) {
            console.warn(`⚠️ Pedido ${order.id} ignorado por plataforma ou serviço incompatível: ${order.networkId}/${order.benefitId}`);
            ordersFailed++;
            continue;
          }

          // Verifica se o NetworkService existe
          const netService = await prisma.networkService.findUnique({
            where: { socialNetworkId_serviceTypeId: { socialNetworkId: netId, serviceTypeId: typeId } },
          });

          if (!netService) {
            console.warn(`⚠️ Pedido ${order.id} ignorado: NetworkService não encontrado no banco.`);
            ordersFailed++;
            continue;
          }

          // Evita duplicidade usando idempotencyKey ou id
          const existingOrder = await prisma.order.findFirst({
            where: {
              OR: [
                { idempotencyKey: order.idempotencyKey || order.id },
                { publicId: order.id },
              ],
            },
          });

          if (existingOrder) {
            ordersSkipped++;
            continue;
          }

          // Insere pedido
          await prisma.order.create({
            data: {
              id: order.id.length === 36 ? order.id : undefined, // Preserva UUID original se for válido
              publicId: order.id,
              socialNetworkId: netId,
              serviceTypeId: typeId,
              networkServiceId: netService.id,
              quantity: Number(order.quantity),
              originalTarget: order.input,
              normalizedTarget: order.normalizedInput || order.input.toLowerCase(),
              targetHash: order.destinationHash || "legacy_migration_hash",
              status: (order.status || "completed").toLowerCase(),
              providerOrderId: order.smmOrderId ? String(order.smmOrderId) : null,
              providerResponseSummary: order.error ? String(order.error) : null,
              recordedCost: Number(order.cost || 0.0),
              idempotencyKey: order.idempotencyKey || order.id,
              campaignSource: order.campaignSource || null,
              sessionIdentifier: order.sessionId || "legacy_session",
              ipHash: order.ipHash || "legacy_ip_hash",
              attemptsCount: Number(order.retryCount || 0),
              errorCode: order.error ? "Legacy_Error" : null,
              errorMessage: order.error || null,
              createdAt: order.at ? new Date(order.at) : new Date(),
              completedAt: order.completedAt ? new Date(order.completedAt) : (order.status === "Completed" ? new Date() : null),
            },
          });

          // Se o pedido de teste foi concluído ou está ativo, bloqueia o destino
          if (["completed", "processing"].includes((order.status || "").toLowerCase())) {
            await prisma.blockedTarget.upsert({
              where: {
                socialNetworkId_targetHash: {
                  socialNetworkId: netId,
                  targetHash: order.destinationHash || "legacy_migration_hash",
                },
              },
              update: {},
              create: {
                socialNetworkId: netId,
                targetHash: order.destinationHash || "legacy_migration_hash",
                reason: "Legacy migration block",
                active: true,
                createdAt: order.at ? new Date(order.at) : new Date(),
              },
            }).catch(() => {});
          }

          ordersCount++;
        } catch (err: any) {
          console.error(`❌ Erro ao importar pedido individual ${order.id}:`, err.message || err);
          ordersFailed++;
        }
      }

      console.log(`✅ Importação de pedidos concluída. Importados: ${ordersCount}, Ignorados/Duplicados: ${ordersSkipped}, Falhas: ${ordersFailed}`);
    } else {
      console.log("ℹ️ orders.json não localizado. Nenhum pedido importado.");
    }
  } catch (err: any) {
    console.error("❌ Erro ao processar orders.json:", err.message || err);
  }

  // 3. RENOMEAR ARQUIVOS JSON PARA BACKUP SE A CONFIRMAÇÃO OCORREU
  try {
    const settingsExists = await fs.access(settingsFile).then(() => true).catch(() => false);
    if (settingsExists && settingsMigrated) {
      const backupPath = `${settingsFile}.backup`;
      await fs.rename(settingsFile, backupPath);
      console.log(`📦 Arquivo settings.json arquivado com sucesso como ${backupPath}`);
    }

    const ordersExists = await fs.access(ordersFile).then(() => true).catch(() => false);
    if (ordersExists && (ordersCount > 0 || ordersSkipped > 0)) {
      const backupPath = `${ordersFile}.backup`;
      await fs.rename(ordersFile, backupPath);
      console.log(`📦 Arquivo orders.json arquivado com sucesso como ${backupPath}`);
    }
  } catch (err: any) {
    console.error("⚠️ Alerta ao renomear arquivos de backup:", err.message || err);
  }

  console.log("\n=== RELATÓRIO FINAL DE MIGRAÇÃO ===");
  console.log(`- Configurações migradas: ${settingsMigrated ? "SIM" : "NÃO"}`);
  console.log(`- Pedidos importados: ${ordersCount}`);
  console.log(`- Pedidos duplicados (pulados): ${ordersSkipped}`);
  console.log(`- Pedidos com erro: ${ordersFailed}`);
  console.log("====================================\n");
}

runMigration()
  .catch((e) => {
    console.error("❌ Falha crítica na execução da migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
