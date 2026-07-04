import { createServerFn } from "@tanstack/react-start";
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts, getClientIpHash, getClientUaHash } from "./rate-limiter";

// Bypass Vite's import-protection for server-only modules used within server functions
const TANSTACK_SERVER = "@tanstack/react-start/server";

// Salt para IP de rate-limiting (LGPD compliance)
const IP_SALT = "megafama_ip_salt_v1";
const SESSION_COOKIE_NAME = "megafama_admin_session";

// Singleton do Prisma em nível de módulo para evitar vazamento de conexões
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

/**
 * Hash do IP para auditoria/sessão de forma segura
 */
async function getIpHash(): Promise<string> {
  let ip = "127.0.0.1";
  try {
    const { getRequestHeader } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const crypto = await import("crypto");
    const xForwardedFor = getRequestHeader("x-forwarded-for");
    if (xForwardedFor) {
      ip = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(",")[0].trim();
    }
    return crypto.createHash("sha256").update(ip + IP_SALT).digest("hex");
  } catch {
    return "unknown_ip_hash";
  }
}

/**
 * Hash do User Agent para segurança adicional na sessão
 */
async function getUserAgentHash(): Promise<string> {
  let ua = "unknown";
  try {
    const { getRequestHeader } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const crypto = await import("crypto");
    const rawUa = getRequestHeader("user-agent");
    if (rawUa) ua = rawUa;
    return crypto.createHash("sha256").update(ua).digest("hex");
  } catch {
    return "unknown_ua_hash";
  }
}

/**
 * Inicializador automático do Banco no Boot (Bootstrap Admin + Configs)
 */
