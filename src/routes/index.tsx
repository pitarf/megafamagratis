import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  NETWORKS,
  hasRedeemed,
  markRedeemed,
  type Benefit,
  type Network,
} from "@/lib/funnel-config";
import { submitFreeTestOrder } from "@/services/smm-server.server";
import {
  getAdminSettings,
  getFreeQuantities,
  getPaidPackages,
  recordRedirectLog,
} from "@/services/admin-server.server";

export const Route = createFileRoute("/")({
  component: FunnelPage,
});

type Step = "network" | "benefit" | "input" | "processing" | "success" | "offer" | "blocked";

interface Selection {
  network: Network;
  benefit?: Benefit;
}

// Helper para gerar UUID simples de idempotência/sessão
function generateUuid(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function FunnelPage() {
  const [step, setStep] = useState<Step>("network");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [smmOrderId, setSmmOrderId] = useState<string | null>(null);
  const [animationDone, setAnimationDone] = useState(false);

  // Estados Dinâmicos do Banco
  const [settings, setSettings] = useState<any>(null);
  const [quantities, setQuantities] = useState<any[]>([]);
  const [paidPackages, setPaidPackages] = useState<any[]>([]);
  const [selectedQty, setSelectedQty] = useState<number>(25);
  const [sessionId, setSessionId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [campaignSource, setCampaignSource] = useState("");

  // Carrega configurações e gera identificadores ao montar
  useEffect(() => {
    // 1. Gera ou recupera session ID e idempotency key
    let sId = sessionStorage.getItem("megafama_session_id");
    if (!sId) {
      sId = generateUuid();
      sessionStorage.setItem("megafama_session_id", sId);
    }
    setSessionId(sId);
    setIdempotencyKey(generateUuid());

    // 2. Recupera origem de campanha dos parâmetros de URL
    const params = new URLSearchParams(window.location.search);
    const src = params.get("utm_source") || params.get("ref") || "";
    setCampaignSource(src);

    // 3. Verifica bloqueio local
    if (hasRedeemed()) {
      setStep("blocked");
    }

    // 4. Carrega configurações dinâmicas de SEO, quantidades e ofertas
    getAdminSettings().then((res) => {
      setSettings(res);
      if (res.siteTitle) {
        document.title = res.siteTitle;
      }
      // Altera meta tags se existirem
      const descTag = document.querySelector('meta[name="description"]');
      if (descTag && res.siteDescription) {
        descTag.setAttribute("content", res.siteDescription);
      }
      // Favicon
      if (res.faviconUrl) {
        const favLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favLink) favLink.href = res.faviconUrl;
      }
    });

    getFreeQuantities().then(setQuantities);
    getPaidPackages().then(setPaidPackages);
  }, []);

  // Monitora a finalização do processo (pedido SMM + animação concluídos)
  useEffect(() => {
    if (step === "processing" && animationDone && smmOrderId) {
      if (selection) markRedeemed(handle);
      setStep("success");
    }
  }, [step, animationDone, smmOrderId, handle, selection]);

  // Grava log de visualização de pacotes ao entrar na etapa de ofertas
  useEffect(() => {
    if (step === "offer" && selection?.benefit) {
      const activePkgs = paidPackages.filter(
        (p) =>
          p.networkId === selection.network.id &&
          p.benefitId === selection.benefit!.id &&
          p.active
      );

      // Registra a visualização para cada pacote ativo listado
      activePkgs.forEach((pkg) => {
        recordRedirectLog({
          data: {
            type: "view",
            networkId: pkg.networkId,
            benefitId: pkg.benefitId,
            quantity: pkg.quantity,
            sessionId,
            campaignSource,
            relatedOrderId: smmOrderId || undefined,
          }
        }).catch(() => {});
      });
    }
  }, [step, selection, paidPackages, sessionId, campaignSource, smmOrderId]);

  // Filtra quantidades disponíveis baseadas na seleção de rede/benefício
  const activeQuantities = useMemo(() => {
    if (!selection?.benefit) return [];
    return quantities.filter(
      (q) =>
        q.networkId === selection.network.id &&
        q.benefitId === selection.benefit!.id &&
        q.active
    );
  }, [selection, quantities]);

  // Define quantidade selecionável inicial
  useEffect(() => {
    if (activeQuantities.length > 0) {
      setSelectedQty(activeQuantities[0].quantity);
    } else if (selection?.benefit) {
      // Fallback para valor do arquivo estático se nada estiver semeado no banco
      setSelectedQty(Number(selection.benefit.quantity) || 25);
    }
  }, [activeQuantities, selection]);

  function pickNetwork(network: Network) {
    if (hasRedeemed()) return setStep("blocked");
    setSelection({ network });
    setStep("benefit");
  }

  function pickBenefit(benefit: Benefit) {
    if (!selection) return;
    setSelection({ ...selection, benefit });
    setHandle("");
    setError("");
    setStep("input");
  }

  function submitHandle() {
    const value = handle.trim();
    if (!value) {
      setError(
        selection?.benefit?.inputType === "profile"
          ? "Digite o @ do seu perfil."
          : "Cole o link da publicação.",
      );
      return;
    }
    if (selection?.benefit?.inputType === "link" && !/^https?:\/\//i.test(value)) {
      setError("Cole um link válido começando com https://");
      return;
    }
    setError("");
    setAnimationDone(false);
    setSmmOrderId(null);
    setStep("processing");

    // Dispara a requisição de backend segura para o fornecedor SMM
    (async () => {
      try {
        const res = await submitFreeTestOrder({
          data: {
            networkId: selection!.network.id,
            benefitId: selection!.benefit!.id,
            inputType: selection!.benefit!.inputType,
            input: value,
            quantity: selectedQty,
            idempotencyKey,
            sessionId,
            campaignSource: campaignSource || undefined,
          }
        });

        if (!res.success) {
          setError(res.error || "Ocorreu um erro ao processar o seu teste grátis.");
          setStep("input");
          // Reseta a chave de idempotência para permitir nova tentativa
          setIdempotencyKey(generateUuid());
        } else {
          setSmmOrderId(res.orderId || "success");
        }
      } catch (err: any) {
        console.error("Erro ao chamar submitFreeTestOrder:", err);
        setError(
          err.message
            ? `Erro de comunicação: ${err.message}`
            : "Não foi possível conectar ao servidor. Tente novamente."
        );
        setStep("input");
        setIdempotencyKey(generateUuid());
      }
    })();
  }

  function onProcessingDone() {
    setAnimationDone(true);
  }

  const offerBenefit = selection?.benefit?.id ?? "likes";
  const totalSteps = 5;
  const stepIndex: Record<Step, number> = {
    network: 1,
    benefit: 2,
    input: 3,
    processing: 4,
    success: 5,
    offer: 5,
    blocked: 5,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-tr from-slate-50 via-white to-indigo-50/50">
      <TopBar />
      {step !== "blocked" && step !== "offer" && step !== "success" && (
        <ProgressBar current={stepIndex[step]} total={totalSteps} />
      )}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-start py-5 px-4 sm:max-w-xl sm:px-6 sm:py-8 sm:justify-center">
        {step === "network" && <NetworkStep onPick={pickNetwork} />}
        {step === "benefit" && selection && (
          <BenefitStep
            selection={selection}
            onPick={pickBenefit}
            onBack={() => setStep("network")}
          />
        )}
        {step === "input" && selection?.benefit && (
          <InputStep
            selection={selection as Required<Selection>}
            value={handle}
            onChange={setHandle}
            error={error}
            activeQuantities={activeQuantities}
            selectedQty={selectedQty}
            onSelectQty={setSelectedQty}
            onSubmit={submitHandle}
            onBack={() => setStep("benefit")}
          />
        )}
        {step === "processing" && <ProcessingStep onDone={onProcessingDone} />}
        {step === "success" && <SuccessStep onContinue={() => setStep("offer")} />}
        {step === "offer" && (
          <OfferStep
            networkId={selection?.network.id || "instagram"}
            benefit={offerBenefit}
            paidPackages={paidPackages}
            sessionId={sessionId}
            campaignSource={campaignSource}
            smmOrderId={smmOrderId}
          />
        )}
        {step === "blocked" && <BlockedStep onSeeOffers={() => setStep("offer")} />}
      </main>
      <Footer />
    </div>
  );
}

/* ============ CHROME ============ */

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-11 w-full max-w-md items-center justify-between px-4 sm:max-w-xl">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/logo.png" alt="Mega Fama" className="h-8 w-auto object-contain" />
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[9.5px] font-bold text-emerald-600">
          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          Conexão segura
        </span>
      </div>
    </header>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div className="bg-transparent">
      <div className="mx-auto w-full max-w-md px-4 pt-3.5 sm:max-w-xl">
        <div className="mb-1 flex items-center justify-between text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Etapa {current} de {total}</span>
          <span className="text-primary">{Math.round(pct)}% concluído</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white/50 backdrop-blur-sm py-3.5 text-center mt-auto">
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-xl">
        <p className="text-[9.5px] font-bold text-slate-400">
          © Mega Fama · Conexão Criptografada SSL
        </p>
      </div>
    </footer>
  );
}

