#!/usr/bin/env node
/**
 * Setup script for Smart Shooting Gallery
 * This script helps set up the project dependencies and initial configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rootDir = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`
${colors.bright}${colors.cyan}==================================${colors.reset}
${colors.bright}${colors.cyan} Smart Shooting Gallery Setup${colors.reset}
${colors.bright}${colors.cyan}==================================${colors.reset}
`);

// Helper function to execute commands
function execute(command, cwd = rootDir) {
  try {
    console.log(`${colors.yellow}> ${command}${colors.reset}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}Error executing command: ${command}${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Check for .env file in backend
function checkEnvFile() {
  const envPath = path.join(rootDir, 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log(`${colors.yellow}No .env file found in backend directory. Creating one...${colors.reset}`);
    
    const envContent = `PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-shooting-gallery
JWT_SECRET=your_jwt_secret_replace_this_in_production
NODE_ENV=development`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}Created .env file at ${envPath}${colors.reset}`);
  } else {
    console.log(`${colors.green}Found existing .env file${colors.reset}`);
  }
}

// Install backend dependencies
function setupBackend() {
  console.log(`\n${colors.bright}Setting up backend...${colors.reset}`);
  
  checkEnvFile();
  
  if (execute('npm install', path.join(rootDir, 'backend'))) {
    console.log(`${colors.green}Backend dependencies installed successfully${colors.reset}`);
    return true;
  }
  return false;
}

// Install frontend dependencies
function setupFrontend() {
  console.log(`\n${colors.bright}Setting up frontend...${colors.reset}`);
  
  if (execute('npm install', path.join(rootDir, 'frontend'))) {
    console.log(`${colors.green}Frontend dependencies installed successfully${colors.reset}`);
    return true;
  }
  return false;
}

// Main function
async function main() {
  console.log(`${colors.bright}Installing project dependencies...${colors.reset}`);
  
  const backendSuccess = setupBackend();
  const frontendSuccess = setupFrontend();
  
  if (backendSuccess && frontendSuccess) {
    console.log(`
${colors.bright}${colors.green}==================================${colors.reset}
${colors.bright}${colors.green} Setup completed successfully!${colors.reset}
${colors.bright}${colors.green}==================================${colors.reset}

${colors.cyan}To start the backend:${colors.reset}
cd ${path.join(rootDir, 'backend')}
npm run dev

${colors.cyan}To start the frontend:${colors.reset}
cd ${path.join(rootDir, 'frontend')}
npm start

${colors.cyan}To test WebSocket connection:${colors.reset}
cd ${path.join(rootDir, 'backend')}
node test/websocket-test.js

${colors.cyan}For hardware setup:${colors.reset}
See instructions in esp8266/README.md
`);
  } else {
    console.log(`
${colors.bright}${colors.red}==================================${colors.reset}
${colors.bright}${colors.red} Setup completed with errors!${colors.reset}
${colors.bright}${colors.red}==================================${colors.reset}

Please check the error messages above and try to resolve the issues.
`);
  }
  
  rl.close();
}

main().catch(err => {
  console.error(`${colors.red}Error during setup:${colors.reset}`, err);
  process.exit(1);
});