export async function ensureDatabaseSetup() {
  try {
    const prisma = await getPrisma();
    const bcrypt = await import("bcryptjs");

    const settingKeys = [
      { key: "siteTitle", value: "Ganhe Engajamento Grátis — Mega Fama", visibility: "public" },
      { key: "siteDescription", value: "Ganhe seguidores, curtidas ou views brasileiras para testar a plataforma.", visibility: "public" },
      { key: "faviconUrl", value: "/favicon.ico", visibility: "public" },
      { key: "whatsappNumber", value: "", visibility: "public" },
      { key: "testCampaignActive", value: "true", visibility: "public" },
      { key: "dailyGlobalLimit", value: "100", visibility: "public" },
    ];

    for (const item of settingKeys) {
      const exists = await prisma.systemSetting.findUnique({ where: { key: item.key } });
      if (!exists) {
        await prisma.systemSetting.create({ data: item });
      }
    }

    const prov = await prisma.providerConfiguration.findUnique({ where: { id: "default-provider" } });
    if (!prov) {
      await prisma.providerConfiguration.create({
        data: {
          id: "default-provider",
          providerName: "Duke Fornecedor",
          apiUrl: process.env.SMM_API_URL || "https://dukefornecedor.com/api/v2",
          encryptedApiKey: process.env.SMM_API_KEY || "",
          active: true,
        },
      });
    }

    const networks = [
      { slug: "instagram", name: "Instagram", displayOrder: 1 },
      { slug: "tiktok", name: "TikTok", displayOrder: 2 },
      { slug: "kwai", name: "Kwai", displayOrder: 3 },
    ];

    for (const net of networks) {
      await prisma.socialNetwork.upsert({
        where: { slug: net.slug },
        update: {},
        create: net,
      });
    }

    const serviceTypes = [
      { slug: "followers", name: "Seguidores" },
      { slug: "likes", name: "Curtidas" },
      { slug: "views", name: "Views" },
    ];

    for (const st of serviceTypes) {
      await prisma.serviceType.upsert({
        where: { slug: st.slug },
        update: {},
        create: st,
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (adminEmail && adminInitialPassword) {
      const email = adminEmail.trim().toLowerCase();
      const exists = await prisma.adminUser.findUnique({ where: { email } });
      if (!exists) {
        const passwordHash = await bcrypt.hash(adminInitialPassword, 12);
        await prisma.adminUser.create({
          data: {
            email,
            passwordHash,
            active: true,
          },
        });
      }
    }
  } catch (err: any) {
    console.error("[BOOTSTRAP ERROR] Erro ao inicializar tabelas e administrador:", err.message || err);
  }
}

// Interface plana compatível com o frontend existente
export interface SettingsData {
  smmApiUrl: string;
  smmApiKey: string;
  instagramFollowersServiceId: string;
  instagramLikesServiceId: string;
  instagramViewsServiceId: string;
  tiktokFollowersServiceId: string;
  tiktokLikesServiceId: string;
  tiktokViewsServiceId: string;
  kwaiFollowersServiceId: string;
  kwaiLikesServiceId: string;
  kwaiViewsServiceId: string;
  siteTitle: string;
  siteDescription: string;
  faviconUrl: string;
  whatsappNumber: string;
  testCampaignActive: boolean;
  dailyGlobalLimit: number;
}

export interface OrderRecord {
  id: string;
  at: string;
  networkId: string;
  benefitId: string;
  inputType: string;
  input: string;
  quantity: number;
  status: "pending" | "validating" | "processing" | "completed" | "failed" | "rejected" | "duplicate" | "cancelled";
  smmOrderId?: string;
  error?: string;
  cost: number;
  retryCount: number;
}

/**
 * Validação rigorosa de sessão de administrador no backend
 */
async function isAuthorized(): Promise<{ authorized: boolean; adminUserId?: string }> {
  await ensureDatabaseSetup();
  try {
    const { getCookie } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const crypto = await import("crypto");
    const prisma = await getPrisma();

    const rawToken = getCookie(SESSION_COOKIE_NAME);
    if (!rawToken) return { authorized: false };

    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: hash },
      include: { adminUser: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.adminUser.active) {
      return { authorized: false };
    }

    return { authorized: true, adminUserId: session.adminUserId };
  } catch {
    return { authorized: false };
  }
}

// ============ LEITURA E GRAVAÇÃO DE CONFIGURAÇÕES RELACIONAIS ============

export async function readSettingsRaw(): Promise<SettingsData> {
  await ensureDatabaseSetup();
  const prisma = await getPrisma();
  
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  const provider = await prisma.providerConfiguration.findUnique({ where: { id: "default-provider" } });

  const netServices = await prisma.networkService.findMany({
    include: { socialNetwork: true, serviceType: true },
  });

  const getServiceId = (net: string, type: string) => {
    const ns = netServices.find((s) => s.socialNetwork.slug === net && s.serviceType.slug === type);
    return ns ? ns.providerServiceId : "";
  };

  return {
    smmApiUrl: provider?.apiUrl || "https://dukefornecedor.com/api/v2",
    smmApiKey: provider?.encryptedApiKey || "",
    instagramFollowersServiceId: getServiceId("instagram", "followers"),
    instagramLikesServiceId: getServiceId("instagram", "likes"),
    instagramViewsServiceId: getServiceId("instagram", "views"),
    tiktokFollowersServiceId: getServiceId("tiktok", "followers"),
    tiktokLikesServiceId: getServiceId("tiktok", "likes"),
    tiktokViewsServiceId: getServiceId("tiktok", "views"),
    kwaiFollowersServiceId: getServiceId("kwai", "followers"),
    kwaiLikesServiceId: getServiceId("kwai", "likes"),
    kwaiViewsServiceId: getServiceId("kwai", "views"),
    siteTitle: settingsMap.get("siteTitle") || "Ganhe Engajamento Grátis — Mega Fama",
    siteDescription: settingsMap.get("siteDescription") || "",
    faviconUrl: settingsMap.get("faviconUrl") || "/favicon.ico",
    whatsappNumber: settingsMap.get("whatsappNumber") || "",
    testCampaignActive: settingsMap.get("testCampaignActive") === "true",
    dailyGlobalLimit: Number(settingsMap.get("dailyGlobalLimit") || 100),
  };
}

export const getAdminSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const raw = await readSettingsRaw();
    const maskedKey = raw.smmApiKey 
      ? (raw.smmApiKey.length > 8 ? `${raw.smmApiKey.substring(0, 4)}...${raw.smmApiKey.substring(raw.smmApiKey.length - 4)}` : "****")
      : "";
    
    return {
      ...raw,
      smmApiKey: maskedKey,
    };
  });

