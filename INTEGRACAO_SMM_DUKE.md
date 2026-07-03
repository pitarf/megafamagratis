# 🔌 Manual de Integração SMM: Duke Fornecedor (PerfectPanel API)

Este documento descreve como realizar a integração automatizada com o fornecedor SMM **Duke Fornecedor**, que utiliza o protocolo padrão da API **PerfectPanel**. Este guia serve como especificação para implementar a mesma lógica de envio de pedidos e consulta de status em outros sistemas.

---

## ⚙️ 1. Configurações Necessárias

Para realizar a comunicação, o sistema de destino precisará armazenar três variáveis de configuração por serviço/plataforma:

1.  **API URL:** A URL do gateway do fornecedor (Exemplo: `https://dukefornecedor.com/api/v2`).
2.  **API Key (Token):** A chave de autenticação privada gerada na conta do cliente dentro do painel da Duke Fornecedor.
3.  **Service ID (ID do Serviço):** O código numérico identificador do serviço a ser contratado (ex: `398` para Seguidores Brasileiros, `402` para Curtidas, etc.). *Cada pacote no banco de dados deve estar associado a um Service ID específico.*

---

## 🔗 2. Regras de Formatação de Links (Username vs Post Link)

Os painéis SMM exigem que o parâmetro `link` enviado na API seja uma URL válida. Dependendo do tipo de serviço, o sistema deve formatar o input do usuário:

### A. Para Serviços de Perfil (Seguidores)
O cliente digita apenas o `@usuário`. O sistema deve limpar o caractere `@` e estruturar a URL completa da plataforma correspondente antes de enviar para a API:
*   **Instagram:** `https://instagram.com/username`
*   **TikTok:** `https://www.tiktok.com/@username`
*   **Outra plataforma (ex: Kwai):** `https://kwai.com/username`

### B. Para Serviços de Postagem (Curtidas / Visualizações / Comentários)
O checkout captura a URL direta do post selecionado no grid (obtido via scraper) ou fornecido pelo cliente. Esse link é enviado **literalmente** à API do fornecedor.

---

## 📡 3. Especificação das Chamadas de API

Todas as requisições para a API PerfectPanel devem utilizar:
*   **Método:** `POST`
*   **Content-Type:** `application/x-www-form-urlencoded`
*   **User-Agent:** Recomenda-se definir um cabeçalho de User-Agent customizado para evitar bloqueios de firewalls (como Cloudflare) na API do fornecedor.

---

### 📥 A. Criar Novo Pedido (Action: `add`)

Envia uma ordem de serviço para ser processada e entregue pelo fornecedor.

#### Parâmetros do Corpo da Requisição (Form Data)
| Campo | Tipo | Valor / Descrição |
| :--- | :--- | :--- |
| `key` | String | A chave de API do Duke Fornecedor. |
| `action` | String | Deve ser `"add"`. |
| `service` | String | O ID numérico do serviço (Service ID). |
| `link` | String | A URL formatada do perfil ou da postagem. |
| `quantity` | String | A quantidade a ser entregue (convertido para string). |

#### Exemplo de Resposta de Sucesso (200 OK)
```json
{
  "order": 123456
}
```
> **Nota:** Guarde o número `order` (ID do pedido) no seu banco de dados para rastrear o status e abrir tickets de suporte caso necessário.

#### Exemplo de Resposta de Erro (200 OK ou 400)
```json
{
  "error": "Not enough funds on balance"
}
```
*Trate este retorno exibindo o erro nos logs administrativos ou alertando o administrador de que o saldo do fornecedor acabou.*

---

### 🔍 B. Consultar Status do Pedido (Action: `status`)

Consulta o andamento de um ou mais pedidos de forma simultânea.

#### Parâmetros do Corpo da Requisição (Form Data)
| Campo | Tipo | Valor / Descrição |
| :--- | :--- | :--- |
| `key` | String | A chave de API do Duke Fornecedor. |
| `action` | String | Deve ser `"status"`. |
| `orders` | String | Lista de IDs de pedidos separados por vírgula (Ex: `"123456,123457"`). |

#### Exemplo de Resposta de Sucesso (200 OK)
A resposta retorna um mapa contendo os IDs consultados como chaves principais:
```json
{
  "123456": {
    "status": "Pending",
    "start_count": "1542",
    "remains": "500"
  },
  "123457": {
    "status": "Completed",
    "start_count": "540",
    "remains": "0"
  }
}
```

#### Possíveis Status Retornados
*   `Pending`: Pedido aguardando início da entrega na fila.
*   `In progress`: Pedido sendo entregue ativamente.
*   `Completed`: Entrega finalizada com sucesso.
*   `Partial`: Entrega parcial (parte dos itens não pôde ser entregue e o valor correspondente foi reembolsado ao seu saldo).
*   `Canceled`: Pedido cancelado e valor totalmente reembolsado ao seu saldo.

---

## 💻 4. Exemplo Prático de Código (Node.js / TypeScript)

Abaixo está o código de exemplo utilizando a API nativa `fetch` para envio do pedido:

