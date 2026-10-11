FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copia configurações do monorepo e módulos necessários
COPY package*.json tsconfig.base.json ./
COPY shared/ ./shared/
COPY server/ ./server/

# Instalação e compilação
RUN npm install
RUN npm run build --workspace=shared
RUN cd server && npx prisma generate
RUN npm run build --workspace=server

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copia apenas artefatos compilados e dependências necessárias para a imagem final leve
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["sh", "-c", "cd server && npx prisma db push --skip-generate && cd .. && npm run start --workspace=server"]