export async function saveAdminSettingsHandler(data: SettingsData, adminUserId?: string) {
  const prisma = await getPrisma();
  
  // Validações
  if (data.siteTitle.length > 100) throw new Error("Título muito longo.");
  if (data.siteDescription.length > 300) throw new Error("Meta descrição muito longa.");
  if (data.whatsappNumber && !/^\d+$/.test(data.whatsappNumber)) {
    throw new Error("O número de WhatsApp deve conter apenas dígitos.");
  }

  let finalApiKey = data.smmApiKey;
  if (data.smmApiKey.includes("...")) {
    const old = await prisma.providerConfiguration.findUnique({ where: { id: "default-provider" } });
    if (old) finalApiKey = old.encryptedApiKey;
  }

  const systemKeys = [
    { key: "siteTitle", value: data.siteTitle },
    { key: "siteDescription", value: data.siteDescription },
    { key: "faviconUrl", value: data.faviconUrl },
    { key: "whatsappNumber", value: data.whatsappNumber },
    { key: "testCampaignActive", value: String(data.testCampaignActive) },
    { key: "dailyGlobalLimit", value: String(data.dailyGlobalLimit) },
  ];

  for (const item of systemKeys) {
    await prisma.systemSetting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: { key: item.key, value: item.value, visibility: "public" },
    });
  }

  await prisma.providerConfiguration.upsert({
    where: { id: "default-provider" },
    update: {
      apiUrl: data.smmApiUrl,
      encryptedApiKey: finalApiKey,
    },
    create: {
      id: "default-provider",
      providerName: "Duke Fornecedor",
      apiUrl: data.smmApiUrl,
      encryptedApiKey: finalApiKey,
      active: true,
    },
  });

  const serviceMappings = [
    { net: "instagram", type: "followers", val: data.instagramFollowersServiceId },
    { net: "instagram", type: "likes", val: data.instagramLikesServiceId },
    { net: "instagram", type: "views", val: data.instagramViewsServiceId },
    { net: "tiktok", type: "followers", val: data.tiktokFollowersServiceId },
    { net: "tiktok", type: "likes", val: data.tiktokLikesServiceId },
    { net: "tiktok", type: "views", val: data.tiktokViewsServiceId },
    { net: "kwai", type: "followers", val: data.kwaiFollowersServiceId },
    { net: "kwai", type: "likes", val: data.kwaiLikesServiceId },
    { net: "kwai", type: "views", val: data.kwaiViewsServiceId },
  ];

  const networks = await prisma.socialNetwork.findMany();
  const serviceTypes = await prisma.serviceType.findMany();
  const netMap = new Map(networks.map((n) => [n.slug, n.id]));
  const typeMap = new Map(serviceTypes.map((t) => [t.slug, t.id]));

  for (const mapping of serviceMappings) {
    const netId = netMap.get(mapping.net);
    const typeId = typeMap.get(mapping.type);

    if (netId && typeId) {
      await prisma.networkService.upsert({
        where: { socialNetworkId_serviceTypeId: { socialNetworkId: netId, serviceTypeId: typeId } },
        update: { providerServiceId: mapping.val },
        create: {
          socialNetworkId: netId,
          serviceTypeId: typeId,
          providerServiceId: mapping.val,
          active: true,
        },
      });
    }
  }

  const ipHash = await getIpHash();
  await prisma.auditLog.create({
    data: {
      adminUserId: adminUserId || null,
      action: "update_settings",
      entityType: "SystemSetting",
      entityId: "default",
      newData: JSON.stringify({ siteTitle: data.siteTitle, testCampaignActive: data.testCampaignActive }),
      ipHash,
    },
  }).catch(() => {});

  return { success: true };
}

export const saveAdminSettings = createServerFn({ method: "POST" })
  .validator((settings: SettingsData) => settings)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    return await saveAdminSettingsHandler(data, auth.adminUserId);
  });

// ============ AUTENTICAÇÃO E SESSÕES ============

export async function loginAdminHandler(password?: string, ipHash?: string, userAgentHash?: string) {
  await ensureDatabaseSetup();
  const prisma = await getPrisma();
  const bcrypt = await import("bcryptjs");
  const crypto = await import("crypto");

  const admin = await prisma.adminUser.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    return {
      success: false,
      error: "Nenhum usuário administrador cadastrado no banco de dados.",
    };
  }

  let match = await bcrypt.compare(password || "", admin.passwordHash);

  // Fallback e Sincronização: se a senha for igual a do .env, aprova e sincroniza o banco
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!match && password === envPassword && envPassword) {
    match = true;
    const newHash = await bcrypt.hash(envPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    }).catch(() => {});
  }

  if (!match) {
    return { success: false, error: "Senha incorreta. Tente novamente." };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const durationHours = 2;
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      adminUserId: admin.id,
      tokenHash,
      expiresAt,
      ipHash: ipHash || "unknown",
      userAgentHash: userAgentHash || "unknown",
    },
  });

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});

  return { success: true, token: rawToken };
}

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((d: { password?: string }) => d)
  .handler(async ({ data }) => {
    const { setCookie } = await import(/* @vite-ignore */ TANSTACK_SERVER);
    const ipHash = await getClientIpHash();
    const uaHash = await getClientUaHash();

    const rateCheck = await checkLoginRateLimit(ipHash);
    if (rateCheck.limited) {
      return { success: false, error: `Bloqueado por tentativas excessivas. Aguarde ${rateCheck.retryAfterSeconds}s.` };
    }

    const res = await loginAdminHandler(data.password, ipHash, uaHash);

    if (!res.success) {
      await recordFailedLogin(ipHash);
      return { success: false, error: res.error };
    }

    await resetLoginAttempts(ipHash);

    setCookie(SESSION_COOKIE_NAME, res.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
    });

    return { success: true };
  });

