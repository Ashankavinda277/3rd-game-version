#!/usr/bin/env node
/**
 * Development startup script for Smart Shooting Gallery
 * This script starts both backend and frontend servers concurrently.
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

console.log(`
${colors.bright}${colors.cyan}==================================${colors.reset}
${colors.bright}${colors.cyan} Smart Shooting Gallery Dev Server${colors.reset}
${colors.bright}${colors.cyan}==================================${colors.reset}
`);

// Helper function to create a prefixed logger
function createLogger(prefix, prefixColor) {
  return (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${prefixColor}[${prefix}]${colors.reset} ${line}`);
      }
    });
  };
}

// Start backend server
function startBackend() {
  console.log(`${colors.bright}${colors.blue}Starting backend server...${colors.reset}`);
  
  const backend = spawn('npm', ['run', 'dev'], { cwd: backendDir });
  
  const backendLogger = createLogger('backend', colors.blue);
  
  backend.stdout.on('data', backendLogger);
  backend.stderr.on('data', backendLogger);
  
  backend.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.red}Backend process exited with code ${code}${colors.reset}`);
    }
  });
  
  return backend;
}

// Start frontend server
function startFrontend() {
  console.log(`${colors.bright}${colors.green}Starting frontend server...${colors.reset}`);
  
  const frontend = spawn('npm', ['start'], { cwd: frontendDir });
  
  const frontendLogger = createLogger('frontend', colors.green);
  
  frontend.stdout.on('data', frontendLogger);
  frontend.stderr.on('data', frontendLogger);
  
  frontend.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.red}Frontend process exited with code ${code}${colors.reset}`);
    }
  });
  
  return frontend;
}

// Main function
function main() {
  const backendProcess = startBackend();
  
  // Give backend a head start before starting frontend
  setTimeout(() => {
    const frontendProcess = startFrontend();
    
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Shutting down servers...${colors.reset}`);
      backendProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
      process.exit(0);
    });
  }, 2000);
  
  console.log(`
${colors.bright}${colors.magenta}==================================${colors.reset}
${colors.bright}${colors.magenta} Development servers started${colors.reset}
${colors.bright}${colors.magenta}==================================${colors.reset}
${colors.cyan}Backend:${colors.reset} http://localhost:5000
${colors.cyan}Frontend:${colors.reset} http://localhost:3000
${colors.cyan}WebSocket Tester:${colors.reset} http://localhost:3000/websocket-tester.html

${colors.yellow}Press Ctrl+C to stop all servers${colors.reset}
  `);
}

main();
