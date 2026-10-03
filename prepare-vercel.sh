#!/bin/bash

# Vercel Deployment Preparation Script for SLICT ERP
# This script helps prepare your application for Vercel deployment

set -e

echo "🚀 SLICT ERP - Vercel Deployment Preparation"
echo "============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
echo ""

# Check if npm is installed
echo -e "${BLUE}Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm version: $NPM_VERSION${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Generate Prisma Client
echo -e "${BLUE}Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Type check
echo -e "${BLUE}Running TypeScript type check...${NC}"
npm run type-check
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Type check passed${NC}"
else
    echo -e "${YELLOW}⚠ Type check failed. Please fix TypeScript errors before deploying.${NC}"
fi
echo ""

# Build application
echo -e "${BLUE}Building application...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Please fix build errors before deploying.${NC}"
    exit 1
fi
echo ""

# Generate secrets
echo -e "${BLUE}Generating secure secrets...${NC}"
echo ""
echo "📝 Copy these values to Vercel Dashboard → Settings → Environment Variables:"
echo ""
echo -e "${YELLOW}NEXTAUTH_SECRET:${NC}"
openssl rand -base64 32
echo ""
echo -e "${YELLOW}ENCRYPTION_KEY:${NC}"
openssl rand -hex 16
echo ""
echo -e "${YELLOW}WHATSAPP_VERIFY_TOKEN (if needed):${NC}"
openssl rand -hex 32
echo ""

# Check for .env file
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠ Warning: .env file found. Make sure sensitive data is not committed to Git!${NC}"
    echo ""
fi

# Check if git is initialized
echo -e "${BLUE}Checking Git status...${NC}"
if [ -d ".git" ]; then
    echo -e "${GREEN}✓ Git repository initialized${NC}"
    
    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo -e "${YELLOW}⚠ You have uncommitted changes:${NC}"
        git status -s
        echo ""
        echo "Commit your changes before deploying:"
        echo "  git add ."
        echo "  git commit -m 'Prepare for Vercel deployment'"
    else
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Git not initialized. Initialize with:${NC}"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
fi
echo ""

# Summary
echo "============================================="
echo -e "${GREEN}✓ Preparation Complete!${NC}"
echo "============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up a PostgreSQL database (Vercel Postgres, Supabase, or Neon)"
echo ""
echo "2. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for deployment'"
echo "   git push origin main"
echo ""
echo "3. Deploy to Vercel:"
echo "   Option A: Connect GitHub repo at vercel.com/new"
echo "   Option B: Use Vercel CLI: vercel --prod"
echo ""
echo "4. Add environment variables in Vercel Dashboard"
echo "   (Use the secrets generated above)"
echo ""
echo "5. Run database migrations after deployment:"
echo "   npx prisma db push --accept-data-loss"
echo ""
echo "📚 Full guide: See VERCEL_DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Good luck with your deployment! 🚀${NC}"