export const checkAdminAuth = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await isAuthorized();
    return { authenticated: auth.authorized };
  });

export const logoutAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { getCookie, deleteCookie } = await import(/* @vite-ignore */ TANSTACK_SERVER);
      const crypto = await import("crypto");
      const prisma = await getPrisma();

      const rawToken = getCookie(SESSION_COOKIE_NAME);
      if (rawToken) {
        const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
        await prisma.adminSession.updateMany({
          where: { tokenHash: hash },
          data: { revokedAt: new Date() },
        });
      }
      deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
    } catch {}
    return { success: true };
  });

// ============ CRUD QUANTIDADES GRATUITAS (FreeTrialOption) ============

export async function getFreeQuantitiesHandler() {
  await ensureDatabaseSetup();
  const prisma = await getPrisma();

  const options = await prisma.freeTrialOption.findMany({
    include: { networkService: { include: { socialNetwork: true, serviceType: true } } },
    orderBy: [{ networkService: { socialNetwork: { displayOrder: "asc" } } }, { quantity: "asc" }],
  });

  return options.map((o) => ({
    id: o.id,
    networkId: o.networkService.socialNetwork.slug,
    benefitId: o.networkService.serviceType.slug,
    quantity: o.quantity,
    smmServiceId: o.networkService.providerServiceId,
    active: o.active,
  }));
}

export const getFreeQuantities = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getFreeQuantitiesHandler();
  });

export async function saveFreeQuantityHandler(data: { id?: string; networkId: string; benefitId: string; quantity: number; smmServiceId: string; active: boolean }) {
  const prisma = await getPrisma();
  const { id, networkId, benefitId, quantity, smmServiceId, active } = data;
  if (quantity <= 0) throw new Error("Quantidade inválida.");

  const net = await prisma.socialNetwork.findUnique({ where: { slug: networkId } });
  const st = await prisma.serviceType.findUnique({ where: { slug: benefitId } });

  if (!net || !st) throw new Error("Rede social ou Tipo de serviço inválidos.");

  const netService = await prisma.networkService.upsert({
    where: { socialNetworkId_serviceTypeId: { socialNetworkId: net.id, serviceTypeId: st.id } },
    update: { providerServiceId: smmServiceId },
    create: {
      socialNetworkId: net.id,
      serviceTypeId: st.id,
      providerServiceId: smmServiceId,
    },
  });

  if (id) {
    await prisma.freeTrialOption.update({
      where: { id },
      data: {
        networkServiceId: netService.id,
        quantity: Number(quantity),
        active,
      },
    });
  } else {
    await prisma.freeTrialOption.create({
      data: {
        networkServiceId: netService.id,
        quantity: Number(quantity),
        active,
      },
    });
  }

  return { success: true };
}

export const saveFreeQuantity = createServerFn({ method: "POST" })
  .validator((q: { id?: string; networkId: string; benefitId: string; quantity: number; smmServiceId: string; active: boolean }) => q)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    return await saveFreeQuantityHandler(data);
  });

export const deleteFreeQuantity = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    const prisma = await getPrisma();

    await prisma.freeTrialOption.delete({ where: { id: data.id } });
    return { success: true };
  });

// ============ CRUD PACOTES DE OFERTAS (PaidPackage) ============

