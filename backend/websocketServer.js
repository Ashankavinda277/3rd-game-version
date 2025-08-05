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
    console.log("Connection headers:", req.headers);

    // Initially mark as unidentified
    ws.clientType = "unidentified";

    // Auto-identify NodeMCU based on User-Agent or other headers
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('ESP') || userAgent.includes('Arduino') || req.headers['sec-websocket-protocol']) {
      console.log("Auto-identifying as NodeMCU based on headers");
      ws.clientType = "nodeMCU";
      clients.nodeMCU.add(ws);
      
      // Send immediate confirmation
      ws.send(JSON.stringify({
        type: "identification_confirmed",
        clientType: "nodeMCU",
        timestamp: Date.now(),
        message: "Auto-identified as NodeMCU"
      }));
      
      // Notify web clients
      broadcastStatus({
        type: "nodeMCU_connected",
        timestamp: Date.now(),
        message: "NodeMCU device has connected (auto-identified)",
        ...getConnectionStats(),
      });
    }

    // Send a welcome message immediately
    ws.send(JSON.stringify({
      type: "connection",
      status: "connected",
      message: "WebSocket connection established",
      timestamp: Date.now(),
      serverId: "SmartShootingGallery",
      connectionStats: getConnectionStats()
    }));

    // Handle messages from clients
    ws.on("message", async (message) => {
      try {
        // First check if the message is valid JSON
        const messageStr = message.toString().trim();
        console.log("Raw message received:", messageStr);

        // Handle non-JSON messages (including from NodeMCU/Arduino)
        if (messageStr === "HIT1" || messageStr === "HIT2"|| messageStr === "HIT3" || messageStr.startsWith("From Server:")) {
          console.log("Received simple message:", messageStr);
          
          // Auto-identify as NodeMCU if not already identified
          if (ws.clientType === "unidentified") {
            console.log("Auto-identifying sender as NodeMCU");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);
            
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU device identified from message pattern",
              ...getConnectionStats(),
            });
          }

          // Handle HIT messages
          if (messageStr === "HIT1" || messageStr === "HIT2"|| messageStr === "HIT3" ) {
            console.log("🎯 Processing hardware hit:", messageStr);
            
            // Set score increment based on hit type
            let scoreIncrement = 0;
            if (messageStr === "HIT1") scoreIncrement = 10;
            else if (messageStr === "HIT2") scoreIncrement = 5;
            else if (messageStr === "HIT3") scoreIncrement = 2;

            // Create a proper hit message for web clients with score increment
            const hitData = {
              type: "target_hit",
              targetId: 0,
              timestamp: Date.now(),
              scoreIncrement,
              rawMessage: messageStr,
              hitType: "direct_hit",
            };

            // Find the most recent active session for hardware hits
            try {
              const activeSession = await GameSessionService.getMostRecentActiveSession();
              
              if (activeSession) {
                console.log("📊 Found active session for hit:", activeSession.sessionId);
                
                // Register hit in the active session
                const result = await GameSessionService.registerHit(
                  activeSession.sessionId,
                  {
                    points: hitData.scoreIncrement,
                    targetId: hitData.targetId,
                    accuracy: 100,
                    zone: "center",
                  }
                );

                // Create session-aware hit message
                const sessionHitData = {
                  ...hitData,
                  sessionId: activeSession.sessionId,
                  currentScore: result.currentScore,
                  hitCount: result.hitCount,
                  accuracy: result.accuracy,
                  type: "hit_registered",
                };

                // Send to all web clients
                clients.web.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(sessionHitData));
                  }
                });
                
                console.log("✅ Hit registered successfully - Score:", result.currentScore);
              } else {
                console.log("⚠️ No active session found - sending generic hit data");
                
                // No active session, send generic hit data to all web clients
                clients.web.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(hitData));
                  }
                });
              }
            } catch (error) {
              console.error("❌ Error processing hit in session:", error);
              
              // Fallback: send generic hit data
              clients.web.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(hitData));
                }
              });
            }

            // Broadcast hit statistics to all clients
            broadcastStatus({
              type: "hit_registered",
              timestamp: Date.now(),
              message: "Hit detected and processed",
              hitData: hitData,
              timestamp: Date.now()
            });
            
            return; // Exit early after handling the special case
          }
          
          // Handle other NodeMCU status messages
          if (messageStr.startsWith("From Server:")) {
            console.log("NodeMCU status message:", messageStr);
            
            broadcastStatus({
              type: "nodeMCU_status",
              message: messageStr,
              timestamp: Date.now()
            });
            return;
          }

          return; // Exit early after handling non-JSON messages
        }

        // Try to parse as JSON for other messages
        const data = JSON.parse(messageStr);

        // Check if this is a device identification message
        if (data.type === "identify") {
          if (data.clientType === "nodeMCU") {
            console.log("NodeMCU device identified and registered via JSON");
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

        // Auto-identify based on message content if not already identified
        if (ws.clientType === "unidentified") {
          // Check for typical NodeMCU/Arduino message patterns
          if (data.type && (data.type.includes("motor") || data.type.includes("sensor") || data.type.includes("hit"))) {
            console.log("Auto-identifying as NodeMCU based on message content");
            ws.clientType = "nodeMCU";
            clients.nodeMCU.add(ws);
            
            broadcastStatus({
              type: "nodeMCU_connected",
              timestamp: Date.now(),
              message: "NodeMCU auto-identified from message pattern",
              ...getConnectionStats(),
            });
          } else {
            // Assume web client
            console.log("Auto-identifying as web client");
            ws.clientType = "web";
            clients.web.add(ws);
          }
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

        // Handle messages from web clients
        if (ws.clientType === "web") {
          // Handle game mode configuration messages
          if (data.type === "set_game_mode") {
            console.log("🎮 Game mode configuration received from web client:", data);
            
            // Forward to NodeMCU devices with the exact structure expected by Arduino
            clients.nodeMCU.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const motorCommand = {
                  type: "set_game_mode",
                  gameMode: data.gameMode,
                  motorSettings: data.motorSettings,
                  motorEnabled: data.motorEnabled || false,
                  timestamp: Date.now()
                };
                
                console.log("📤 Sending to NodeMCU:", JSON.stringify(motorCommand));
                client.send(JSON.stringify(motorCommand));
              }
            });
            
            // Broadcast to web clients for confirmation
            broadcastStatus({
              type: "game_mode_configured",
              gameMode: data.gameMode,
              motorSettings: data.motorSettings,
              timestamp: Date.now(),
              message: `Game mode '${data.gameMode}' configured on hardware`
            });
            return;
          }

          // Handle motor enable/disable messages
          if (data.type === "enable_motors" || data.type === "disable_motors") {
            console.log("🔧 Motor control command received from web client:", data);
            
            // Forward to NodeMCU devices with clear structure
            clients.nodeMCU.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                const motorCommand = {
                  type: data.type,
                  gameMode: data.gameMode || "easy",
                  motorEnabled: data.type === "enable_motors",
                  timestamp: Date.now()
                };
                
                console.log("📤 Sending motor command to NodeMCU:", JSON.stringify(motorCommand));
                client.send(JSON.stringify(motorCommand));
              }
            });
            
            // Broadcast to web clients for confirmation
            broadcastStatus({
              type: data.type === "enable_motors" ? "motors_enabled" : "motors_disabled",
              gameMode: data.gameMode,
              timestamp: Date.now(),
              message: data.type === "enable_motors" ? "Motors enabled and started" : "Motors disabled and stopped"
            });
            return;
          }
        }

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

    // Send a welcome message and request identification (but don't require it)
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "welcome",
            status: "ready",
            message: "WebSocket connection ready. Send any message to start communication.",
            timestamp: Date.now(),
            serverId: "SmartShootingGallery",
            clientType: ws.clientType,
            connectionStats: getConnectionStats()
          })
        );
      }
    }, 100); // Small delay to ensure connection is fully established
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
