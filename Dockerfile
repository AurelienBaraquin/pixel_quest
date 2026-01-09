# ==========================================
# ÉTAPE 1 : Construction du Frontend (Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app-front

# On copie les fichiers de dépendances FRONT
COPY package*.json ./
# Installation des dépendances
RUN npm install

# On copie tout le code source
COPY . .

# On construit le site (crée le dossier dist)
RUN npm run build

# ==========================================
# ÉTAPE 2 : Construction du Backend (Serveur)
# ==========================================
FROM node:20-alpine
WORKDIR /app

# On copie le package.json du SERVEUR
COPY server/package*.json ./

# ⚠️ On installe TOUTES les dépendances (y compris tsx et @libsql)
RUN npm install

# On copie le code source du serveur
COPY server/ .

# ==========================================
# ÉTAPE 3 : Fusion (Copie du Front dans le Back)
# ==========================================

# On crée le dossier public
RUN mkdir -p public

# On récupère le dossier 'dist' de l'étape 1 et on le copie dans 'public'
COPY --from=frontend-builder /app-front/dist ./public

# Configuration finale
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Lancement avec npx tsx pour gérer le TypeScript sans compilation complexe
CMD ["npx", "tsx", "server.ts"]