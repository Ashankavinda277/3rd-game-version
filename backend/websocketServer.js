const WebSocket = require("ws");
const { initializeWebSocketService } = require("./services/webSocketService");
const GameSessionService = require("./services/gameSessionService");
const axios = require("axios");
// Store active sessions by player name for quick lookup
const activeSessions = new Map();

// Create a WebSocket server
const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ server });

  // Store connected clients by type
  const clients = {
    web: new Set(),
    nodeMCU: new Set(),
  };

  // Initialize WebSocket service
  initializeWebSocketService(wss, clients);

  // Helper function to broadcast status to web clients
  const broadcastStatus = (message) => {
    clients.web.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Helper function to get connection stats
  const getConnectionStats = () => {
    return {
      type: "connection_stats",
      webClients: clients.web.size,
      nodeMCUClients: clients.nodeMCU.size,
      totalClients: wss.clients.size,
      timestamp: Date.now(),
    };
  };

  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection from:", req.socket.remoteAddress);

    // Initially mark as unidentified
    ws.clientType = "unidentified";

    // Handle messages from clients
    ws.on("message", (message) => {
      try {
        // First check if the message is valid JSON
        const messageStr = message.toString().trim();
        console.log("Raw message received:", messageStr);

        // Handle non-JSON messages
        if (messageStr === "jj" || messageStr === "HIT") {
          console.log("Received simple hit message:", messageStr);

          // Create a proper hit message for web clients with score increment
          const hitData = {
            type: "target_hit",
            targetId: 0,
            timestamp: Date.now(),
            scoreIncrement: 10, // Points per hit
            rawMessage: messageStr,
            hitType: "direct_hit",
          };

          // Try to register hit in active sessions
          const activeWebClients = Array.from(clients.web).filter(
            (client) => client.sessionId && client.readyState === WebSocket.OPEN
          );

          activeWebClients.forEach(async (client) => {
            try {
              // Register hit in the session
              const result = await GameSessionService.registerHit(
                client.sessionId,
                {
                  points: hitData.scoreIncrement,
                  targetId: hitData.targetId,
                  accuracy: 100,
                  zone: "center",
                }
              );

              // Send updated score to the specific client
              client.send(
                JSON.stringify({
                  ...hitData,
                  sessionId: client.sessionId,
                  currentScore: result.currentScore,
                  hitCount: result.hitCount,
                  accuracy: result.accuracy,
                  type: "hit_registered",
                })
              );
            } catch (error) {
              console.error("Error registering hit in session:", error);
              // Still send the hit data even if session update fails
              client.send(JSON.stringify(hitData));
            }
          });

          // Forward to all web clients (for non-session clients)
          clients.web.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && !client.sessionId) {
              client.send(JSON.stringify(hitData));
            }
          });

          // Broadcast hit statistics to all clients
          broadcastStatus({
            type: "hit_registered",
            timestamp: Date.now(),
            message: "Hit detected and processed",
            hitData: hitData,
            activeSessionCount: activeWebClients.length,
          });

          return; // Exit early after handling the special case
        }

        // Try to parse as JSON for other messages
        const data = JSON.parse(messageStr);

        // Check if this is a device identification message
        if (data.type === "identify") {
          if (data.clientType === "nodeMCU") {
            console.log("NodeMCU device identified and registered");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);

            // Notify web clients about NodeMCU connection
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU device has connected",
              ...getConnectionStats(),
            });
          } else if (data.clientType === "web") {
            console.log("Web client identified and registered");
            ws.clientType = "web";
            clients.web.add(ws);

            // Store session info if provided
            if (data.sessionId) {
              ws.sessionId = data.sessionId;
              ws.playerName = data.playerName;
              console.log(
                `Web client associated with session: ${data.sessionId}`
              );
            }

            // Send connection stats to newly connected web client
            ws.send(JSON.stringify(getConnectionStats()));
          }

          // Send confirmation back to the client
          ws.send(
            JSON.stringify({
              type: "identification_confirmed",
              clientType: ws.clientType,
              timestamp: Date.now(),
            })
          );

          return;
        }

        // Handle session-related messages
        if (data.type === "session_info") {
          if (ws.clientType === "web") {
            ws.sessionId = data.sessionId;
            ws.playerName = data.playerName;
            console.log(
              `Web client session info updated: ${data.sessionId} - ${data.playerName}`
            );
          }
          return;
        }

        console.log(`Received data from ${ws.clientType}:`, data);

        // Process data from NodeMCU (which got it from Mega via Serial)
        if (ws.clientType === "nodeMCU") {
          // Log the specific data from NodeMCU for debugging
          console.log("NodeMCU data received:", data);

          // Handle simple HIT message format
          if (data.type === "hit" && data.value === "HIT") {
            // Convert to the expected format for frontend
            const hitData = {
              type: "target_hit",
              targetId: data.targetId || 0,
              timestamp: Date.now(),
              scoreIncrement: 10, // Points per hit
              accuracy: data.accuracy || 100,
              hitValue: data.value,
              zone: data.zone || "center", // bullseye, inner, outer
            };

            // Forward processed data to all web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(hitData));
              }
            });

            // Broadcast hit statistics
            broadcastStatus({
              type: "hit_registered",
              timestamp: Date.now(),
              message: "Hit detected from NodeMCU",
              hitData: hitData,
            });

            axios
              .post("http://localhost:5000/api/game/hit", {
                message: "Hit registered from NodeMCU WebSocket",
                timestamp: Date.now(),
                source: "nodeMCU",
                zone: data.zone || "center",
                accuracy: data.accuracy || 100,
              })
              .then(() => {
                console.log("✅ Sent HIT to API via axios");
              })
              .catch((err) => {
                console.error("❌ Failed to send HIT to API:", err.message);
              });
          }
          // Handle any other JSON messages from NodeMCU
          else {
            // Forward Arduino Mega data to all web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);

        // Handle unparseable messages more gracefully
        try {
          const rawMessage = message.toString().trim();
          console.log("Attempting to handle unparseable message:", rawMessage);

          // Create a fallback message format
          const fallbackData = {
            type: "unparsed_message",
            rawContent: rawMessage,
            timestamp: Date.now(),
            clientType: ws.clientType || "unknown",
          };

          // If it seems to be from a sensor or contains certain keywords
          if (
            rawMessage.includes("HIT") ||
            rawMessage.includes("hit") ||
            rawMessage.includes("target") ||
            ws.clientType === "nodeMCU"
          ) {
            fallbackData.type = "possible_hit_event";

            // Forward to web clients
            clients.web.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(fallbackData));
              }
            });

            console.log("Forwarded unparseable message as possible hit event");
          }
        } catch (fallbackError) {
          console.error(
            "Failed to handle message with fallback method:",
            fallbackError
          );
        }
      }
    });

    // Handle disconnection
    ws.on("close", (code, reason) => {
      console.log(
        `WebSocket connection closed for client type: ${
          ws.clientType || "unidentified"
        }`
      );
      console.log(
        `Close code: ${code}, reason: ${reason || "No reason provided"}`
      );

      // Remove client from appropriate set
      if (ws.clientType === "web") {
        clients.web.delete(ws);
        console.log(
          `Web client disconnected. Remaining web clients: ${clients.web.size}`
        );

        // Broadcast updated connection stats to remaining web clients
        broadcastStatus(getConnectionStats());
      } else if (ws.clientType === "nodeMCU") {
        clients.nodeMCU.delete(ws);
        console.log(
          `NodeMCU client disconnected. Remaining NodeMCU clients: ${clients.nodeMCU.size}`
        );

        // Notify web clients that NodeMCU disconnected
        broadcastStatus({
          type: "nodeMCU_disconnected",
          timestamp: Date.now(),
          message: "NodeMCU device has disconnected",
          ...getConnectionStats(),
        });
      }
    });

    // Handle WebSocket errors
    ws.on("error", (error) => {
      console.error(
        `WebSocket error for client type ${ws.clientType || "unidentified"}:`,
        error
      );

      // Clean up the client from sets
      if (ws.clientType === "web") {
        clients.web.delete(ws);
      } else if (ws.clientType === "nodeMCU") {
        clients.nodeMCU.delete(ws);
      }
    });

    // Handle ping/pong for connection keepalive
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Mark connection as alive initially
    ws.isAlive = true;

    // Send a welcome message and request identification
    ws.send(
      JSON.stringify({
        type: "connection",
        status: "connected",
        message:
          "Please identify yourself by sending a message with type:identify and clientType:nodeMCU or web",
        timestamp: Date.now(),
        serverId: "SmartShootingGallery",
      })
    );
  });

  // Heartbeat mechanism to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(
          `Terminating dead connection for client type: ${
            ws.clientType || "unidentified"
          }`
        );

        // Clean up client from sets
        if (ws.clientType === "web") {
          clients.web.delete(ws);
        } else if (ws.clientType === "nodeMCU") {
          clients.nodeMCU.delete(ws);
        }

        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  // Clean up heartbeat interval when server closes
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
};

module.exports = setupWebSocketServer;