export async function getPaidPackagesHandler() {
  await ensureDatabaseSetup();
  const prisma = await getPrisma();

  const pkgs = await prisma.paidPackage.findMany({
    include: { networkService: { include: { socialNetwork: true, serviceType: true } } },
    orderBy: { displayOrder: "asc" },
  });

  return pkgs.map((p) => ({
    id: p.id,
    networkId: p.networkService.socialNetwork.slug,
    benefitId: p.networkService.serviceType.slug,
    quantity: p.quantity,
    price: p.price,
    promoPrice: p.promotionalPrice,
    title: p.name,
    description: p.description,
    badge: p.badge,
    badgeVariant: p.badgeVariant || "default",
    bullets: JSON.parse(p.bullets || "[]"),
    ctaLabel: "Comprar agora",
    url: p.redirectUrl,
    sortOrder: p.displayOrder,
    active: p.active,
  }));
}

export const getPaidPackages = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getPaidPackagesHandler();
  });

export async function savePaidPackageHandler(data: { id?: string; networkId: string; benefitId: string; quantity: number; price: number; promoPrice?: number | null; title: string; description: string; badge?: string | null; badgeVariant: string; extraNote?: string | null; bullets: string[]; ctaLabel: string; url: string; sortOrder: number; active: boolean }) {
  const prisma = await getPrisma();
  const net = await prisma.socialNetwork.findUnique({ where: { slug: data.networkId } });
  const st = await prisma.serviceType.findUnique({ where: { slug: data.benefitId } });
  if (!net || !st) throw new Error("Rede social ou Tipo de serviço inválidos.");

  const netService = await prisma.networkService.upsert({
    where: { socialNetworkId_serviceTypeId: { socialNetworkId: net.id, serviceTypeId: st.id } },
    update: {},
    create: {
      socialNetworkId: net.id,
      serviceTypeId: st.id,
      providerServiceId: "",
    },
  });

  const bulletsStr = JSON.stringify(data.bullets);
  const dbData = {
    networkServiceId: netService.id,
    name: data.title,
    quantity: Number(data.quantity),
    price: Number(data.price),
    promotionalPrice: data.promoPrice ? Number(data.promoPrice) : null,
    description: data.description,
    badge: data.badge || null,
    badgeVariant: data.badgeVariant,
    redirectUrl: data.url,
    active: data.active,
    displayOrder: Number(data.sortOrder),
    bullets: bulletsStr,
    campaignParameters: data.extraNote || null,
  };

  if (data.id) {
    await prisma.paidPackage.update({ where: { id: data.id }, data: dbData });
  } else {
    await prisma.paidPackage.create({ data: dbData });
  }

  return { success: true };
}

export const savePaidPackage = createServerFn({ method: "POST" })
  .validator((p: { id?: string; networkId: string; benefitId: string; quantity: number; price: number; promoPrice?: number | null; title: string; description: string; badge?: string | null; badgeVariant: string; extraNote?: string | null; bullets: string[]; ctaLabel: string; url: string; sortOrder: number; active: boolean }) => p)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    return await savePaidPackageHandler(data);
  });

export const deletePaidPackage = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    const prisma = await getPrisma();

    await prisma.paidPackage.delete({ where: { id: data.id } });
    return { success: true };
  });

// ============ REGISTRO E MÉTRICAS DE REDIRECIONAMENTOS ============

export async function recordRedirectLogHandler(data: { type: "view" | "click"; networkId: string; benefitId: string; quantity: number; campaignSource?: string; relatedOrderId?: string; sessionId: string }) {
  await ensureDatabaseSetup();
  const prisma = await getPrisma();
  try {
    const net = await prisma.socialNetwork.findUnique({ where: { slug: data.networkId } });
    const st = await prisma.serviceType.findUnique({ where: { slug: data.benefitId } });
    if (!net || !st) return { success: false };

    const pkg = await prisma.paidPackage.findFirst({
      where: {
        networkService: { socialNetworkId: net.id, serviceTypeId: st.id },
        quantity: data.quantity,
      },
    });

    if (!pkg) return { success: false };

    await prisma.redirectEvent.create({
      data: {
        orderId: data.relatedOrderId || null,
        paidPackageId: pkg.id,
        eventType: data.type,
        sessionIdentifier: data.sessionId,
        campaignSource: data.campaignSource || null,
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export const recordRedirectLog = createServerFn({ method: "POST" })
  .validator((d: { type: "view" | "click"; networkId: string; benefitId: string; quantity: number; campaignSource?: string; relatedOrderId?: string; sessionId: string }) => d)
  .handler(async ({ data }) => {
    return await recordRedirectLogHandler(data);
  });

// ============ PEDIDOS E AUDITORIA ============

export async function getAdminOrdersHandler() {
  const prisma = await getPrisma();
  const records = await prisma.order.findMany({
    include: { socialNetwork: true, serviceType: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return records.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    networkId: r.socialNetwork.slug,
    benefitId: r.serviceType.slug,
    inputType: r.originalTarget.startsWith("http") ? "link" : "profile",
    input: r.originalTarget,
    quantity: r.quantity,
    status: r.status as OrderRecord["status"],
    smmOrderId: r.providerOrderId || undefined,
    error: r.errorMessage || undefined,
    cost: r.recordedCost,
    retryCount: r.attemptsCount,
  }));
}

export const getAdminOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    return await getAdminOrdersHandler();
  });

// ============ SMM INTEGRATION HELPERS ============

export const getSMMBalanceRealTime = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");

    const settings = await readSettingsRaw();
    if (!settings.smmApiUrl || !settings.smmApiKey) {
      return { success: false, error: "API Key ou API URL não configurados" };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("key", settings.smmApiKey);
      formData.append("action", "balance");

      const response = await fetch(settings.smmApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SMMClient/1.0",
        },
        body: formData.toString(),
      });

      if (!response.ok) throw new Error("Erro HTTP");
      const data = await response.json();
      if (data.error) return { success: false, error: data.error };

      return { success: true, balance: parseFloat(data.balance), currency: data.currency };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro na rede" };
    }
  });

