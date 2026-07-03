// Bypass Vite import protection
const TANSTACK_SERVER = "@tanstack/react-start/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Chave para ofuscar IPs nos hashes de banco por LGPD
const IP_SALT = "megafama_ip_salt_v1";

/**
 * Obtém o IP do cliente atual e retorna seu hash SHA-256 (para não persistir IP direto)
 */
export async function getClientIpHash(): Promise<string> {
  let ip = "127.0.0.1";
  try {
    const { getRequestIP } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const rawIp = getRequestIP({ xForwardedFor: true });
    if (rawIp) ip = rawIp;
  } catch {}
  
  const { createHash } = await import(/* @vite-ignore */ "crypto");
  return createHash("sha256").update(ip + IP_SALT).digest("hex");
}

/**
 * Obtém o User Agent do cliente e retorna seu hash SHA-256
 */
export async function getClientUaHash(): Promise<string> {
  let ua = "unknown_ua";
  try {
    const { getRequestHeader } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const rawUa = getRequestHeader("user-agent");
    if (rawUa) ua = rawUa;
  } catch {}
  
  const { createHash } = await import(/* @vite-ignore */ "crypto");
  return createHash("sha256").update(ua + IP_SALT).digest("hex");
}
/**
 * Rate limiter genérico baseado em banco de dados
 * @param key Identificador da ação (ex: "submit_order:ip_hash")
 * @param maxAttempts Limite de tentativas na janela
 * @param windowSeconds Janela de tempo em segundos
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;

  try {
    let record = await prisma.rateLimit.findUnique({ where: { key } });

    if (!record) {
      try {
        // Primeira tentativa
        record = await prisma.rateLimit.create({
          data: {
            key,
            attempts: 1,
            lastAttempt: now,
          },
        });
        return { limited: false, retryAfterSeconds: 0 };
      } catch (err: any) {
        if (err.code === "P2002") {
          // Se outro processo inseriu concorrentemente, lê o registro inserido
          record = await prisma.rateLimit.findUnique({ where: { key } });
        } else {
          throw err;
        }
      }
    }

    if (!record) {
      return { limited: false, retryAfterSeconds: 0 };
    }

    const elapsedMs = now.getTime() - record.lastAttempt.getTime();

    // Se já passou da janela de tempo, reseta os contadores
    if (elapsedMs > windowMs) {
      await prisma.rateLimit.update({
        where: { key },
        data: {
          attempts: 1,
          lastAttempt: now,
          blockedUntil: null,
        },
      });
      return { limited: false, retryAfterSeconds: 0 };
    }

    // Se estiver bloqueado temporariamente
    if (record.blockedUntil && record.blockedUntil > now) {
      const waitTime = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000);
      return { limited: true, retryAfterSeconds: waitTime };
    }

    // Incrementa tentativas
    const newAttempts = record.attempts + 1;

    if (newAttempts > maxAttempts) {
      const blockedUntil = new Date(now.getTime() + windowMs);
      await prisma.rateLimit.update({
        where: { key },
        data: {
          attempts: newAttempts,
          lastAttempt: now,
          blockedUntil,
        },
      });
      return { limited: true, retryAfterSeconds: windowSeconds };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: {
        attempts: newAttempts,
        lastAttempt: now,
      },
    });

    return { limited: false, retryAfterSeconds: 0 };
  } catch (err) {
    console.error("Erro no rate limiter:", err);
    // Em caso de falha de conexão com banco, permite a requisição por tolerância a falhas
    return { limited: false, retryAfterSeconds: 0 };
  }
}

/**
 * Rate Limiting específico para tentativas de login administrativo com backoff exponencial
 */
export async function checkLoginRateLimit(ipHash: string): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const key = `login_admin:${ipHash}`;
  const now = new Date();

  try {
    const record = await prisma.rateLimit.findUnique({ where: { key } });

    if (!record) {
      return { limited: false, retryAfterSeconds: 0 };
    }

    if (record.blockedUntil && record.blockedUntil > now) {
      const waitTime = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 1000);
      return { limited: true, retryAfterSeconds: waitTime };
    }

    // Se a última tentativa foi há mais de 10 minutos, limpa o histórico de erros
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    if (record.lastAttempt < tenMinutesAgo) {
      await prisma.rateLimit.delete({ where: { key } }).catch(() => {});
      return { limited: false, retryAfterSeconds: 0 };
    }

    return { limited: false, retryAfterSeconds: 0 };
  } catch {
    return { limited: false, retryAfterSeconds: 0 };
  }
}

/**
 * Registra uma tentativa de login malsucedida e aumenta o tempo de bloqueio
 */
export async function recordFailedLogin(ipHash: string): Promise<void> {
  const key = `login_admin:${ipHash}`;
  const now = new Date();

  try {
    const record = await prisma.rateLimit.findUnique({ where: { key } });

    if (!record) {
      await prisma.rateLimit.create({
        data: {
          key,
          attempts: 1,
          lastAttempt: now,
          blockedUntil: null,
        },
      });
      return;
    }

    const nextAttempts = record.attempts + 1;
    let blockSeconds = 0;

    // Tempo de bloqueio progressivo
    if (nextAttempts >= 5) {
      blockSeconds = 600; // 10 minutos
    } else if (nextAttempts >= 3) {
      blockSeconds = 60;  // 1 minuto
    }

    const blockedUntil = blockSeconds > 0 ? new Date(now.getTime() + blockSeconds * 1000) : null;

    await prisma.rateLimit.update({
      where: { key },
      data: {
        attempts: nextAttempts,
        lastAttempt: now,
        blockedUntil,
      },
    });
  } catch (err) {
    console.error("Erro ao registrar tentativa de login malsucedida:", err);
  }
}

/**
 * Reseta as tentativas após login bem-sucedido
 */
export async function resetLoginAttempts(ipHash: string): Promise<void> {
  const key = `login_admin:${ipHash}`;
  try {
    await prisma.rateLimit.delete({ where: { key } });
  } catch {}
}
