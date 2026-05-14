/**
 * @file boot-db.mjs
 * @description Database bootstrapping utility.
 * Automates the startup of the local PostgreSQL container via Docker Compose 
 * and ensures the environment is ready for Prisma migrations.
 * @module scripts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load environment variables manually since dotenv might not be installed globally
/**
 * @function loadEnv
 * @description Manually parses a .env file into process.env to avoid 
 * external dependencies like 'dotenv' during early boot.
 */
const loadEnv = (file) => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          // Remove quotes
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      });
    }
  } catch (e) {
    // Ignore read errors
  }
};

loadEnv('.env');

const skipLocalDb = process.env.WWV_SKIP_LOCAL_DB === 'true' || process.env.WWV_SKIP_LOCAL_DB === '1';

if (skipLocalDb) {
  console.log('⏭️ Skipping local PostgreSQL startup (WWV_SKIP_LOCAL_DB is set).');
  process.exit(0);
}

// Deterministic Port Assignment
const cwd = process.cwd();
const folderName = path.basename(cwd);
let port = 5432; // Default for main repo

if (folderName !== 'worldwideview') {
  const hash = crypto.createHash('sha256').update(cwd).digest('hex');
  const portOffset = parseInt(hash.substring(0, 4), 16) % 1000;
  port = 5433 + portOffset;
}

process.env.WWV_DB_PORT = port.toString();
console.log(`🔌 Assigned deterministic database port: ${port}`);

// Rewrite DATABASE_URL in .env if it exists
const envPath = path.resolve(cwd, '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  const urlRegex = /(DATABASE_URL\s*=\s*["']?postgresql:\/\/[^:]+:[^@]+@localhost:)(\d+)(\/.*)/;
  if (urlRegex.test(envContent)) {
    envContent = envContent.replace(urlRegex, `$1${port}$3`);
    fs.writeFileSync(envPath, envContent, 'utf8');
  }
}


console.log('🚀 Checking local PostgreSQL database...');

try {
  // Check if docker is installed
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch (e) {
    console.log('⚠️ Docker is not installed or not in PATH. Skipping local database startup.');
    console.log('💡 If you want to run a local database automatically, please install Docker Desktop.');
    process.exit(0);
  }

  // Start the db service and wait for it to be healthy
  console.log('📦 Starting PostgreSQL via Docker Compose...');
  execSync('docker compose up -d --wait db', { stdio: 'inherit' });

  console.log('✅ Local PostgreSQL database is ready!');

} catch (error) {
  console.error('❌ Failed to start local database:', error.message);
  console.log('💡 Ensure that docker is running and try again');
  console.log('💡 You may need to start it manually or set WWV_SKIP_LOCAL_DB=true to use an external database.');
}
