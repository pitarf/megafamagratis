// Funnel configuration - easy to edit
// Add new networks/services here in the future.

export type NetworkId = "instagram" | "tiktok" | "kwai";
export type BenefitType = "followers" | "likes" | "views";

export interface Benefit {
  id: BenefitType;
  label: string;
  quantity: string;
  inputType: "profile" | "link";
  icon: string;
}

export interface Network {
  id: NetworkId;
  name: string;
  gradient: string; // utility class
  benefits: Benefit[];
}

export const NETWORKS: Network[] = [
  {
    id: "instagram",
    name: "Instagram",
    gradient: "gradient-instagram",
    benefits: [
      { id: "followers", label: "Seguidores", quantity: "25", inputType: "profile", icon: "👥" },
      { id: "likes", label: "Curtidas", quantity: "25", inputType: "link", icon: "❤️" },
      { id: "views", label: "Views", quantity: "1000", inputType: "link", icon: "👁️" },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    gradient: "gradient-tiktok",
    benefits: [
      { id: "followers", label: "Seguidores", quantity: "25", inputType: "profile", icon: "👥" },
      { id: "likes", label: "Curtidas", quantity: "25", inputType: "link", icon: "❤️" },
      { id: "views", label: "Views", quantity: "1000", inputType: "link", icon: "👁️" },
    ],
  },
  {
    id: "kwai",
    name: "Kwai",
    gradient: "gradient-kwai",
    benefits: [
      { id: "followers", label: "Seguidores", quantity: "25", inputType: "profile", icon: "👥" },
      { id: "likes", label: "Curtidas", quantity: "25", inputType: "link", icon: "❤️" },
      { id: "views", label: "Views", quantity: "1000", inputType: "link", icon: "👁️" },
    ],
  },
];

export interface OfferPackage {
  badge: string;
  badgeVariant: "default" | "hot" | "best";
  title: string;
  description: string;
  price: string;
  extraNote?: string;
  bullets: string[];
  ctaLabel: string;
  url: string; // easy to edit redirect URL per package
}

// Edit these URLs to point to specific Mega Fama packages
const MEGA_FAMA = "https://megafama.net";

export const OFFERS: Record<BenefitType, OfferPackage[]> = {
  likes: [
    {
      badge: "TESTE BARATO",
      badgeVariant: "default",
      title: "100 Curtidas",
      description: "Perfeito para testar agora e dar o primeiro impulso no post.",
      price: "R$6,99",
      bullets: [
        "100 curtidas brasileiras",
        "Sem precisar de senha",
        "Ideal para começar barato",
        "Perfil/post precisa estar público",
      ],
      ctaLabel: "Comprar 100 agora",
      url: `${MEGA_FAMA}/curtidas-100`,
    },
    {
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      title: "500 Curtidas",
      description: "Boa opção para deixar seu post com mais movimento.",
      price: "R$13,99",
      bullets: [
        "500 curtidas brasileiras",
        "Sem precisar de senha",
        "Mais força no engajamento",
        "Compra simples e rápida",
      ],
      ctaLabel: "Comprar 500 agora",
      url: `${MEGA_FAMA}/curtidas-500`,
    },
    {
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      title: "1000 Curtidas",
      description: "A oferta mais vantajosa dessa página.",
      price: "R$19,99",
      extraNote: "Você leva o dobro de curtidas por muito menos.",
      bullets: [
        "1000 curtidas brasileiras",
        "Melhor oferta do momento",
        "Mais impacto por pouco valor",
        "Ideal para turbinar seu post hoje",
      ],
      ctaLabel: "Quero 1000 curtidas agora",
      url: `${MEGA_FAMA}/curtidas-1000`,
    },
  ],
  followers: [
    {
      badge: "TESTE BARATO",
      badgeVariant: "default",
      title: "100 Seguidores",
      description: "Perfeito para começar a crescer agora.",
      price: "R$8,99",
      bullets: [
        "100 seguidores brasileiros",
        "Sem precisar de senha",
        "Ideal para começar barato",
        "Perfil precisa estar público",
      ],
      ctaLabel: "Comprar 100 agora",
      url: `${MEGA_FAMA}/seguidores-100`,
    },
    {
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      title: "500 Seguidores",
      description: "Boa opção para dar credibilidade ao perfil.",
      price: "R$19,99",
      bullets: [
        "500 seguidores brasileiros",
        "Sem precisar de senha",
        "Mais autoridade no perfil",
        "Compra simples e rápida",
      ],
      ctaLabel: "Comprar 500 agora",
      url: `${MEGA_FAMA}/seguidores-500`,
    },
    {
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      title: "1000 Seguidores",
      description: "A oferta mais vantajosa dessa página.",
      price: "R$29,99",
      extraNote: "Muito mais seguidores por pouco valor a mais.",
      bullets: [
        "1000 seguidores brasileiros",
        "Melhor oferta do momento",
        "Mais impacto por pouco valor",
        "Ideal para crescer hoje",
      ],
      ctaLabel: "Quero 1000 seguidores agora",
      url: `${MEGA_FAMA}/seguidores-1000`,
    },
  ],
  views: [
    {
      badge: "TESTE BARATO",
      badgeVariant: "default",
      title: "100 Views",
      description: "Perfeito para testar e dar tração ao vídeo.",
      price: "R$3,99",
      bullets: [
        "100 views brasileiras",
        "Sem precisar de senha",
        "Ideal para começar barato",
        "Post/vídeo precisa estar público",
      ],
      ctaLabel: "Comprar 100 agora",
      url: `${MEGA_FAMA}/views-100`,
    },
    {
      badge: "BOA ESCOLHA",
      badgeVariant: "default",
      title: "500 Views",
      description: "Boa opção para engatar o alcance do vídeo.",
      price: "R$6,99",
      bullets: [
        "500 views brasileiras",
        "Sem precisar de senha",
        "Mais alcance orgânico",
        "Compra simples e rápida",
      ],
      ctaLabel: "Comprar 500 agora",
      url: `${MEGA_FAMA}/views-500`,
    },
    {
      badge: "🔥 MELHOR OFERTA",
      badgeVariant: "hot",
      title: "1000 Views",
      description: "A oferta mais vantajosa dessa página.",
      price: "R$9,99",
      extraNote: "Muito mais views por pouco valor a mais.",
      bullets: [
        "1000 views brasileiras",
        "Melhor oferta do momento",
        "Mais impacto por pouco valor",
        "Ideal para viralizar hoje",
      ],
      ctaLabel: "Quero 1000 views agora",
      url: `${MEGA_FAMA}/views-1000`,
    },
  ],
};

export const REDEEM_KEY = "megafama_free_test_used_v1";

export function markRedeemed(handle: string) {
  try {
    const data = {
      at: new Date().toISOString(),
      handle: handle.trim().toLowerCase(),
    };
    localStorage.setItem(REDEEM_KEY, JSON.stringify(data));
  } catch {}
}

export function hasRedeemed(): boolean {
  try {
    return !!localStorage.getItem(REDEEM_KEY);
  } catch {
    return false;
  }
}
