# Stage 1: Build da Aplicação e Geração do Client do Prisma
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Preparação de Dependências de Produção + CLI do Prisma
FROM node:20-alpine AS pruner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
# Copia o pacote prisma e executáveis para permitir executar migrations no container de produção
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

# Stage 3: Runner Final (Imagem de Produção Leve e Segura)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia dependências podadas
COPY --from=pruner /app/node_modules ./node_modules
# Copia build compilado do TanStack Start/Nitro
COPY --from=builder /app/.output ./.output
# Copia o schema e migrations do Prisma
COPY --from=builder /app/prisma ./prisma
# Copia o client gerado do Prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Criação de usuário não root para execução segura em produção
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# Porta e Comando de Inicialização do Nitro
ENV PORT=3000
CMD ["node", ".output/server/index.mjs"]
