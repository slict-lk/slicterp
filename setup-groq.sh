#!/bin/bash

# Groq + Llama 3 Setup Script for ERP AI Assistant
# This script helps you set up Groq integration in 2 minutes

set -e

echo "🚀 Groq + Llama 3 Setup Script"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "⚠️  No .env.example found. Creating minimal .env..."
        touch .env
    fi
fi

# Check current configuration
echo ""
echo "📋 Current AI Configuration:"
echo "----------------------------"
grep -E "^(GROQ_|OLLAMA_|LOCAL_AI_)" .env || echo "  No AI config found"
echo ""

# Prompt for API key
echo "🔑 Groq API Key Setup"
echo "-------------------"
echo "Get your FREE API key at: https://console.groq.com"
echo ""
read -p "Enter your Groq API key (or press Enter to skip): " GROQ_KEY

if [ -n "$GROQ_KEY" ]; then
    # Update or add GROQ_API_KEY
    if grep -q "^GROQ_API_KEY=" .env; then
        sed -i.bak "s|^GROQ_API_KEY=.*|GROQ_API_KEY=\"$GROQ_KEY\"|" .env
    else
        echo "GROQ_API_KEY=\"$GROQ_KEY\"" >> .env
    fi
    echo "✅ GROQ_API_KEY added to .env"
else
    echo "⏭️  Skipping API key (add manually later)"
fi

# Ask for model selection
echo ""
echo "🤖 Model Selection"
echo "-----------------"
echo "Available models:"
echo "  1) llama-3-70b-versatile (default - best balance)"
echo "  2) llama-3-8b-instant (faster, lighter)"
echo "  3) mixtral-8x7b-32768 (good for complex tasks)"
read -p "Choose model (1-3, default: 1): " MODEL_CHOICE

case $MODEL_CHOICE in
  1) MODEL="llama-3-70b-versatile" ;;
  2) MODEL="llama-3-8b-instant" ;;
  3) MODEL="mixtral-8x7b-32768" ;;
  *) MODEL="llama-3-70b-versatile" ;;
esac

if grep -q "^GROQ_MODEL=" .env; then
    sed -i.bak "s|^GROQ_MODEL=.*|GROQ_MODEL=\"$MODEL\"|" .env
else
    echo "GROQ_MODEL=\"$MODEL\"" >> .env
fi

echo "✅ Model set to: $MODEL"

# Optional: Set temperature
echo ""
echo "🌡️  Temperature Setting"
echo "---------------------"
echo "0.0 = Deterministic (good for invoices, SQL)"
echo "0.7 = Balanced (default, good for reports)"
echo "1.0 = Creative (good for brainstorming)"
read -p "Enter temperature (0.0-1.0, default: 0.7): " TEMP

TEMP=${TEMP:-0.7}
if grep -q "^GROQ_TEMPERATURE=" .env; then
    sed -i.bak "s|^GROQ_TEMPERATURE=.*|GROQ_TEMPERATURE=\"$TEMP\"|" .env
else
    echo "GROQ_TEMPERATURE=\"$TEMP\"" >> .env
fi

echo "✅ Temperature set to: $TEMP"

# Installation
echo ""
echo "📦 Dependency Check"
echo "-------------------"

if grep -q "\"ai\"" package.json; then
    echo "✅ 'ai' package already installed"
else
    echo "📥 Installing 'ai' package..."
    npm install ai
    echo "✅ 'ai' package installed"
fi

# Create initialization script
echo ""
echo "🔧 Creating test script..."

cat > test-groq.mjs << 'EOF'
#!/usr/bin/env node

import fetch from 'node-fetch';

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'llama-3-70b-versatile';

if (!apiKey) {
  console.error('❌ GROQ_API_KEY not set');
  process.exit(1);
}

console.log('🧪 Testing Groq Connection');
console.log('==========================');
console.log(`Model: ${model}`);
console.log('');

try {
  console.log('📡 Connecting to Groq API...');
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Connection successful!');
  console.log(`📊 Available models: ${data.data.length}`);
  
  data.data.forEach(m => {
    if (m.id.includes('llama') || m.id.includes('mixtral')) {
      console.log(`  ✓ ${m.id}`);
    }
  });

  console.log('');
  console.log('✨ Next steps:');
  console.log('  1. Add GROQ_API_KEY to Vercel: vercel env add GROQ_API_KEY');
  console.log('  2. Test in your app: npm run dev');
  console.log('  3. Try: GET /api/ai/groq/status');
  console.log('');
  console.log('📚 Documentation: See GROQ_INTEGRATION_GUIDE.md');

} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('  1. Check API key: console.groq.com');
  console.error('  2. Verify .env: cat .env | grep GROQ');
  console.error('  3. Network: curl https://api.groq.com/openai/v1/models');
  process.exit(1);
}
EOF

chmod +x test-groq.mjs
echo "✅ Test script created: test-groq.mjs"

# Summary
echo ""
echo "✨ Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "  1. Test connection: node test-groq.mjs"
echo "  2. Start dev server: npm run dev"
echo "  3. Check status: curl http://localhost:3000/api/ai/groq/status"
echo "  4. Try chat: POST http://localhost:3000/api/ai/groq/chat"
echo ""
echo "📚 Useful Commands:"
echo "  # View configuration"
echo "  grep '^GROQ_' .env"
echo ""
echo "  # Update Vercel secrets"
echo "  vercel env add GROQ_API_KEY"
echo ""
echo "  # Run tests"
echo "  npm test"
echo ""
echo "📖 Documentation:"
echo "  - GROQ_INTEGRATION_GUIDE.md (setup & API docs)"
echo "  - GROQ_EXAMPLE_PROMPTS.ts (example prompts)"
echo ""
echo "🎯 Good luck! Happy coding! 🚀"
