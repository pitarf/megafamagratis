import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  checkAdminAuth,
  loginAdmin,
  logoutAdmin,
  getAdminSettings,
  saveAdminSettings,
  getAdminOrders,
  getSMMBalanceRealTime,
  retrySMMOrder,
  getFreeQuantities,
  saveFreeQuantity,
  deleteFreeQuantity,
  getPaidPackages,
  savePaidPackage,
  deletePaidPackage,
  recordRedirectLog,
  unlockTarget,
  getUnlimitedTargets,
  removeUnlimitedTarget,
  type SettingsData,
  type OrderRecord,
} from "@/services/admin-server.server";
import {
  Settings,
  Layers,
  Activity,
  LogOut,
  RefreshCw,
  Search,
  Lock,
  CheckCircle,
  AlertTriangle,
  Globe,
  Coins,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Tag,
  Eye,
  Check,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/administracao")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Painel Admin — Mega Fama" },
    ],
  }),
  component: AdministrationPage,
});

type Tab = "dashboard" | "quantities" | "packages" | "smm" | "seo";

function AdministrationPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Carregar dados de autenticação ao montar
  useEffect(() => {
    checkAdminAuth()
      .then((res) => setAuthenticated(res.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setSubmitting(true);
    try {
      const res = await loginAdmin({ data: { password } });
      if (res.success) {
        setAuthenticated(true);
        toast.success("Login realizado com sucesso!");
      } else {
        toast.error(res.error || "Senha inválida.");
      }
    } catch {
      toast.error("Erro de rede ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-50 via-white to-indigo-50/50 p-4">
        <Toaster position="top-right" richColors />
        <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-600" />
          <div className="flex flex-col items-center text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-primary shadow-inner">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-800">Acesso Restrito</h1>
            <p className="mt-1 text-[12.5px] font-medium text-slate-400">
              Digite a senha mestra para acessar a administração do funil.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold text-slate-800 focus:ring-focus shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 py-3.5 text-[13px] font-black text-white shadow-md transition hover:brightness-105 active:scale-[0.99]"
            >
              {submitting ? "Autenticando..." : "Entrar no Painel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => setAuthenticated(false)} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Listas CRUD
  const [quantities, setQuantities] = useState<any[]>([]);
  const [paidPackages, setPaidPackages] = useState<any[]>([]);

  const [balance, setBalance] = useState<{ value: number; currency: string } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  // Estados dos Formulários
  const [qtyForm, setQtyForm] = useState({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", smmServiceId: "", unitCost: "0", active: true });
  const [pkgForm, setPkgForm] = useState({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", price: "", title: "", description: "", badge: "", badgeVariant: "default", extraNote: "", bullets: "", ctaLabel: "Comprar agora", url: "", sortOrder: "0", active: true });
  const [unlockForm, setUnlockForm] = useState({ networkId: "instagram", input: "" });
  const [unlocking, setUnlocking] = useState(false);

  const [unlimitedTargets, setUnlimitedTargets] = useState<any[]>([]);

  // Carrega configurações, pedidos e listas
  useEffect(() => {
    loadData();
    updateBalance();
  }, []);

  function loadData() {
    getAdminSettings().then(setSettings);
    getAdminOrders().then(setOrders);
    getFreeQuantities().then(setQuantities);
    getPaidPackages().then(setPaidPackages);
    getUnlimitedTargets().then(setUnlimitedTargets);
  }

  function updateBalance() {
    setLoadingBalance(true);
    getSMMBalanceRealTime()
      .then((res) => {
        if (res.success && res.balance !== undefined) {
          setBalance({ value: res.balance, currency: res.currency || "BRL" });
        } else {
          setBalance(null);
        }
      })
      .catch(() => setBalance(null))
      .finally(() => setLoadingBalance(false));
  }

  async function handleLogout() {
    try {
      await logoutAdmin();
      onLogout();
    } catch {
      toast.error("Erro ao sair.");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await saveAdminSettings({ data: settings });
      toast.success("Configurações salvas com sucesso!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao gravar configurações.");
    } finally {
      setSaving(false);
    }
  }

  // Ações CRUD Quantidades
  async function handleSaveQuantity(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(qtyForm.quantity);
    if (!qty || qty <= 0) {
      toast.error("Insira uma quantidade válida.");
      return;
    }

    try {
      await saveFreeQuantity({
        data: {
          id: qtyForm.id || undefined,
          networkId: qtyForm.networkId,
          benefitId: qtyForm.benefitId,
          quantity: qty,
          smmServiceId: qtyForm.smmServiceId,
          unitCost: Number(qtyForm.unitCost),
          active: qtyForm.active,
        },
      });
      toast.success("Quantidade salva com sucesso!");
      setQtyForm({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", smmServiceId: "", unitCost: "0", active: true });
      getFreeQuantities().then(setQuantities);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar quantidade.");
    }
  }

  async function handleDeleteQuantity(id: string) {
    if (!confirm("Tem certeza que deseja remover esta quantidade?")) return;
    try {
      await deleteFreeQuantity({ data: { id } });
      toast.success("Quantidade removida.");
      getFreeQuantities().then(setQuantities);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover.");
    }
  }

  async function handleUnlockTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockForm.input.trim()) return;
    setUnlocking(true);
    try {
      const res = await unlockTarget({ data: { networkId: unlockForm.networkId, input: unlockForm.input } });
      if (res.success) {
        toast.success("Alvo desbloqueado! Agora ele pode ser usado infinitas vezes.");
        setUnlockForm({ ...unlockForm, input: "" });
        getUnlimitedTargets().then(setUnlimitedTargets);
      } else {
        toast.error(res.error || "Erro ao desbloquear o alvo.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de rede.");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleRemoveUnlimitedTarget(id: string) {
    if (!confirm("Tem certeza que deseja revogar o acesso ilimitado para esta conta?")) return;
    try {
      const res = await removeUnlimitedTarget({ data: { id } });
      if (res.success) {
        toast.success("Acesso ilimitado revogado. A conta voltou à regra normal.");
        getUnlimitedTargets().then(setUnlimitedTargets);
      } else {
        toast.error(res.error || "Erro ao remover.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro de rede.");
    }
  }

  // Ações CRUD Pacotes
  async function handleSavePackage(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(pkgForm.quantity);
    const price = Number(pkgForm.price);
    if (!qty || qty <= 0 || !price || price <= 0) {
      toast.error("Quantidade e preço devem ser válidos.");
      return;
    }

    // Processa os bullets separados por linha
    const bulletsArr = pkgForm.bullets
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    try {
      await savePaidPackage({
        data: {
          id: pkgForm.id || undefined,
          networkId: pkgForm.networkId,
          benefitId: pkgForm.benefitId,
          quantity: qty,
          price,
          title: pkgForm.title,
          description: pkgForm.description,
          badge: pkgForm.badge || null,
          badgeVariant: pkgForm.badgeVariant,
          extraNote: pkgForm.extraNote || null,
          bullets: bulletsArr,
          ctaLabel: pkgForm.ctaLabel,
          url: pkgForm.url,
          sortOrder: Number(pkgForm.sortOrder) || 0,
          active: pkgForm.active,
        },
      });
      toast.success("Pacote de oferta salvo!");
      setPkgForm({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", price: "", title: "", description: "", badge: "", badgeVariant: "default", extraNote: "", bullets: "", ctaLabel: "Comprar agora", url: "", sortOrder: "0", active: true });
      getPaidPackages().then(setPaidPackages);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar pacote.");
    }
  }

  async function handleDeletePackage(id: string) {
    if (!confirm("Remover este pacote permanentemente?")) return;
    try {
      await deletePaidPackage({ data: { id } });
      toast.success("Pacote removido.");
      getPaidPackages().then(setPaidPackages);
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar.");
    }
  }

  // Reenviar Pedido
  async function handleRetry(orderId: string) {
    const tId = toast.loading("Reenviando pedido ao Duke Fornecedor...");
    try {
      const res = await retrySMMOrder({ data: { orderId } });
      if (res.success) {
        toast.success(`Pedido reenviado! ID no fornecedor: ${res.smmOrderId}`, { id: tId });
        getAdminOrders().then(setOrders);
      } else {
        toast.error(`Falha no reenvio SMM: ${res.error}`, { id: tId });
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.", { id: tId });
    }
  }

  // Testar conexão SMM
  async function handleTestSMMConnection() {
    const tId = toast.loading("Testando credenciais com Duke SMM...");
    getSMMBalanceRealTime()
      .then((res) => {
        if (res.success) {
          toast.success(`Conexão bem-sucedida! Saldo: R$ ${res.balance?.toFixed(2)} (${res.currency})`, { id: tId });
        } else {
          toast.error(`Falha na resposta do fornecedor: ${res.error}`, { id: tId });
        }
      })
      .catch((err) => {
        toast.error(`Erro ao conectar: ${err.message || err}`, { id: tId });
      });
  }

  // Filtragem e Busca de Pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.input.toLowerCase().includes(search.toLowerCase()) ||
        o.networkId.toLowerCase().includes(search.toLowerCase()) ||
        o.benefitId.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && o.status === "completed") ||
        (statusFilter === "failed" && o.status === "failed") ||
        (statusFilter === "processing" && o.status === "processing") ||
        (statusFilter === "pending" && o.status === "pending");

      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = orders.length;
    const completedOrders = orders.filter((o) => o.status === "completed");
    const completed = completedOrders.length;
    const errors = orders.filter((o) => o.status === "failed").length;

    let totalCost = 0;
    const costByService: Record<string, number> = {};
    completedOrders.forEach((o) => {
      const key = `${o.networkId}_${o.benefitId}`;
      costByService[key] = (costByService[key] || 0) + (o.cost || 0);
      totalCost += (o.cost || 0);
    });

    return { total, completed, errors, totalCost, costByService };
  }, [orders]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 text-slate-700">
      <Toaster position="top-right" richColors />

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mega Fama Admin" className="h-8 w-auto object-contain" />
            <div>
              <span className="ml-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                Funil Ativo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
        
        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex gap-1.5 border-b border-slate-200 pb-px overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-bold transition ${
              activeTab === "dashboard"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Activity className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("quantities")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-bold transition ${
              activeTab === "quantities"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Layers className="h-4 w-4" />
            Quantidades Grátis
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-bold transition ${
              activeTab === "packages"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Tag className="h-4 w-4" />
            Ofertas Pagas
          </button>
          <button
            onClick={() => setActiveTab("smm")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-bold transition ${
              activeTab === "smm"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Settings className="h-4 w-4" />
            API & Serviços
          </button>
          <button
            onClick={() => setActiveTab("seo")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-bold transition ${
              activeTab === "seo"
                ? "border-primary text-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Globe className="h-4 w-4" />
            SEO & Suporte
          </button>
        </div>

        {/* ============ TAB: DASHBOARD ============ */}
        {activeTab === "dashboard" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* CARDS DE STATS */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total de Testes
                </div>
                <div className="mt-1 text-2xl font-black text-slate-800">{stats.total}</div>
                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">solicitações de usuários</div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Entregas Sucedidas
                </div>
                <div className="mt-1 text-2xl font-black text-emerald-600">{stats.completed}</div>
                <div className="text-[10px] font-bold text-emerald-500/80 mt-0.5">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% de taxa
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  Erros SMM
                </div>
                <div className="mt-1 text-2xl font-black text-rose-600">{stats.errors}</div>
                <div className="text-[10px] font-bold text-rose-500/85 mt-0.5">
                  pedidos que falharam no envio
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    <span>Saldo Duke</span>
                    <button onClick={updateBalance} disabled={loadingBalance} className="text-slate-400 hover:text-indigo-600">
                      <RefreshCw className={`h-3 w-3 ${loadingBalance ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <div className="mt-1 text-2xl font-black text-indigo-600">
                    {balance ? `R$ ${balance.value.toFixed(2)}` : "---"}
                  </div>
                </div>
                <div className="text-[9.5px] font-bold text-indigo-500/80 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" />
                  Conexão Ativa
                </div>
              </div>
            </div>

            {/* CUSTOS DE TESTES GRÁTIS */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 mb-3">Custos de Testes Grátis</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400">Total Geral Gasto</div>
                  <div className="text-lg font-black text-slate-700 mt-1">R$ {stats.totalCost.toFixed(2)}</div>
                </div>
                {Object.entries(stats.costByService).filter(([_, cost]) => cost > 0).map(([key, cost]) => {
                  const [net, ben] = key.split("_");
                  const netName = net.charAt(0).toUpperCase() + net.slice(1);
                  const benName = ben === "followers" ? "Seguidores" : ben === "likes" ? "Curtidas" : "Views";
                  return (
                    <div key={key} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400">{netName} {benName}</div>
                      <div className="text-lg font-black text-slate-700 mt-1">R$ {cost.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABELA DE PEDIDOS */}
            <div className="rounded-2xl border border-slate-200/65 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por link ou @usuario..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-[12.5px] font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-focus shadow-inner"
                  />
                </div>

                <div className="flex gap-2 shrink-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold text-slate-600 focus:ring-focus"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="completed">Concluídos</option>
                    <option value="failed">Erros</option>
                    <option value="processing">Em Processo</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Rede/Serviço</th>
                      <th className="px-4 py-3">Destinatário</th>
                      <th className="px-4 py-3">Status SMM</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center font-bold text-slate-400">
                          Nenhum pedido de teste localizado.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3.5 text-slate-400 font-normal">
                            {new Date(o.at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3.5 capitalize font-black text-slate-800">
                            {o.networkId} ({o.quantity} {o.benefitId === "followers" ? "Seg." : o.benefitId === "likes" ? "Curt." : "Views"})
                          </td>
                          <td className="max-w-xs truncate px-4 py-3.5 text-slate-500 font-bold" title={o.input}>
                            {o.input}
                          </td>
                          <td className="px-4 py-3.5">
                            {o.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 border border-emerald-100">
                                <CheckCircle className="h-3 w-3" />
                                #{o.smmOrderId || "Enviado"}
                              </span>
                            ) : o.status === "failed" ? (
                              <div className="flex flex-col">
                                <span className="inline-flex self-start items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-600 border border-rose-100">
                                  <AlertTriangle className="h-3 w-3" />
                                  Falha
                                </span>
                                {o.error && (
                                  <span className="text-[10px] text-rose-500 font-semibold mt-0.5 leading-snug">
                                    {o.error}
                                  </span>
                                )}
                              </div>
                            ) : o.status === "processing" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-600 border border-blue-100">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Enviando...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 border border-amber-100">
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {o.status === "failed" && (
                              <button
                                onClick={() => handleRetry(o.id)}
                                className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 font-black text-indigo-650 hover:bg-indigo-100 hover:text-indigo-700 transition active:scale-95"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Reenviar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: QUANTITIES ============ */}
        {activeTab === "quantities" && (
          <div className="grid gap-5 sm:grid-cols-3 animate-in fade-in duration-300">
            {/* FORMULÁRIO DE CADASTRO */}
            <div className="sm:col-span-1 rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                {qtyForm.id ? "Editar Opção" : "Nova Quantidade Grátis"}
              </h2>
              <form onSubmit={handleSaveQuantity} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rede Social</label>
                  <select
                    value={qtyForm.networkId}
                    onChange={(e) => setQtyForm({ ...qtyForm, networkId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="kwai">Kwai</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serviço</label>
                  <select
                    value={qtyForm.benefitId}
                    onChange={(e) => setQtyForm({ ...qtyForm, benefitId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  >
                    <option value="followers">Seguidores</option>
                    <option value="likes">Curtidas</option>
                    <option value="views">Views</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade</label>
                  <input
                    type="number"
                    required
                    value={qtyForm.quantity}
                    onChange={(e) => setQtyForm({ ...qtyForm, quantity: e.target.value })}
                    placeholder="Ex: 25"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SMM Service ID (Fornecedor)</label>
                  <input
                    type="text"
                    required
                    value={qtyForm.smmServiceId}
                    onChange={(e) => setQtyForm({ ...qtyForm, smmServiceId: e.target.value })}
                    placeholder="Ex: 382"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custo SMM por 1000 (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={qtyForm.unitCost}
                    onChange={(e) => setQtyForm({ ...qtyForm, unitCost: e.target.value })}
                    placeholder="Ex: 1.50"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="qtyActive"
                    checked={qtyForm.active}
                    onChange={(e) => setQtyForm({ ...qtyForm, active: e.target.checked })}
                    className="rounded text-primary focus:ring-focus"
                  />
                  <label htmlFor="qtyActive" className="text-[12px] font-bold text-slate-500">Opção de teste ativa</label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-primary py-2.5 text-[12px] font-black text-white hover:brightness-105 active:scale-95 shadow-sm"
                  >
                    {qtyForm.id ? "Atualizar" : "Criar Opção"}
                  </button>
                  {qtyForm.id && (
                    <button
                      type="button"
                      onClick={() => setQtyForm({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", smmServiceId: "", unitCost: "0", active: true })}
                      className="rounded-xl border border-slate-200 px-3 text-[12px] font-bold text-slate-550 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* TABELA DE QUANTIDADES EXISTENTES */}
            <div className="sm:col-span-2 rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                Quantidades Cadastradas
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-3 py-2">Rede</th>
                      <th className="px-3 py-2">Serviço</th>
                      <th className="px-3 py-2">Quantidade</th>
                      <th className="px-3 py-2">Service ID</th>
                      <th className="px-3 py-2">Custo (1000)</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {quantities.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/20">
                        <td className="px-3 py-3.5 capitalize font-black text-slate-800">{q.networkId}</td>
                        <td className="px-3 py-3.5 capitalize">{q.benefitId === "followers" ? "Seguidores" : q.benefitId === "likes" ? "Curtidas" : "Views"}</td>
                        <td className="px-3 py-3.5 font-bold text-primary">{q.quantity}</td>
                        <td className="px-3 py-3.5 font-mono text-[11px]">{q.smmServiceId}</td>
                        <td className="px-3 py-3.5 font-mono text-[11px] text-slate-500">R$ {Number(q.unitCost || 0).toFixed(2)}</td>
                        <td className="px-3 py-3.5">
                          {q.active ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600 font-bold border border-emerald-100">Ativa</span>
                          ) : (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-bold">Inativa</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right flex gap-1.5 justify-end">
                          <button
                            onClick={() => setQtyForm({ id: q.id, networkId: q.networkId, benefitId: q.benefitId, quantity: q.quantity.toString(), smmServiceId: q.smmServiceId, unitCost: String(q.unitCost || 0), active: q.active })}
                            className="p-1.5 text-slate-400 hover:text-primary transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuantity(q.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: PACKAGES ============ */}
        {activeTab === "packages" && (
          <div className="grid gap-5 sm:grid-cols-3 animate-in fade-in duration-300">
            {/* FORMULÁRIO DE OFERTA */}
            <div className="sm:col-span-1 rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                {pkgForm.id ? "Editar Pacote" : "Novo Pacote Pago"}
              </h2>
              <form onSubmit={handleSavePackage} className="space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rede</label>
                    <select
                      value={pkgForm.networkId}
                      onChange={(e) => setPkgForm({ ...pkgForm, networkId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="kwai">Kwai</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serviço</label>
                    <select
                      value={pkgForm.benefitId}
                      onChange={(e) => setPkgForm({ ...pkgForm, benefitId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    >
                      <option value="followers">Seguidores</option>
                      <option value="likes">Curtidas</option>
                      <option value="views">Views</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade</label>
                    <input
                      type="number"
                      required
                      value={pkgForm.quantity}
                      onChange={(e) => setPkgForm({ ...pkgForm, quantity: e.target.value })}
                      placeholder="Ex: 500"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pkgForm.price}
                      onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                      placeholder="Ex: 19.90"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título do Pacote</label>
                  <input
                    type="text"
                    required
                    value={pkgForm.title}
                    onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })}
                    placeholder="Ex: 500 Curtidas Reais"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Descrição Curta</label>
                  <input
                    type="text"
                    required
                    value={pkgForm.description}
                    onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                    placeholder="Descrição rápida do card"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Texto Destaque (Badge)</label>
                    <input
                      type="text"
                      value={pkgForm.badge}
                      onChange={(e) => setPkgForm({ ...pkgForm, badge: e.target.value })}
                      placeholder="Ex: MAIS VENDIDO"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge Estilo</label>
                    <select
                      value={pkgForm.badgeVariant}
                      onChange={(e) => setPkgForm({ ...pkgForm, badgeVariant: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    >
                      <option value="default">Cinza (Default)</option>
                      <option value="hot">Laranja/Fogo (Hot)</option>
                      <option value="best">Estrela/Amarelo (Best)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Itens / Benefícios (Um por linha)</label>
                  <textarea
                    rows={3}
                    value={pkgForm.bullets}
                    onChange={(e) => setPkgForm({ ...pkgForm, bullets: e.target.value })}
                    placeholder="Seguidores Brasileiros&#10;Início Imediato&#10;Garantia de 30 dias"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link de Redirecionamento (Checkout)</label>
                  <input
                    type="url"
                    required
                    value={pkgForm.url}
                    onChange={(e) => setPkgForm({ ...pkgForm, url: e.target.value })}
                    placeholder="https://megafama.net/checkout/..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                  />
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ordem</label>
                    <input
                      type="number"
                      value={pkgForm.sortOrder}
                      onChange={(e) => setPkgForm({ ...pkgForm, sortOrder: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-bold focus:ring-focus"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      id="pkgActive"
                      checked={pkgForm.active}
                      onChange={(e) => setPkgForm({ ...pkgForm, active: e.target.checked })}
                      className="rounded text-primary focus:ring-focus"
                    />
                    <label htmlFor="pkgActive" className="text-[12px] font-bold text-slate-500">Pacote Ativo</label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-primary py-2.5 text-[12px] font-black text-white hover:brightness-105 active:scale-95 shadow-sm"
                  >
                    {pkgForm.id ? "Atualizar" : "Salvar Oferta"}
                  </button>
                  {pkgForm.id && (
                    <button
                      type="button"
                      onClick={() => setPkgForm({ id: "", networkId: "instagram", benefitId: "followers", quantity: "", price: "", title: "", description: "", badge: "", badgeVariant: "default", extraNote: "", bullets: "", ctaLabel: "Comprar agora", url: "", sortOrder: "0", active: true })}
                      className="rounded-xl border border-slate-200 px-3 text-[12px] font-bold text-slate-550 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* LISTAGEM DE OFERTAS */}
            <div className="sm:col-span-2 rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">
                Ofertas Configuradas
              </h2>
              <div className="grid gap-3.5">
                {paidPackages.length === 0 ? (
                  <div className="py-10 text-center font-bold text-slate-400">Nenhum pacote configurado.</div>
                ) : (
                  paidPackages.map((p) => (
                    <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-100 rounded-2xl p-4 hover:border-slate-200 transition-all bg-slate-50/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-black text-slate-800 text-[13.5px]">{p.networkId}</span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-primary border border-blue-100 uppercase">{p.benefitId === "followers" ? "Seguidores" : p.benefitId === "likes" ? "Curtidas" : "Views"}</span>
                          {p.badge && (
                            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase border ${
                              p.badgeVariant === "hot"
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : p.badgeVariant === "best"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>{p.badge}</span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-[14.5px] text-slate-700 mt-1">{p.title} ({p.quantity} itens)</h3>
                        <p className="text-[11.5px] font-medium text-slate-400 mt-0.5">{p.description}</p>
                        <p className="text-[11px] font-semibold text-slate-450 truncate max-w-md mt-1">{p.url}</p>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center gap-4 shrink-0 text-right w-full sm:w-auto justify-between sm:justify-end border-t border-slate-100 sm:border-0 pt-3 sm:pt-0">
                        <div>
                          <div className="text-primary font-black text-[15.5px]">R$ {p.price.toFixed(2)}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ordem: {p.sortOrder}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              let bulletsRaw = "";
                              try {
                                bulletsRaw = JSON.parse(p.bullets).join("\n");
                              } catch {
                                bulletsRaw = p.bullets;
                              }
                              setPkgForm({
                                id: p.id,
                                networkId: p.networkId,
                                benefitId: p.benefitId,
                                quantity: p.quantity.toString(),
                                price: p.price.toString(),
                                title: p.title,
                                description: p.description,
                                badge: p.badge || "",
                                badgeVariant: p.badgeVariant,
                                extraNote: p.extraNote || "",
                                bullets: bulletsRaw,
                                ctaLabel: p.ctaLabel,
                                url: p.url,
                                sortOrder: p.sortOrder.toString(),
                                active: p.active,
                              });
                            }}
                            className="p-2 text-slate-400 hover:text-primary transition rounded-xl hover:bg-white border border-transparent hover:border-slate-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(p.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition rounded-xl hover:bg-white border border-transparent hover:border-slate-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB: SMM CONFIG ============ */}
        {activeTab === "smm" && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-5 animate-in fade-in duration-300">
            {/* CREDENCIAIS DA API */}
            <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Credenciais PerfectPanel (Duke SMM)</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Duke API URL
                  </label>
                  <input
                    value={settings.smmApiUrl}
                    onChange={(e) => setSettings({ ...settings, smmApiUrl: e.target.value })}
                    placeholder="https://..."
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Duke API Key (Token Secreto)
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={settings.smmApiKey}
                      onChange={(e) => setSettings({ ...settings, smmApiKey: e.target.value })}
                      placeholder="API Token da sua conta"
                      required
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                    />
                    {settings.smmApiKey && settings.smmApiKey.includes("...") && (
                      <span className="absolute right-3.5 top-5 text-[9px] font-bold bg-amber-50 border border-amber-100 rounded px-1 text-amber-600">Salva e Mascarada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleTestSMMConnection}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-black text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Testar Conexão da API
                </button>
              </div>
            </div>

            {/* LIMITE E CONTROLE DO FUNIL */}
            <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Controles da Campanha</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Limite Diário Global (Testes de hoje)
                  </label>
                  <input
                    type="number"
                    value={settings.dailyGlobalLimit}
                    onChange={(e) => setSettings({ ...settings, dailyGlobalLimit: Number(e.target.value) })}
                    placeholder="Ex: 100"
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">Desativa os testes após atingir o limite global diário.</p>
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="campaignToggle"
                    checked={settings.testCampaignActive}
                    onChange={(e) => setSettings({ ...settings, testCampaignActive: e.target.checked })}
                    className="rounded text-primary focus:ring-focus"
                  />
                  <label htmlFor="campaignToggle" className="text-[12.5px] font-extrabold text-slate-650">Campanha de testes ativa (Funil Ativo)</label>
                </div>
              </div>
            </div>

            {/* TESTES ILIMITADOS (BYPASS) */}
            <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Testes Ilimitados (Bypass de Bloqueio)</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Rede Social
                  </label>
                  <select
                    value={unlockForm.networkId}
                    onChange={(e) => setUnlockForm({ ...unlockForm, networkId: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="kwai">Kwai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Nome de Usuário (@) ou Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={unlockForm.input}
                      onChange={(e) => setUnlockForm({ ...unlockForm, input: e.target.value })}
                      placeholder="Ex: @seuperfil"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                    />
                    <button
                      type="button"
                      disabled={unlocking}
                      onClick={handleUnlockTarget}
                      className="mt-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-black text-white hover:bg-emerald-600 transition active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {unlocking ? "Salvando..." : "Tornar Ilimitado"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">Isso permitirá usar o funil gratuito com este perfil/link quantas vezes quiser.</p>
                </div>
              </div>
              
              {/* Tabela de Ilimitados Atuais */}
              {unlimitedTargets.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Perfis Atualmente Ilimitados
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Rede Social</th>
                          <th className="px-4 py-3">Destinatário</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium">
                        {unlimitedTargets.map((t) => (
                          <tr key={t.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-650 capitalize">{t.networkId}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{t.originalTarget}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(t.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveUnlimitedTarget(t.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* BOTÃO SALVAR */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3.5 text-[13px] font-black text-white shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? "Salvando configurações..." : "Salvar Configurações SMM"}
              </button>
            </div>
          </form>
        )}

        {/* ============ TAB: SEO & SUPPORT CONFIG ============ */}
        {activeTab === "seo" && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-5 animate-in fade-in duration-300">
            {/* BRANDING & SEO */}
            <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Branding & SEO</h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Título do Site
                  </label>
                  <input
                    value={settings.siteTitle}
                    onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Descrição Meta (SEO)
                  </label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    required
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Favicon URL
                  </label>
                  <input
                    value={settings.faviconUrl}
                    onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    WhatsApp de Suporte
                  </label>
                  <input
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    placeholder="Ex: 5511999998888 (com DDI + DDD)"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12.5px] font-bold text-slate-700 focus:ring-focus"
                  />
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">Insira o número completo com código de país (55 para Brasil), sem parênteses ou traços.</p>
                </div>
              </div>
            </div>

            {/* BOTÃO SALVAR */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6 py-3.5 text-[13px] font-black text-white shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? "Salvando configurações..." : "Salvar Configurações Gerais"}
              </button>
            </div>
          </form>
        )}

      </main>
    </div>
  );
}
