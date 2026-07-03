
/**
 * Normaliza um nome de usuário (arroba) ou URL de publicação de forma determinística
 * e gera um hash SHA-256 do destino normalizado.
 *
 * Garante que variações de escrita de um mesmo perfil ou post sejam identificadas como duplicadas.
 */
export async function normalizeInput(
  networkId: string,
  benefitId: string,
  input: string
): Promise<{ normalized: string; hash: string }> {
  let cleaned = input.trim();
  const isProfile = benefitId === "followers";

  // Limpa fragmentos (#) se houver
  if (cleaned.includes("#")) {
    cleaned = cleaned.split("#")[0];
  }

  // Limpa query strings de rastreamento se houver
  if (cleaned.includes("?")) {
    cleaned = cleaned.split("?")[0];
  }

  // Remove barra final
  if (cleaned.endsWith("/")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  const netLower = networkId.toLowerCase();

  if (isProfile) {
    let username = cleaned;

    // Se o usuário colou a URL inteira, extraímos o username
    if (cleaned.includes("http://") || cleaned.includes("https://") || cleaned.includes(".")) {
      try {
        let urlString = cleaned;
        if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
          urlString = `https://${urlString}`;
        }
        const urlObj = new URL(urlString);
        const parts = urlObj.pathname.split("/").filter(Boolean);
        
        // No TikTok o username costuma começar com @ na URL (ex: tiktok.com/@usuario)
        if (parts.length > 0) {
          username = parts[0];
          if (username.startsWith("@")) {
            username = username.substring(1);
          }
        }
      } catch {}
    }

    // Remove o caractere @ se existir
    if (username.startsWith("@")) {
      username = username.substring(1);
    }

    // Remove espaços residuais
    username = username.replace(/\s+/g, "");

    // Normaliza para lowercase e limpa caracteres inválidos de username
    username = username.toLowerCase().replace(/[^a-z0-9_.]/g, "");

    const normalized = `profile:${netLower}:${username}`;
    const { createHash } = await import(/* @vite-ignore */ "crypto");
    const hash = createHash("sha256").update(normalized).digest("hex");

    return { normalized, hash };
  } else {
    // 2. LIMPEZA E PADRONIZAÇÃO DE URL DE POST / MÍDIA
    let urlString = cleaned;
    if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
      urlString = `https://${urlString}`;
    }

    try {
      const urlObj = new URL(urlString);

      // Padroniza o hostname (remove www. e força minúsculas)
      let host = urlObj.hostname.toLowerCase();
      if (host.startsWith("www.")) {
        host = host.substring(4);
      }

      // No Instagram, os códigos de publicação/reels (/p/CoB_xyz/ ou /reel/CoB_xyz/) são CASE-SENSITIVE.
      // O hostname e o tipo de rota (/p/ ou /reel/) devem ser minúsculos, mas o código em si deve manter as maiúsculas originais.
      let normalizedPath = urlObj.pathname;
      if (normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.substring(0, normalizedPath.length - 1);
      }

      if (netLower === "instagram") {
        const parts = normalizedPath.split("/").filter(Boolean);
        if (parts.length >= 2 && ["p", "reel", "tv"].includes(parts[0].toLowerCase())) {
          normalizedPath = `/${parts[0].toLowerCase()}/${parts[1]}`; // partes[1] é case-sensitive
        } else {
          normalizedPath = normalizedPath.toLowerCase();
        }
      } else {
        // TikTok e Kwai normalmente têm identificadores numéricos ou paths minúsculos
        normalizedPath = normalizedPath.toLowerCase();
      }

      const normalized = `post:${netLower}:${host}${normalizedPath}`;
      const { createHash } = await import(/* @vite-ignore */ "crypto");
      const hash = createHash("sha256").update(normalized).digest("hex");

      return { normalized, hash };
    } catch {
      // Fallback
      const normalized = `raw:${netLower}:${cleaned.toLowerCase()}`;
      const hash = createHash("sha256").update(normalized).digest("hex");
      return { normalized, hash };
    }
  }
}

/**
 * Valida a compatibilidade básica entre a rede social e o formato do input enviado
 */
export function validateInputFormat(
  networkId: string,
  benefitId: string,
  input: string
): { valid: boolean; error?: string } {
  const isProfile = benefitId === "followers";
  const cleaned = input.trim();

  if (!cleaned) {
    return { valid: false, error: "O campo de destino não pode estar vazio." };
  }

  // Validação de domínios com base na rede
  const lower = cleaned.toLowerCase();
  const hasHttp = lower.includes("http://") || lower.includes("https://");
  
  if (hasHttp || lower.includes(".")) {
    const isInsta = lower.includes("instagram.com") || lower.includes("instagr.am");
    const isTikTok = lower.includes("tiktok.com") || lower.includes("vt.tiktok");
    const isKwai = lower.includes("kwai.com") || lower.includes("kuaishou.com");

    if (networkId === "instagram" && !isInsta) {
      return { valid: false, error: "Por favor, insira um link válido da plataforma Instagram." };
    }
    if (networkId === "tiktok" && !isTikTok) {
      return { valid: false, error: "Por favor, insira um link válido da plataforma TikTok." };
    }
    if (networkId === "kwai" && !isKwai) {
      return { valid: false, error: "Por favor, insira um link válido da plataforma Kwai." };
    }
  }

  if (isProfile) {
    // Validação de username de perfil
    let username = cleaned;
    if (username.startsWith("@")) {
      username = username.substring(1);
    }
    
    if (username.includes("/") && !hasHttp) {
      return { valid: false, error: "Nome de usuário contém caracteres inválidos." };
    }
    
    const validUsernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!hasHttp && !validUsernameRegex.test(username)) {
      return { valid: false, error: "O nome de usuário contém caracteres inválidos." };
    }
  } else {
    // Validação de URL de post
    if (cleaned.includes(" ") || !cleaned.includes(".")) {
      return { valid: false, error: "A URL inserida é inválida." };
    }
  }

  return { valid: true };
}
