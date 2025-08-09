#!/bin/bash

# Azure App Service startup script for Node.js backend
echo "Starting Smart Shooting Gallery Backend..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo "Starting application..."
npm start
