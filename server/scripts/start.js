#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get environment from command line argument or default to development
const environment = process.argv[2] || 'development';

// Validate environment
const validEnvironments = ['development', 'staging', 'production', 'test'];
if (!validEnvironments.includes(environment)) {
  console.error(`Invalid environment: ${environment}`);
  console.error(`Valid environments: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

// Set environment variables
process.env.NODE_ENV = environment;

// Load environment-specific configuration
const envFile = path.join(__dirname, '..', `env.${environment}`);
if (fs.existsSync(envFile)) {
  console.log(`Loading environment configuration from: ${envFile}`);
  
  // Read and parse environment file
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} else {
  console.log(`No environment file found at: ${envFile}`);
  console.log('Using default environment variables');
}

// Start the application
console.log(`Starting Spark Backend in ${environment} mode...`);

const child = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..')
});

child.on('error', (error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Application exited with code: ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});
