# 📘 Manual de Operação e Administração: Painel Administrativo

Este documento descreve detalhadamente o funcionamento, a parametrização e os fluxos operacionais do painel de administração da plataforma **Top Seguidores**. Ele serve de guia técnico e operacional para administradores e desenvolvedores gerenciarem o negócio no dia a dia.

---

## 🔐 1. Acesso e Autenticação

O painel administrativo é protegido por uma tela de login dedicada.
*   **Rota de Acesso:** `/administracao`
*   **Senha de Acesso:** A senha padrão é definida pela variável de ambiente `ADMIN_PASSWORD` no arquivo `.env` no servidor.
*   **Segurança:** A rota possui proteção automática contra indexação de motores de busca (`noindex, nofollow` injetado via metadados) para garantir que robôs do Google não exponham o painel.

---

## 📊 2. Dashboard Principal (`/administracao`)

O dashboard é a central de monitoramento financeiro e de pedidos em tempo real. Ele está dividido em três seções principais:

### A. Indicadores de Desempenho (KPIs)
*   **Faturamento:** Soma total de todas as vendas aprovadas em reais (R$).
*   **Pedidos Concluídos:** Quantidade de ordens que foram pagas e enviadas com sucesso ao painel SMM.
*   **Ticket Médio:** O valor médio gasto por cada cliente em uma compra.
*   **Leads Capturados:** Contagem total de clientes únicos (e-mails e números de WhatsApp) registrados no sistema de CRM automático.

### B. Gráfico de Faturamento (`RevenueChart`)
*   Exibe de forma visual a curva de receita diária ou semanal, permitindo analisar quais dias obtiveram melhor performance de tráfego e conversão.

### C. Tabela de Monitoramento de Pedidos (`OrdersTable`)
Lista cronologicamente todas as intenções de compra geradas no checkout. É o coração operacional do painel.
*   **Captura de Leads:** Exibe o **E-mail** e o **WhatsApp** do comprador. *Mesmo que o cliente não pague o PIX, o lead fica gravado na tabela*, permitindo que você faça ações manuais de remarketing (recuperação de carrinho).
*   **Status de Pagamento:**
    *   `Pendente`: O cliente gerou o código Copia e Cola do PIX mas ainda não pagou.
    *   `Pago`: PIX compensado pelo gateway.
*   **Status de Entrega SMM (Integração Duke Fornecedor):**
    *   `Pendente`: Pedido aguardando confirmação do PIX.
    *   `Completed`: Pedido enviado e processado com sucesso pelo fornecedor.
    *   `Error SMM`: Houve uma falha de envio automático (ex: saldo insuficiente no fornecedor, ID do serviço errado, link inválido).
*   **Botão Reenviar (Retry):** Caso o pedido fique com o status `Error SMM`, o administrador pode resolver a causa raiz (ex: recarregar o saldo na Duke Fornecedor) e clicar no botão **"Reenviar"** para submeter a ordem novamente de forma manual sem precisar que o cliente faça uma nova compra.

---

## 🛍️ 3. Gestão de Serviços (`/administracao/servicos`)

Nesta tela, você controla os pacotes de engajamento, preços de venda, preços de custo aparentes e mapeamento automático do fornecedor.

### A. Atualização em Massa de IDs SMM (IDs Duke)
Ferramenta para trocar o ID do fornecedor de vários planos simultaneamente, acelerando a manutenção se você trocar de fornecedor ou se os IDs na Duke Fornecedor mudarem.
1.  Selecione a **Plataforma** (Instagram ou TikTok).
2.  Selecione o **Tipo** (Seguidores, Curtidas ou Visualizações).
3.  Selecione a **Origem** (Brasileiros ou Mundiais).
4.  Digite o **Novo ID Duke** e clique em **Atualizar**. Todos os planos correspondentes serão remapeados na hora.

### B. Tabela de Edição Direta (Grid Inline)
Permite alterar os valores de cada plano individualmente de forma rápida. *Os dados são salvos no banco de dados automaticamente ao mudar de campo (onBlur):*
*   **Nome do Serviço:** Exibição do pacote cadastrado (plataforma + tipo).
*   **Quantidade:** O número de seguidores, curtidas ou visualizações entregues (ex: `1000`).
*   **Preço (R$):** O preço real cobrado do cliente no Pix (ex: `26.45`).
*   **Original (R$):** O preço "riscado" que simula um desconto promocional no frontend (ex: `39.00`).
*   **Service ID (SMM):** O ID exato do serviço correspondente no painel do fornecedor (ex: `398`).

