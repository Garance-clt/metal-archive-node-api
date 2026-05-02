#!/bin/bash
# deploy.sh — à lancer depuis le VPS après chaque mise à jour du code
set -e

echo "📦 Installation des dépendances..."
npm ci --omit=dev

echo "🔨 Build TypeScript..."
npm run build

echo "🚀 Redémarrage PM2..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs

echo "✅ Déployé !"
pm2 status
