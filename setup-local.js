const fs = require('fs');
const path = require('path');

// Create local environment file
const envContent = `# Local Development Environment
# Database - Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/pryve_local?schema=public"

# Server
PORT=3000
NODE_ENV=DEVELOPMENT

# JWT - Use simple local secrets
JWT_SECRET=local_jwt_secret_key_for_development_only
JWT_EXPIRES_IN=7d

# AWS S3 - Optional for local development (can be mocked)
AWS_ACCESS_KEY_ID=your_local_aws_key
AWS_SECRET_ACCESS_KEY=your_local_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=local-dev-bucket

# Email - Optional for local development
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=local@example.com

# Stripe - Optional for local development
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Firebase - Optional for local development
FIREBASE_PROJECT_ID=local-project
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=local@example.com

# OpenAI - Optional for local development
OPENAI_API_KEY=your_openai_key`;

// Write .env file
fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file for local development');

// Create local database setup script
const dbSetupScript = `-- Local PostgreSQL Database Setup
-- Run these commands in your PostgreSQL terminal or pgAdmin

-- Create database
CREATE DATABASE pryve_local;

-- Create user (optional)
-- CREATE USER pryve_user WITH PASSWORD 'password';
-- GRANT ALL PRIVILEGES ON DATABASE pryve_local TO pryve_user;

-- Connect to the database
-- \\c pryve_local;

-- The Prisma migration will create all tables automatically
`;

fs.writeFileSync('setup-database.sql', dbSetupScript);
console.log('✅ Created setup-database.sql file');

// Create local development instructions
const instructions = `# Local Development Setup

## Prerequisites
1. Install PostgreSQL locally
2. Make sure PostgreSQL is running on localhost:5432

## Setup Steps

### 1. Database Setup
- Open PostgreSQL terminal or pgAdmin
- Run the commands in setup-database.sql
- Or create database manually: CREATE DATABASE pryve_local;

### 2. Environment Setup
- The .env file has been created with local settings
- Update DATABASE_URL if your PostgreSQL credentials are different

### 3. Install Dependencies
npm install

### 4. Run Database Migration
npm run db:migrate

### 5. Generate Prisma Client
npm run db:generate

### 6. Start Development Server
npm run dev

## Local URLs
- API Server: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs
- Database Studio: npm run db:studio

## Testing
- Test upload: http://localhost:3000/test-upload
- Health check: http://localhost:3000/api/v1/users

## Notes
- All external services (AWS, SendGrid, etc.) are optional for local development
- You can mock these services or use test credentials
- The app will work without external services for basic functionality
`;

fs.writeFileSync('LOCAL_SETUP.md', instructions);
console.log('✅ Created LOCAL_SETUP.md with instructions');

console.log('\n🎉 Local setup files created successfully!');
console.log('📋 Next steps:');
console.log('1. Set up PostgreSQL database');
console.log('2. Run: npm install');
console.log('3. Run: npm run db:migrate');
console.log('4. Run: npm run dev');
console.log('\n📖 See LOCAL_SETUP.md for detailed instructions');
