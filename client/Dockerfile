FROM node:20-alpine AS builder

WORKDIR /app

# Copia configurações do monorepo e módulos necessários
COPY package*.json tsconfig.base.json ./
COPY shared/ ./shared/
COPY client/ ./client/

# Instalação e compilação
RUN npm install
RUN npm run build --workspace=shared
RUN npm run build --workspace=client

FROM nginx:alpine

# Copia arquivos estáticos compilados para o Nginx
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
