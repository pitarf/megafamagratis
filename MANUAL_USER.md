# Manual do Usuário e Operador — Painel Admin Mega Fama

Guia prático para parametrizar e gerenciar a entrega de testes grátis no funil Mega Fama.

---

## 🔐 1. Acesso Seguro

1. Acesse o endereço do seu site seguido por `/administracao` (ex: `https://seusite.com/administracao`).
2. Digite a senha mestra configurada no arquivo `.env` (a senha padrão `"admin123"` é rejeitada por motivos de segurança).
3. **Segurança contra brute force:** Tentativas malsucedidas repetidas geram bloqueios automáticos temporários de IP (tempo de espera progressivo de 1 a 10 minutos).
4. O painel é protegido contra indexação automática de motores de busca com a tag `noindex, nofollow`.

---

## 📊 2. Dashboard & KPIs de Redirecionamento

- **Estatísticas de Funil:** Visualize cliques totais, visualizações de ofertas pagas e a taxa de clique de redirecionamento (conversão de tráfego grátis para ofertas).
- **Saldo Duke:** Mostra em tempo real o saldo restante em sua conta no painel **Duke Fornecedor**. Clique no ícone de atualização para recarregar o valor.
- **Tabela de Pedidos:** Mostra todos os resgates solicitados, data, destinatário, status, e IDs de pedido SMM.
- **Reenvio Automático (Retry):** Se algum pedido falhar por causa de saldo zerado no fornecedor ou instabilidade, você verá o status `Falha` em vermelho com a mensagem descritiva do erro. Basta recarregar seu saldo no painel Duke Fornecedor e clicar no botão **"Reenviar"** na linha do pedido.

---

## ⚙️ 3. Controle de Quantidades Grátis (Aba "Quantidades Grátis")

- Permite adicionar, remover, e ativar/desativar opções de quantidades para o funil.
- Cada opção exige a plataforma (Instagram/TikTok/Kwai), tipo de serviço (Seguidores/Curtidas/Views), a quantidade de teste (ex: 10, 15, 20) e o Service ID correspondente na API Duke Fornecedor.
- Se houver mais de uma opção ativa para um mesmo serviço, o usuário final verá um seletor visual na etapa de resgate para escolher a quantidade desejada.

---

## 🏷️ 4. Ofertas Pagas (Aba "Ofertas Pagas")

- Permite configurar os pacotes de ofertas promocionais exibidos ao usuário após o sucesso do teste grátis.
- Você pode editar o título, preço (R$), link de checkout oficial (MegaFollow), destaque da oferta ("BEST SELLER", "MELHOR OFERTA") e lista de benefícios exibidos no card.
- Cliques nestes checkouts são logados e contabilizados no painel do administrador.

---

## 🌐 5. Configurações da API & SEO (Abas "API & Serviços" e "SEO & Suporte")

- **Configurações SMM:** API URL, API Key mascarada para proteção e Toggles para desativar temporariamente toda a campanha de testes grátis ou aplicar limites diários globais.
- **SEO & Branding:** Altere o título que aparece na aba do navegador, a meta descrição do site, favicon do site e o WhatsApp de suporte.