/* ============ STEP 1: NETWORK ============ */

function NetworkStep({ onPick }: { onPick: (n: Network) => void }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col justify-center">
      <div className="text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50/50 px-2.5 py-0.5 text-[9.5px] font-bold text-emerald-600 shadow-sm animate-pulse">
          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          Teste gratuito disponível
        </div>
        <h1 className="text-[23px] sm:text-[28px] font-black leading-tight tracking-tight text-slate-800">
          Ganhe <span className="bg-gradient-to-r from-primary via-indigo-600 to-pink-500 bg-clip-text text-transparent">Engajamento Grátis</span>
        </h1>
        <p className="mt-1 text-[12.5px] font-medium text-slate-500 leading-snug">
          Escolha apenas um benefício gratuito abaixo para testar nossa qualidade.
        </p>
      </div>

      <div className="mt-3.5">
        <TrustBadges />
      </div>

      <div className="mt-5 mb-2.5 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Escolha a rede social
        </h2>
        <span className="text-[9px] font-bold text-primary bg-blue-50 px-1.5 py-0.5 rounded-full">3 disponíveis</span>
      </div>

      <div className="space-y-3">
        {NETWORKS.map((n) => (
          <NetworkCard key={n.id} network={n} onPick={() => onPick(n)} />
        ))}
      </div>
    </section>
  );
}

