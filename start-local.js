#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Local Development Setup...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Please run: node setup-local.js');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], { stdio: 'inherit' });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully');
      startDatabaseSetup();
    } else {
      console.log('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startDatabaseSetup();
}

function startDatabaseSetup() {
  console.log('\n🗄️  Setting up database...');
  
  // Generate Prisma client
  console.log('📋 Generating Prisma client...');
  const generate = spawn('npx', ['prisma', 'generate'], { stdio: 'inherit' });
  
  generate.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Prisma client generated successfully');
      console.log('\n📝 Next steps:');
      console.log('1. Set up PostgreSQL database:');
      console.log('   - Create database: CREATE DATABASE pryve_local;');
      console.log('   - Or run the commands in setup-database.sql');
      console.log('\n2. Run database migration:');
      console.log('   npm run db:migrate');
      console.log('\n3. Start the development server:');
      console.log('   npm run dev');
      console.log('\n🌐 Your app will be available at: http://localhost:3000');
      console.log('📚 API docs will be available at: http://localhost:3000/api-docs');
    } else {
      console.log('❌ Failed to generate Prisma client');
      process.exit(1);
    }
  });
}
