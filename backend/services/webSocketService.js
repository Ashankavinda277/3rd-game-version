const WebSocket = require('ws');

// Store WebSocket server instance
let wsServer = null;
let clients = {
  web: new Set(),
  nodeMCU: new Set()
};

// Initialize WebSocket service with server instance
const initializeWebSocketService = (wss, clientsRef) => {
  wsServer = wss;
  clients = clientsRef;
  console.log('WebSocket service initialized');
};

// Broadcast message to all NodeMCU clients
const broadcastToNodeMCU = (message) => {
  if (!wsServer) {
    console.error('WebSocket server not initialized');
    return false;
  }
  
  let sentCount = 0;
  
  clients.nodeMCU.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
        console.log('Message sent to NodeMCU:', message);
      } catch (error) {
        console.error('Error sending message to NodeMCU:', error);
      }
    }
  });
  
  console.log(`Message broadcasted to ${sentCount} NodeMCU clients`);
  return sentCount > 0;
};

// Broadcast message to all web clients
const broadcastToWeb = (message) => {
  if (!wsServer) {
    console.error('WebSocket server not initialized');
    return false;
  }
  
  let sentCount = 0;
  
  clients.web.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error('Error sending message to web client:', error);
      }
    }
  });
  
  console.log(`Message broadcasted to ${sentCount} web clients`);
  return sentCount > 0;
};

// Get WebSocket connection statistics
const getWebSocketStats = () => {
  return {
    webClients: clients.web.size,
    nodeMCUClients: clients.nodeMCU.size,
    totalClients: wsServer ? wsServer.clients.size : 0,
    serverInitialized: wsServer !== null
  };
};

// Send message to specific client type
const sendToClientType = (clientType, message) => {
  if (clientType === 'nodeMCU') {
    return broadcastToNodeMCU(message);
  } else if (clientType === 'web') {
    return broadcastToWeb(message);
  }
  return false;
};

module.exports = {
  initializeWebSocketService,
  broadcastToNodeMCU,
  broadcastToWeb,
  getWebSocketStats,
  sendToClientType
};