```typescript
export async function sendOrderToSMM(
  apiUrl: string, 
  apiKey: string, 
  serviceId: string, 
  link: string, 
  quantity: number
) {
  try {
    // 1. Preparar os dados como x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("action", "add");
    formData.append("service", serviceId);
    formData.append("link", link);
    formData.append("quantity", quantity.toString());

    // 2. Executar a requisição POST
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SMMClient/1.0",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    // 3. Tratar retornos de erro da API
    if (data.error) {
      console.error("Erro retornado pelo painel SMM:", data.error);
      return { success: false, error: data.error };
    }

    // 4. Retornar o ID do pedido gerado
    return { success: true, orderId: data.order.toString() };
  } catch (error: any) {
    console.error("Erro de conexão com o painel SMM:", error);
    return { success: false, error: error.message || "Falha na conexão" };
  }
}
```

---

## 🛡️ 5. Chamadas de API Avançadas (Recomendadas para Produção)

Para que o novo sistema seja verdadeiramente profissional e seguro, é fundamental implementar os seguintes recursos adicionais oferecidos pela API PerfectPanel:

### 💰 A. Consultar Saldo da Carteira (Action: `balance`)
Permite ao sistema monitorar se a carteira com o fornecedor possui saldo suficiente para as transações. Recomenda-se criar um alerta de e-mail ou notificação no painel admin se o saldo cair abaixo de um limite de alerta (ex: R$ 50,00).

#### Parâmetros do Corpo da Requisição (Form Data)
*   `key`: API Key do fornecedor.
*   `action`: `"balance"`.

#### Exemplo de Resposta de Sucesso (200 OK)
```json
{
  "balance": "145.82",
  "currency": "BRL"
}
```

#### Código de Exemplo (Node.js)
```typescript
export async function getSMMBalance(apiUrl: string, apiKey: string) {
  try {
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("action", "balance");

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SMMClient/1.0",
      },
      body: formData.toString()
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error };

    return { success: true, balance: parseFloat(data.balance), currency: data.currency };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao consultar saldo" };
  }
}
```

---

### 📋 B. Listar Todos os Serviços Disponíveis (Action: `services`)
Permite obter a tabela completa de serviços do fornecedor em tempo real. Útil para verificar a disponibilidade de um serviço ou sincronizar preços de custo automaticamente.

#### Parâmetros do Corpo da Requisição (Form Data)
*   `key`: API Key do fornecedor.
*   `action`: `"services"`.

#### Exemplo de Resposta de Sucesso (200 OK)
```json
[
  {
    "service": "398",
    "name": "Seguidores Instagram Brasileiros Premium",
    "type": "Default",
    "category": "Instagram - Seguidores Brasileiros",
    "rate": "4.20",
    "min": "100",
    "max": "50000",
    "refill": true,
    "cancel": false
  },
  {
    "service": "402",
    "name": "Curtidas Instagram Brasileiras Super Rápidas",
    "type": "Default",
    "category": "Instagram - Curtidas",
    "rate": "1.80",
    "min": "50",
    "max": "20000",
    "refill": false,
    "cancel": true
  }
]
```
> **Nota:** O campo `rate` corresponde ao custo cobrado pelo fornecedor a cada **1.000 unidades**.

---

### 🔄 C. Solicitar Reposição (Action: `refill`)
Muitos serviços possuem garantia de reposição gratuita em caso de queda de seguidores/curtidas ("drop"). Se o serviço contratado oferecer garantia, você pode automatizar a solicitação de reposição.

#### Parâmetros do Corpo da Requisição (Form Data)
*   `key`: API Key do fornecedor.
*   `action`: `"refill"`.
*   `order`: O ID do pedido original do fornecedor (ex: `123456`).

#### Exemplo de Resposta de Sucesso (200 OK)
```json
{
  "refill": 987654
}
```
*Guarde o ID de reposição retornado para futuras consultas.*

---

## 🚫 6. Catálogo de Erros Comuns da API

Ao integrar o PerfectPanel com seu novo sistema, certifique-se de tratar adequadamente estes retornos de erro (`data.error`):

| Erro Retornado | Causa Provável | Ação Recomendada pelo Sistema |
| :--- | :--- | :--- |
| `Not enough funds on balance` | O saldo na sua carteira do fornecedor SMM zerou ou é inferior ao custo do pedido. | Interromper processamento, marcar o pedido como "Pendente / Erro SMM" e alertar o administrador do sistema por e-mail ou painel admin. |
| `Invalid API Key` | A API Key configurada nos Ajustes está incorreta ou expirou. | Bloquear o envio automático e exibir erro crítico no painel administrativo. |
| `Invalid Service ID` | O ID do serviço associado a este plano no banco de dados não existe mais no fornecedor. | Notificar o administrador que o pacote de serviços precisa ser reconfigurado ou que o ID do serviço expirou. |
| `Bad link` | A URL fornecida no parâmetro `link` é inválida ou não condiz com a plataforma (ex: link de Kwai em serviço de Instagram). | Impedir o envio, sinalizar o pedido para revisão humana no painel de administração e/ou solicitar correção de link do usuário. |
| `Incorrect quantity` | A quantidade informada está abaixo do `min` ou acima do `max` configurado pelo fornecedor para este serviço. | Ajustar as regras de validação dos planos no backend do sistema para coincidir com as limitações da API do fornecedor. |
| `Action not found` | O parâmetro `action` enviado no corpo está incorreto ou vazio. | Corrigir a requisição no backend do sistema. |