function TrustBadges() {
  const items = [
    { label: "Sem senha", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    { label: "Brasileiros", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { label: "Entrega rápida", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "Seguro", color: "bg-sky-50 text-sky-600 border-sky-100" },
    { label: "1 teste por usuário", color: "bg-rose-50 text-rose-600 border-rose-100" },
  ];
  return (
    <ul className="flex flex-wrap gap-2 justify-center sm:justify-start">
      {items.map((i) => (
        <li
          key={i.label}
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9.5px] font-bold ${i.color} shadow-sm`}
        >
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function NetworkCard({ network, onPick }: { network: Network; onPick: () => void }) {
  const meta: Record<Network["id"], { desc: string; label: string; btnLabel: string }> = {
    instagram: { desc: "Seguidores, curtidas e views", label: "Instagram", btnLabel: "Escolher Instagram" },
    tiktok: { desc: "Seguidores, curtidas e views", label: "TikTok", btnLabel: "Escolher TikTok" },
    kwai: { desc: "Seguidores, curtidas e views", label: "Kwai", btnLabel: "Escolher Kwai" },
  };
  const m = meta[network.id];

  return (
    <button
      onClick={onPick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md active:scale-[0.99] focus-visible:ring-focus"
    >
      <div className="relative grid h-11 w-11 shrink-0 place-items-center animate-float group-hover:scale-105 transition-transform duration-300">
        <NetworkGlyph id={network.id} />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] sm:text-[14.5px] font-extrabold text-slate-800 leading-tight">
          {m.label}
        </div>
        <div className="text-[11px] sm:text-[12px] font-medium text-slate-400 mt-1 leading-tight">
          {m.desc}
        </div>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 px-3.5 py-2.5 text-[10px] sm:text-[11px] font-black text-white shadow-sm transition group-hover:brightness-105 animate-dopamine">
        {m.btnLabel}
        <ChevronIcon className="h-3 w-3 shrink-0" />
      </span>
    </button>
  );
}

function NetworkGlyph({ id }: { id: Network["id"] }) {
  const v = "v=2";
  if (id === "instagram")
    return <img src={`/instagram-3d.png?${v}`} alt="Instagram 3D" className="h-10 w-10 object-contain" />;
  if (id === "tiktok")
    return <img src={`/tiktok-3d.png?${v}`} alt="TikTok 3D" className="h-10 w-10 object-contain" />;
  return <img src={`/kwai-3d.png?${v}`} alt="Kwai 3D" className="h-10 w-10 object-contain" />;
}

/* ============ STEP 2: BENEFIT ============ */

function BenefitStep({
  selection,
  onPick,
  onBack,
}: {
  selection: Selection;
  onPick: (b: Benefit) => void;
  onBack: () => void;
}) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <BackLink onClick={onBack} label="Trocar rede social" />
      <h1 className="mt-3 text-[23px] font-black leading-tight tracking-tight text-slate-800 sm:text-[27px]">
        Escolha seu benefício
      </h1>
      <p className="mt-1 text-[13px] font-medium text-slate-500 leading-normal">
        Selecione o teste grátis que deseja resgatar no{" "}
        <span className="font-bold text-primary">{selection.network.name}</span>.
      </p>

      <div className="mt-5 space-y-3">
        {selection.network.benefits.map((b) => (
          <BenefitCard key={b.id} benefit={b} onPick={() => onPick(b)} />
        ))}
      </div>
    </section>
  );
}

function BenefitCard({ benefit, onPick }: { benefit: Benefit; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className="group relative flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md active:scale-[0.99] focus-visible:ring-focus overflow-hidden"
    >
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary to-indigo-500" />
      
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-xl font-bold shadow-inner">
        {benefit.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-black tracking-tight text-slate-800 leading-snug">
          {benefit.label} Grátis
        </div>
        <div className="mt-1 text-[11.5px] font-bold text-emerald-600 leading-none">
          Teste gratuito · entrega instantânea
        </div>
      </div>
      
      <span className="inline-flex shrink-0 items-center justify-center h-8 w-8 rounded-full bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all duration-300">
        <ChevronIcon className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
      </span>
    </button>
  );
}

/* ============ STEP 3: INPUT & QUANTITY SELECTOR ============ */

function InputStep({
  selection,
  value,
  onChange,
  error,
  activeQuantities,
  selectedQty,
  onSelectQty,
  onSubmit,
  onBack,
}: {
  selection: { network: Network; benefit: Benefit };
  value: string;
  onChange: (v: string) => void;
  error: string;
  activeQuantities: any[];
  selectedQty: number;
  onSelectQty: (q: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const isProfile = selection.benefit.inputType === "profile";

  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <BackLink onClick={onBack} label="Trocar benefício" />

      {/* Resumo Dinâmico */}
      <div className="mt-3.5 mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
          Resumo do pedido
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="min-w-0 text-[14px] font-black text-slate-800 leading-tight">
            {selectedQty} {selection.benefit.label} no {selection.network.name}
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-100 shadow-sm">
            Grátis
          </span>
        </div>
      </div>

      {/* Seletor de Quantidade Configurada do Admin (se houver mais de uma) */}
      {activeQuantities.length > 1 && (
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selecione a quantidade de teste
          </label>
          <div className="flex gap-2">
            {activeQuantities.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQty(q.quantity)}
                className={`flex-1 rounded-2xl py-3 text-[13px] font-black border transition-all ${
                  selectedQty === q.quantity
                    ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {q.quantity}
              </button>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-[20px] font-black tracking-tight text-slate-800 leading-tight">
        {isProfile ? "Qual é o seu @" : "Qual é o link?"}
      </h1>
      <p className="mt-1 text-[13px] font-medium text-slate-500 leading-snug">
        {isProfile
          ? "Informe o seu nome de usuário (ex: @seuperfil). Não precisa de senha."
          : "Cole o link da publicação, reels ou vídeo que receberá a entrega."}
      </p>

      <div className="mt-5">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {isProfile ? "Usuário" : "Link da publicação"}
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isProfile ? "@seuperfil" : "https://..."}
          inputMode={isProfile ? "text" : "url"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-800 placeholder:text-slate-300 focus:ring-focus shadow-inner"
        />
        {error ? (
          <p className="mt-2 text-[12px] font-bold text-destructive flex items-center gap-1">
            ⚠️ {error}
          </p>
        ) : (
          <p className="mt-2 text-[11.5px] font-medium text-slate-400 flex items-center gap-1.5">
            🔒 {isProfile ? "O perfil precisa estar público." : "O post precisa estar público."}
          </p>
        )}
      </div>

      <button
        onClick={onSubmit}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-4 text-[14px] font-black text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition hover:brightness-105 active:scale-[0.99] animate-dopamine"
      >
        Resgatar Teste Grátis
        <ArrowIcon className="h-4.5 w-4.5 shrink-0" />
      </button>

      <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-bold text-slate-400">
        <span>✓ SSL Protegido</span>
        <span>·</span>
        <span>✓ Sem Senha</span>
        <span>·</span>
        <span>✓ Sem Cadastro</span>
      </div>
    </section>
  );
}

/* ============ STEP 4: PROCESSING ============ */

const PROCESSING_STAGES = [
  "Validando solicitação",
  "Verificando disponibilidade",
  "Preparando envio",
  "Enviando pedido",
  "Finalizando",
];

function ProcessingStep({ onDone }: { onDone: () => void }) {
  const [active, setActive] = useState(0);
  const STAGE_MS = 1200;

  useEffect(() => {
    const iv = setInterval(() => {
      setActive((a) => {
        if (a >= PROCESSING_STAGES.length - 1) {
          clearInterval(iv);
          setTimeout(onDone, 600);
          return a + 1;
        }
        return a + 1;
      });
    }, STAGE_MS);
    return () => clearInterval(iv);
  }, [onDone]);

  return (
    <section className="animate-in fade-in duration-300">
      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm border border-slate-100">
            <Spinner />
          </div>
          <h1 className="mt-3.5 text-[20px] font-black tracking-tight text-slate-800">
            Processando seu pedido
          </h1>
          <p className="mt-1 text-[13.5px] font-medium text-slate-500">
            Isso leva apenas alguns segundos.
          </p>
        </div>

        <ol className="space-y-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
          {PROCESSING_STAGES.map((label, i) => {
            const done = i < active;
            const current = i === active;
            const pending = i > active;
            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-300 ${
                  current ? "bg-slate-50/70" : ""
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : current
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {done ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : current ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  )}
                </span>
                <span
                  className={`text-[13.5px] font-bold ${
                    pending
                      ? "text-slate-400"
                      : current
                        ? "text-primary"
                        : "text-slate-700"
                  }`}
                >
                  {label}
                </span>
                {current && (
                  <span className="ml-auto text-[10.5px] font-bold text-primary animate-pulse uppercase tracking-wider">
                    Processando…
                  </span>
                )}
                {done && (
                  <span className="ml-auto text-[10.5px] font-bold text-emerald-600 uppercase tracking-wider">
                    Concluído
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ============ STEP 5: SUCCESS ============ */

function SuccessStep({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    const t = setTimeout(onContinue, 2000);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <section className="flex flex-col items-center py-8 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm animate-bounce">
        <CheckIcon className="h-7 w-7 text-emerald-500" strokeWidth={3} />
      </div>
      <h1 className="mt-5 text-[22px] font-black tracking-tight text-slate-800">
        Pedido enviado!
      </h1>
      <p className="mt-1 max-w-sm text-[13.5px] font-medium leading-relaxed text-slate-500">
        Seu teste gratuito foi iniciado com sucesso. Aguarde alguns minutos para a entrega.
      </p>
      <div className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-full origin-left animate-[shrink_2s_linear_forwards] bg-primary" />
      </div>
      <style>{`@keyframes shrink { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </section>
  );
}

/* ============ STEP 6: OFFER ============ */

function OfferStep({
  networkId,
  benefit,
  paidPackages,
  sessionId,
  campaignSource,
  smmOrderId,
}: {
  networkId: string;
  benefit: string;
  paidPackages: any[];
  sessionId: string;
  campaignSource: string;
  smmOrderId: string | null;
}) {
  // Filtra os pacotes dinâmicos ativos para esta rede e serviço
  const activePackages = useMemo(() => {
    return paidPackages.filter(
      (p) => p.networkId === networkId && p.benefitId === benefit && p.active
    );
  }, [networkId, benefit, paidPackages]);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="mb-5 text-center sm:text-left">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[9.5px] font-bold text-amber-600 shadow-sm animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Oferta exclusiva liberada
        </div>
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-slate-800 sm:text-[26px]">
          Cresça ainda mais rápido!
        </h1>
        <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500">
          Como agradecimento pelo seu teste, liberamos pacotes premium com descontos de até 70%.
        </p>
      </div>

      <div className="space-y-3.5">
        {activePackages.length === 0 ? (
          <div className="text-center py-5 font-bold text-slate-400">
            Nenhuma oferta disponível no momento.
          </div>
        ) : (
          activePackages.map((pkg, i) => (
            <OfferCard
              key={pkg.id}
              pkg={pkg}
              highlighted={pkg.badgeVariant === "hot"}
              index={i}
              sessionId={sessionId}
              campaignSource={campaignSource}
              smmOrderId={smmOrderId}
            />
          ))
        )}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-[11.5px] font-bold text-slate-600">
        <li className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Sem Senha / Seguro</li>
        <li className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Perfis Reais BR</li>
        <li className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Início imediato</li>
        <li className="flex items-center gap-1.5"><CheckIcon className="h-4 w-4 text-emerald-500" /> Suporte WhatsApp</li>
      </ul>
      <p className="mt-4 text-center text-[10.5px] font-semibold text-slate-400">
        🔒 Garantia de reembolso de 30 dias se não receber.
      </p>
    </section>
  );
}

function OfferCard({
  pkg,
  highlighted,
  index,
  sessionId,
  campaignSource,
  smmOrderId,
}: {
  pkg: any;
  highlighted: boolean;
  index: number;
  sessionId: string;
  campaignSource: string;
  smmOrderId: string | null;
}) {
  const badgeLabel =
    pkg.badgeVariant === "hot"
      ? "🔥 Melhor custo-benefício"
      : pkg.badgeVariant === "best"
        ? "⭐ Mais vendido"
        : index === 0
          ? "💡 Mais barato"
          : "Recomendado";

  // Parse dos bullets em JSON
  const bullets: string[] = useMemo(() => {
    try {
      return JSON.parse(pkg.bullets);
    } catch {
      return [];
    }
  }, [pkg.bullets]);

  async function handleCtaClick() {
    try {
      // Registra o clique de redirecionamento no servidor de forma assíncrona
      await recordRedirectLog({
        data: {
          type: "click",
          networkId: pkg.networkId,
          benefitId: pkg.benefitId,
          quantity: pkg.quantity,
          sessionId,
          campaignSource: campaignSource || undefined,
          relatedOrderId: smmOrderId || undefined,
        },
      });
    } catch (err) {
      console.error("Erro ao registrar click log:", err);
    }
  }

  return (
    <div
      className={`relative rounded-2xl border p-4.5 transition-all duration-300 ${
        highlighted
          ? "border-primary bg-gradient-to-b from-white to-blue-50/10 shadow-md ring-1 ring-primary/5"
          : "border-slate-100 bg-white shadow-sm hover:border-slate-200"
      }`}
    >
      {(highlighted || pkg.badge) && (
        <div className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-white shadow-sm">
          {pkg.badge || badgeLabel}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!highlighted && !pkg.badge && (
            <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {badgeLabel}
            </div>
          )}
          <div className={`font-black tracking-tight text-slate-800 ${highlighted ? "text-[17.5px]" : "text-[16px]"}`}>
            {pkg.title}
          </div>
          <p className="mt-1 text-[11.5px] font-medium text-slate-500 leading-snug">{pkg.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-black tracking-tight text-primary ${highlighted ? "text-[21px]" : "text-[18px]"}`}>
            R$ {pkg.price.toFixed(2)}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            pagamento único
          </div>
        </div>
      </div>

      {highlighted && pkg.extraNote && (
        <div className="mt-2.5 rounded-xl border border-blue-100/30 bg-blue-50/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary leading-normal">
          💡 <span className="font-bold">Nota:</span> {pkg.extraNote}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className="mt-2.5 space-y-0.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-1 text-[11.5px] font-bold text-slate-600">
              <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <a
        href={pkg.url}
        onClick={handleCtaClick}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-4 flex w-full items-center justify-center gap-1 rounded-xl py-3.5 text-[13px] font-black transition active:scale-[0.99] shadow-sm ${
          highlighted
            ? "animate-dopamine bg-gradient-to-r from-primary to-indigo-600 text-white shadow-sm hover:brightness-105"
            : "animate-dopamine border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {pkg.ctaLabel}
        <ArrowIcon className="h-4 w-4 shrink-0" />
      </a>
    </div>
  );
}

/* ============ BLOCKED ============ */

function BlockedStep({ onSeeOffers }: { onSeeOffers: () => void }) {
  return (
    <section className="flex flex-col items-center py-8 text-center animate-in fade-in duration-300">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-400">
        <LockIcon className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-[19px] font-black tracking-tight text-slate-800">
        Teste grátis já resgatado!
      </h1>
      <p className="mt-1.5 max-w-xs text-[12.5px] font-medium leading-relaxed text-slate-500">
        Você já aproveitou o teste gratuito neste perfil, mas ainda pode impulsionar suas redes com descontos exclusivos.
      </p>
      <button
        onClick={onSeeOffers}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-5 py-3 text-[13px] font-black text-white shadow-[0_4px_12px_rgba(9,129,250,0.25)] transition hover:brightness-105"
      >
        Ver ofertas exclusivas
        <ArrowIcon className="h-4 w-4 shrink-0" />
      </button>
    </section>
  );
}

/* ============ SHARED ============ */

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
      {label}
    </button>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className = "", strokeWidth = 3 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className}>
      <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin text-primary" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
