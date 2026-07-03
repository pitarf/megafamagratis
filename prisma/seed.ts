import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o semeio de dados (seeding)...");

  // 1. Configurações Globais do Sistema (SystemSetting)
  const defaultSettings = [
    { key: "siteTitle", value: "Ganhe Engajamento Grátis — Mega Fama", visibility: "public" },
    {
      key: "siteDescription",
      value: "Ganhe seguidores, curtidas ou views brasileiras para testar a plataforma. Sem senha, entrega rápida e 100% seguro.",
      visibility: "public",
    },
    { key: "faviconUrl", value: "/favicon.ico", visibility: "public" },
    { key: "whatsappNumber", value: "", visibility: "public" },
    { key: "testCampaignActive", value: "true", visibility: "public" },
    { key: "dailyGlobalLimit", value: "100", visibility: "public" },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✅ Configurações do sistema semeadas.");

  // 2. Configuração do Fornecedor SMM (ProviderConfiguration)
  const provider = await prisma.providerConfiguration.upsert({
    where: { id: "default-provider" },
    update: {},
    create: {
      id: "default-provider",
      providerName: "Duke Fornecedor",
      apiUrl: process.env.SMM_API_URL || "https://dukefornecedor.com/api/v2",
      encryptedApiKey: process.env.SMM_API_KEY || "",
      active: true,
    },
  });
  console.log("✅ Provedor SMM semeado.");

  // 3. Redes Sociais (SocialNetwork)
  const networks = [
    { slug: "instagram", name: "Instagram", displayOrder: 1 },
    { slug: "tiktok", name: "TikTok", displayOrder: 2 },
    { slug: "kwai", name: "Kwai", displayOrder: 3 },
  ];

  const dbNetworks: Record<string, any> = {};
  for (const net of networks) {
    dbNetworks[net.slug] = await prisma.socialNetwork.upsert({
      where: { slug: net.slug },
      update: {},
      create: net,
    });
  }
  console.log("✅ Redes sociais semeadas.");

  // 4. Tipos de Serviço (ServiceType)
  const serviceTypes = [
    { slug: "followers", name: "Seguidores" },
    { slug: "likes", name: "Curtidas" },
    { slug: "views", name: "Views" },
  ];

  const dbServiceTypes: Record<string, any> = {};
  for (const st of serviceTypes) {
    dbServiceTypes[st.slug] = await prisma.serviceType.upsert({
      where: { slug: st.slug },
      update: {},
      create: st,
    });
  }
  console.log("✅ Tipos de serviço semeados.");

  // 5. Associação Rede x Serviço (NetworkService) e Mapeamento de IDs
  const mappings = [
    // Instagram
    { net: "instagram", type: "followers", providerId: process.env.INSTAGRAM_FOLLOWERS_SERVICE_ID || "100" },
    { net: "instagram", type: "likes", providerId: process.env.INSTAGRAM_LIKES_SERVICE_ID || "101" },
    { net: "instagram", type: "views", providerId: process.env.INSTAGRAM_VIEWS_SERVICE_ID || "102" },
    // TikTok
    { net: "tiktok", type: "followers", providerId: process.env.TIKTOK_FOLLOWERS_SERVICE_ID || "200" },
    { net: "tiktok", type: "likes", providerId: process.env.TIKTOK_LIKES_SERVICE_ID || "201" },
    { net: "tiktok", type: "views", providerId: process.env.TIKTOK_VIEWS_SERVICE_ID || "202" },
    // Kwai
    { net: "kwai", type: "followers", providerId: process.env.KWAI_FOLLOWERS_SERVICE_ID || "300" },
    { net: "kwai", type: "likes", providerId: process.env.KWAI_LIKES_SERVICE_ID || "301" },
    { net: "kwai", type: "views", providerId: process.env.KWAI_VIEWS_SERVICE_ID || "302" },
  ];

  const dbServices: Record<string, any> = {};
  for (const map of mappings) {
    const netId = dbNetworks[map.net].id;
    const stId = dbServiceTypes[map.type].id;
    const key = `${map.net}_${map.type}`;

    dbServices[key] = await prisma.networkService.upsert({
      where: { socialNetworkId_serviceTypeId: { socialNetworkId: netId, serviceTypeId: stId } },
      update: {},
      create: {
        socialNetworkId: netId,
        serviceTypeId: stId,
        providerServiceId: map.providerId,
        unitCost: 0.0,
        active: true,
      },
    });
  }
  console.log("✅ Serviços de redes semeados.");

  // 6. Opções de Teste Grátis (FreeTrialOption)
  const trialOptions = [
    // Instagram
    { net: "instagram", type: "followers", quantity: 10, displayOrder: 1 },
    { net: "instagram", type: "followers", quantity: 15, displayOrder: 2 },
    { net: "instagram", type: "followers", quantity: 20, displayOrder: 3 },
    { net: "instagram", type: "likes", quantity: 10, displayOrder: 1 },
    { net: "instagram", type: "likes", quantity: 15, displayOrder: 2 },
    { net: "instagram", type: "likes", quantity: 20, displayOrder: 3 },
    { net: "instagram", type: "views", quantity: 1000, displayOrder: 1 },
    // TikTok
    { net: "tiktok", type: "followers", quantity: 10, displayOrder: 1 },
    { net: "tiktok", type: "followers", quantity: 15, displayOrder: 2 },
    { net: "tiktok", type: "followers", quantity: 20, displayOrder: 3 },
    { net: "tiktok", type: "likes", quantity: 10, displayOrder: 1 },
    { net: "tiktok", type: "likes", quantity: 15, displayOrder: 2 },
    { net: "tiktok", type: "likes", quantity: 20, displayOrder: 3 },
    { net: "tiktok", type: "views", quantity: 1000, displayOrder: 1 },
    // Kwai
    { net: "kwai", type: "followers", quantity: 10, displayOrder: 1 },
    { net: "kwai", type: "followers", quantity: 15, displayOrder: 2 },
    { net: "kwai", type: "followers", quantity: 20, displayOrder: 3 },
    { net: "kwai", type: "likes", quantity: 10, displayOrder: 1 },
    { net: "kwai", type: "likes", quantity: 15, displayOrder: 2 },
    { net: "kwai", type: "likes", quantity: 20, displayOrder: 3 },
    { net: "kwai", type: "views", quantity: 1000, displayOrder: 1 },
  ];

  for (const opt of trialOptions) {
    const netServiceId = dbServices[`${opt.net}_${opt.type}`].id;
    await prisma.freeTrialOption.upsert({
      where: { networkServiceId_quantity: { networkServiceId: netServiceId, quantity: opt.quantity } },
      update: {},
      create: {
        networkServiceId: netServiceId,
        quantity: opt.quantity,
        displayOrder: opt.displayOrder,
        active: true,
      },
    });
  }
  console.log("✅ Opções de teste gratuito semeadas.");

  // 7. Pacotes de Venda Pagos (PaidPackage)
  const packages = [
    // Instagram Curtidas
    {
      net: "instagram",
      type: "likes",
      quantity: 100,
      price: 6.99,
      title: "100 Curtidas",
      description: "Perfeito para testar agora e dar o primeiro impulso no post.",
      badge: "TESTE BARATO",
      badgeVariant: "default",
      bullets: ["100 curtidas brasileiras", "Sem precisar de senha", "Ideal para começar barato", "Perfil/post precisa estar público"],
      ctaLabel: "Comprar 100 agora",
      url: "https://megafama.net/curtidas-100",
      sortOrder: 1,
    },
    {
      net: "instagram",
      type: "likes",
      quantity: 500,
      price: 13.99,
      title: "500 Curtidas",
      description: "Boa opção para deixar seu post com mais movimento.",
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      bullets: ["500 curtidas brasileiras", "Sem precisar de senha", "Mais força no engajamento", "Compra simples e rápida"],
      ctaLabel: "Comprar 500 agora",
      url: "https://megafama.net/curtidas-500",
      sortOrder: 2,
    },
    {
      net: "instagram",
      type: "likes",
      quantity: 1000,
      price: 19.99,
      title: "1000 Curtidas",
      description: "A oferta mais vantajosa dessa página.",
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      extraNote: "Você leva o dobro de curtidas por muito menos.",
      bullets: ["1000 curtidas brasileiras", "Melhor oferta do momento", "Mais impacto por pouco valor", "Ideal para turbinar seu post hoje"],
      ctaLabel: "Quero 1000 curtidas agora",
      url: "https://megafama.net/curtidas-1000",
      sortOrder: 3,
    },
    // Instagram Seguidores
    {
      net: "instagram",
      type: "followers",
      quantity: 100,
      price: 8.99,
      title: "100 Seguidores",
      description: "Perfeito para começar a crescer agora.",
      badge: "TESTE BARATO",
      badgeVariant: "default",
      bullets: ["100 seguidores brasileiros", "Sem precisar de senha", "Ideal para começar barato", "Perfil precisa estar público"],
      ctaLabel: "Comprar 100 agora",
      url: "https://megafama.net/seguidores-100",
      sortOrder: 1,
    },
    {
      net: "instagram",
      type: "followers",
      quantity: 500,
      price: 19.99,
      title: "500 Seguidores",
      description: "Boa opção para dar credibilidade ao perfil.",
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      bullets: ["500 seguidores brasileiros", "Sem precisar de senha", "Mais autoridade no perfil", "Compra simples e rápida"],
      ctaLabel: "Comprar 500 agora",
      url: "https://megafama.net/seguidores-500",
      sortOrder: 2,
    },
    {
      net: "instagram",
      type: "followers",
      quantity: 1000,
      price: 29.99,
      title: "1000 Seguidores",
      description: "A oferta mais vantajosa dessa página.",
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      extraNote: "Muito mais seguidores por pouco valor a mais.",
      bullets: ["1000 seguidores brasileiros", "Melhor oferta do momento", "Mais impacto por pouco valor", "Ideal para crescer hoje"],
      ctaLabel: "Quero 1000 seguidores agora",
      url: "https://megafama.net/seguidores-1000",
      sortOrder: 3,
    },
    // Instagram Views
    {
      net: "instagram",
      type: "views",
      quantity: 100,
      price: 3.99,
      title: "100 Views",
      description: "Perfeito para testar e dar tração ao vídeo.",
      badge: "TESTE BARATO",
      badgeVariant: "default",
      bullets: ["100 views brasileiras", "Sem precisar de senha", "Ideal para começar barato", "Post/vídeo precisa estar público"],
      ctaLabel: "Comprar 100 agora",
      url: "https://megafama.net/views-100",
      sortOrder: 1,
    },
    {
      net: "instagram",
      type: "views",
      quantity: 500,
      price: 6.99,
      title: "500 Views",
      description: "Boa opção para engatar o alcance do vídeo.",
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      bullets: ["500 views brasileiras", "Sem precisar de senha", "Mais alcance orgânico", "Compra simples e rápida"],
      ctaLabel: "Comprar 500 agora",
      url: "https://megafama.net/views-500",
      sortOrder: 2,
    },
    {
      net: "instagram",
      type: "views",
      quantity: 1000,
      price: 9.99,
      title: "1000 Views",
      description: "A oferta mais vantajosa dessa página.",
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      extraNote: "Muito mais views por pouco valor a mais.",
      bullets: ["1000 views brasileiras", "Melhor oferta do momento", "Mais impacto por pouco valor", "Ideal para viralizar hoje"],
      ctaLabel: "Quero 1000 views agora",
      url: "https://megafama.net/views-1000",
      sortOrder: 3,
    },
  ];

  for (const pkg of packages) {
    const netServiceId = dbServices[`${pkg.net}_${pkg.type}`].id;
    await prisma.paidPackage.upsert({
      where: {
        id: `pkg-${pkg.net}-${pkg.type}-${pkg.quantity}`,
      },
      update: {},
      create: {
        id: `pkg-${pkg.net}-${pkg.type}-${pkg.quantity}`,
        networkServiceId: netServiceId,
        name: pkg.title,
        quantity: pkg.quantity,
        price: pkg.price,
        description: pkg.description,
        badge: pkg.badge,
        badgeVariant: pkg.badgeVariant,
        redirectUrl: pkg.url,
        active: true,
        displayOrder: pkg.sortOrder,
        campaignParameters: pkg.extraNote || null,
      },
    });
  }
  console.log("✅ Pacotes pagos semeados.");

  // 8. Administrador Inicial (AdminUser)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD;

  if (adminEmail && adminInitialPassword) {
    if (adminInitialPassword === "admin123") {
      console.warn("⚠️ AVISO: A senha inicial configurada é 'admin123'. Recomenda-se usar uma senha forte e aleatória em produção!");
    }
    const email = adminEmail.trim().toLowerCase();
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminInitialPassword, 12);
      await prisma.adminUser.create({
        data: {
          email,
          passwordHash,
          active: true,
        },
      });
      console.log(`✅ Administrador inicial criado com sucesso: ${email}`);
    } else {
      console.log("ℹ️ Administrador inicial já existe. Pulando criação.");
    }
  } else {
    console.warn("⚠️ AVISO: Variáveis ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD não foram configuradas. Nenhum administrador inicial foi criado.");
  }

  console.log("🌱 Seeding concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
