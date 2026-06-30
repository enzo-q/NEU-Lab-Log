#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  NEU Lab Log — Deploy Script
#  Usage: bash deploy.sh
# ═══════════════════════════════════════════════════════════════

set -e  # Stop immediately if any command fails

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   NEU Lab Log — Firebase Deploy      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Check Node.js is installed ──────────────────────────────
if ! command -v node &> /dev/null; then
  echo "✗  Node.js not found."
  echo "   Download it from https://nodejs.org (use the LTS version)"
  exit 1
fi
echo "✓  Node.js $(node -v)"

# ── 2. Check Firebase CLI is installed ─────────────────────────
if ! command -v firebase &> /dev/null; then
  echo ""
  echo "  Firebase CLI not found. Installing now..."
  npm install -g firebase-tools
  echo "✓  Firebase CLI installed"
else
  echo "✓  Firebase CLI $(firebase --version)"
fi

# ── 3. Check login status ──────────────────────────────────────
echo ""
echo "Checking Firebase login..."
if ! firebase projects:list &> /dev/null; then
  echo "  Not logged in. Opening browser for Google sign-in..."
  firebase login
fi
echo "✓  Logged in"

# ── 4. Deploy Hosting + Firestore Rules ───────────────────────
echo ""
echo "Deploying to Firebase (project: database-1011)..."
echo "  → Hosting (HTML, JS, CSS, assets)"
echo "  → Firestore Security Rules"
echo ""
firebase deploy --only hosting,firestore:rules

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ✓  Deploy complete!                ║"
echo "║   https://database-1011.web.app      ║"
echo "╚══════════════════════════════════════╝"
echo ""