export async function retrySMMOrderHandler(orderId: string, adminUserId?: string) {
  const prisma = await getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { socialNetwork: true, serviceType: true, networkService: true },
  });
  
  if (!order) {
    return { success: false, error: "Pedido não encontrado" };
  }

  if (order.status === "completed" || order.status === "duplicate" || order.status === "cancelled") {
    return { success: false, error: `Pedidos com status '${order.status}' não podem ser reenviados.` };
  }

  const settings = await readSettingsRaw();
  const serviceId = order.networkService.providerServiceId;

  if (!serviceId) {
    return { success: false, error: `Service ID não configurado para este teste` };
  }

  const attemptNumber = order.attemptsCount + 1;

  try {
    const formData = new URLSearchParams();
    formData.append("key", settings.smmApiKey);
    formData.append("action", "add");
    formData.append("service", serviceId);
    formData.append("link", order.originalTarget);
    formData.append("quantity", order.quantity.toString());

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "processing",
        attemptsCount: attemptNumber,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: "processing",
        reason: `Reenvio administrativo (Tentativa #${attemptNumber})`,
        changedByAdminId: adminUserId || null,
      },
    });

    const response = await fetch(settings.smmApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SMMClient/1.0",
      },
      body: formData.toString(),
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const resData = await response.json();

    if (resData.error) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "failed",
          errorCode: "SMM_Error",
          errorMessage: resData.error,
        },
      });

      await prisma.orderAttempt.create({
        data: {
          orderId: order.id,
          attemptNumber,
          status: "failed",
          requestSummary: formData.toString(),
          responseSummary: JSON.stringify(resData),
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: "processing",
          newStatus: "failed",
          reason: `Reenvio falhou no fornecedor: ${resData.error}`,
          changedByAdminId: adminUserId || null,
        },
      });

      return { success: false, error: `Erro no SMM: ${resData.error}` };
    }

    if (resData.order) {
      const providerId = resData.order.toString();

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "completed",
          providerOrderId: providerId,
          errorCode: null,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      await prisma.orderAttempt.create({
        data: {
          orderId: order.id,
          attemptNumber,
          providerOrderId: providerId,
          status: "completed",
          requestSummary: formData.toString(),
          responseSummary: JSON.stringify(resData),
        },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: "processing",
          newStatus: "completed",
          reason: `Reenvio concluído com sucesso. ID SMM: ${providerId}`,
          changedByAdminId: adminUserId || null,
        },
      });

      const ipHash = await getIpHash();
      await prisma.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: "retry_order",
          entityType: "Order",
          entityId: order.id,
          newData: JSON.stringify({ providerOrderId: providerId }),
          ipHash,
        },
      }).catch(() => {});

      return { success: true, smmOrderId: providerId };
    }

    return { success: false, error: "Resposta inesperada do fornecedor." };
  } catch (err: any) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed",
        errorCode: "Network_Error",
        errorMessage: err.message || "Erro de rede",
      },
    });

    return { success: false, error: `Falha de conexão com fornecedor: ${err.message}` };
  }
}

export const retrySMMOrder = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const auth = await isAuthorized();
    if (!auth.authorized) throw new Error("Não autorizado");
    return await retrySMMOrderHandler(data.orderId, auth.adminUserId);
  });
