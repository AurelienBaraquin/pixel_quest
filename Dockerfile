# Construction du Frontend (Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app-front

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build



# Construction du Backend (Serveur)
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./

RUN npm install

COPY server/ .



# Fusion (Copie du Front dans le Back)

RUN mkdir -p public

COPY --from=frontend-builder /app-front/dist ./public

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]