---

## ⚙️ 4. Ajustes Globais e APIs (`/administracao/settings`)

Esta página contém os parâmetros de branding, chaves secretas de integração financeira, rastreamento de anúncios e scrapers de perfil.

### A. Seção Branding & SEO
*   **Título do Site:** Nome exibido na aba do navegador e no título do Google (injetado dinamicamente em todas as páginas públicas).
*   **Descrição (SEO):** Resumo meta-descrição que atrai cliques no buscador Google.
*   **Palavras-chave:** Tags separadas por vírgula para motores de busca antigos.
*   **Favicon URL:** Link da imagem de ícone do site.
*   **Logo / OG Image URL:** Link absoluto para a imagem de prévia (essencial para que o site apareça com imagem ilustrativa premium ao ser compartilhado no WhatsApp ou Telegram).
*   **Número do WhatsApp (Suporte):** O telefone para onde o botão flutuante de WhatsApp redirecionará o cliente. *Use obrigatoriamente o formato internacional: código do país + DDD + número (ex: 5511999998888).*
*   **Mostrar Notificações de Venda (Prova Social):** Switch de liga/desliga para o banner popup no canto inferior esquerdo que simula compras recentes (ex: *"Mariana de São Paulo comprou 500 seguidores há 2 min"*), gerando gatilho de urgência e prova social no comprador.

### B. Seção Facebook Tracking
*   **Pixel ID:** O código do pixel do Facebook para rastreamento de conversão de anúncios de tráfego pago.
*   **Conversions API Token (CAPI):** Token secreto de acesso para enviar eventos diretamente do servidor Next.js para o Facebook. Isso reduz a perda de rastreamento causada por bloqueadores de anúncios (AdBlock) no navegador do cliente.

### C. Seção Chaves de API
*   **X-RapidAPI-Key:** A chave que alimenta os scrapers automatizados que buscam o @perfil e exibem os Reels no modal do Instagram e TikTok.
*   **PushinPay Token:** O token secreto para gerar PIX dinâmicos e receber os pagamentos instantâneos.
*   **Webhook Token:** A chave secreta de validação para garantir que as notificações de confirmação de pagamento recebidas no site foram enviadas legitimamente pela PushinPay.
*   **PerfectPanel URL & Key:** Credenciais de API da Duke Fornecedor (`https://dukefornecedor.com/api/v2` e sua API Key privada) para envio automático dos pedidos aprovados.

---

## 🛠️ 5. Resolução de Problemas Frequentes (Troubleshooting)

### Pedido consta como "Pago" mas a entrega SMM exibe status "Error SMM"
1.  **Causa 1: Saldo insuficiente no fornecedor.** 
    *   *Solução:* Acesse o painel do seu fornecedor (Duke Fornecedor), verifique seu saldo e realize uma recarga. Volte ao painel administrativo e clique no botão **"Reenviar"** na linha do pedido.
2.  **Causa 2: ID de serviço desatualizado.**
    *   *Solução:* O ID do serviço no fornecedor pode ter sido desativado ou alterado. Vá em **Serviços (SMM)**, confirme o ID correto no painel do fornecedor, atualize na tabela e depois clique em **"Reenviar"** no pedido.
3.  **Causa 3: Link de perfil privado ou inválido.**
    *   *Solução:* Se o cliente digitou um perfil privado ou um link quebrado, a API do fornecedor rejeita o pedido. Entre em contato com o cliente via WhatsApp (o lead de WhatsApp está na tabela), pegue o link correto, altere ou envie manualmente via painel do fornecedor.

### Os perfis do Instagram ou TikTok não estão carregando no Checkout
1.  **Causa 1: Cota da RapidAPI expirou.**
    *   *Solução:* Acesse seu console RapidAPI, verifique o consumo e a assinatura da API de scraping. Caso tenha esgotado a franquia de requisições, faça o upgrade de plano ou aguarde a renovação.
2.  **Causa 2: Mudança de políticas do Instagram.**
    *   *Solução:* A plataforma possui um sistema de resiliência (Fallback automático). Se a API de perfil falhar, o sistema tentará carregar as mídias diretamente pelo feed. Se ambos falharem, revise a integridade da chave da RapidAPI cadastrada nos Ajustes.
