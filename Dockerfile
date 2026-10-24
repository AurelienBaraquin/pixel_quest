# syntax=docker/dockerfile:1
# ---- Front (Vite) ----
FROM node:24-alpine AS frontend
WORKDIR /app
COPY package*.json ./
# Le lockfile du front est désynchronisé (tailwind 3 vs 4) : npm install tant qu'il n'est pas régénéré.
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Serveur (Express + tsx) ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY server/package*.json ./
# tsx (devDependency) sert aussi au runtime : install complète.
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev
COPY server/ .
COPY --from=frontend /app/dist ./public
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "server.ts"]
