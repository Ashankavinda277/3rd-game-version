import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/PlayPage.css";
import { useGameContext } from "../contexts/GameContext";
import Target from "../components/common/Target";
import {
  submitScore,
  enableMotors,
  disableMotors,
  createGameSession,
  endGameSession,
  pauseGameAPI,
  playAgainAPI,
  startGame
} from "../services/api";
import Loader from "../components/common/Loader";

// Constants
const GAME_CONSTANTS = {
  HIT_ANIMATION_DELAY: 100,
  TARGET_SPAWN_DELAY: 100,
  TIMER_INTERVAL: 1000,
  RED_TIME_THRESHOLD: 10,
  BLINK_TIME_THRESHOLD: 5,
};

const DIFFICULTY_SETTINGS = {
  easy: {
    gameDuration: 90,
    targetSpeed: 1500,
    targetSize: 80,
    targetCount: 1,
    targetColors: ["#27ae60"],
  },
  medium: {
    gameDuration: 60,
    targetSpeed: 1200,
    targetSize: 70,
    targetCount: 2,
    targetColors: ["#2ecc71", "#e67e22"],
  },
  hard: {
    gameDuration: 45,
    targetSpeed: 800,
    targetSize: 60,
    targetCount: 3,
    targetColors: ["#e74c3c", "#3498db", "#e67e22"],
  },
};

// Enhanced Game Info Component
const GameInfoPanel = ({ score, gameMode, timeLeft }) => {
  const isRed = timeLeft <= GAME_CONSTANTS.RED_TIME_THRESHOLD;
  const shouldBlink = timeLeft <= GAME_CONSTANTS.BLINK_TIME_THRESHOLD;

  // Debug log to track what timeLeft value is received
  React.useEffect(() => {
    console.log(`📱 GameInfoPanel: Displaying timeLeft = ${timeLeft}s for mode = ${gameMode}`);
  }, [timeLeft, gameMode]);

  return (
    <div className="game-info-panel">
      <div className="info-card score-card">
        <div className="info-label">Score</div>
        <div className="info-value score-value">{score}</div>
      </div>
      <div className="info-card mode-card">
        <div className="info-label">Mode</div>
        <div className="info-value mode-value">{gameMode || "easy"}</div>
      </div>
      <div className="info-card time-card">
        <div className="info-label">Time Left</div>
        <div
          className={`info-value time-value ${isRed ? "red" : ""} ${
            shouldBlink ? "blink" : ""
          }`}
        >
          {timeLeft}s
        </div>
      </div>
    </div>
  );
};

const PlayPage = () => {
  const { user, gameMode, gameSettings, setNeedsRefresh, loading } =
    useGameContext();
  const [gameState, setGameState] = useState("ready");
  const [countdown, setCountdown] = useState(null); // null or number or 'GO!'
  const [score, setScore] = useState(0);
  
  // Add a ref to track the current score for timer-based endGame calls
  const currentScore = useRef(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [targets, setTargets] = useState([]);
  const [hitPositions, setHitPositions] = useState([]);
  const [missPositions, setMissPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [settings, setSettings] = useState(DIFFICULTY_SETTINGS.easy);
  const [gameStats, setGameStats] = useState({
    accuracy: 0,
    hitsPerSecond: 0,
    totalClicks: 0,
    totalHits: 0,
    totalShots: 0,
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showFinal, setShowFinal] = useState(true);
  const [finalPageStart, setFinalPageStart] = useState(false);
  
  // Add a message counter for debugging
  const messageCount = useRef(0);

  const gameAreaRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const targetMoveIntervalRef = useRef(null);
  const countdownAudioRef = useRef(null);
  const totalClicks = useRef(0);
  const totalHardwareHits = useRef(0);  // Track hardware hits
  const totalShots = useRef(0);  // Track total shots (clicks + hardware hits)
  const totalActualHits = useRef(0);  // Track actual hits (successful hits only)
  const isMounted = useRef(true);
  const gameStartTime = useRef(null);
  const wsRef = useRef(null);

  const navigate = useNavigate();

  const gameAreaDimensions = useMemo(() => {
    if (!gameAreaRef.current) return { width: 0, height: 0 };
    return gameAreaRef.current.getBoundingClientRect();
  }, [gameState]);

  useEffect(() => {
    const mode = gameMode || "easy";
    const newSettings = DIFFICULTY_SETTINGS[mode] || DIFFICULTY_SETTINGS.easy;
    console.log(`🎯 Game mode: ${mode}, Duration: ${newSettings.gameDuration} seconds`);
    setSettings(newSettings);
    setTimeLeft(newSettings.gameDuration);
    console.log(`⏰ Setting timeLeft to: ${newSettings.gameDuration} seconds`);
  }, [gameMode]);

  // Keep the score ref in sync with score state
  useEffect(() => {
    currentScore.current = score;
    console.log(`💰 Score updated: ${score}`);
  }, [score]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      clearInterval(timerIntervalRef.current);
      clearInterval(targetMoveIntervalRef.current);
      closeWebSocket();

      // Disable motors when component unmounts
      disableMotors().catch((error) => {
        console.error("Error disabling motors on unmount:", error);
      });
    };
  }, []);

  useEffect(() => {
    if (!loading && (user === null || user === false)) {
      alert("You must be logged in to play!");
      navigate("/register");
    }
  }, [user, loading, navigate]);

  const setupWebSocket = useCallback(() => {
    try {
      // Handle missing process environment variable
      const wsUrl =
        typeof process !== "undefined" &&
        process.env &&
        process.env.REACT_APP_WS_URL
          ? process.env.REACT_APP_WS_URL
          : "ws://localhost:5000";
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("🔗 WebSocket connection opened successfully");
        const handshakeMessage = {
          type: "identify",
          clientType: "web",
          sessionId: currentSessionId,
          playerName: user?.username || "Guest",
        };
        // Store sessionId in the WebSocket for backend reference
        wsRef.current.sessionId = currentSessionId;
        wsRef.current.send(JSON.stringify(handshakeMessage));
        console.log(
          "🤝 WebSocket connected and session registered:",
          currentSessionId
        );
        console.log("📤 Sent handshake message:", handshakeMessage);
        
        // Test WebSocket by sending a test message after a short delay
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "test_message",
              message: "Frontend WebSocket test",
              timestamp: Date.now()
            }));
            console.log("📤 Sent test message to verify WebSocket");
          }
        }, 1000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageCount.current += 1;
          console.log(`🔌 WebSocket message #${messageCount.current} received:`, data);

          // Priority 1: Handle session-aware hardware hit detection
          if (
            data.type === "hit_registered" &&
            data.sessionId === currentSessionId
          ) {
            console.log("🎯 Session hit - updating score from", score, "to", data.currentScore);
            setScore(data.currentScore);
            totalHardwareHits.current += 1;  // Track hardware hits
            totalShots.current += 1;  // Track total shots
            totalActualHits.current += 1;  // Track actual hits
            console.log(
              "✅ Session hit registered - Score updated to:",
              data.currentScore,
              "Total shots:",
              totalShots.current,
              "Total hits:",
              totalActualHits.current
            );

            // Add visual hit indicator for session hits
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              setHitPositions((prev) => [
                ...prev,
                { x: centerX, y: centerY, id: Date.now() },
              ]);
            }
            return; // Exit early for session hits
          }

          // Priority 2: Handle session-aware hits without matching sessionId (fallback)
          if (
            data.type === "hit_registered" &&
            data.currentScore &&
            !currentSessionId
          ) {
            setScore(data.currentScore);
            totalHardwareHits.current += 1;  // Track hardware hits
            totalShots.current += 1;  // Track total shots
            totalActualHits.current += 1;  // Track actual hits
            console.log(
              "📊 Session hit received (no local session) - Score updated to:",
              data.currentScore,
              "Total shots:",
              totalShots.current,
              "Total hits:",
              totalActualHits.current
            );

            // Add visual hit indicator
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              setHitPositions((prev) => [
                ...prev,
                { x: centerX, y: centerY, id: Date.now() },
              ]);
            }
            return;
          }

          // Priority 3: Handle direct hit messages from hardware (legacy/fallback)
          if (data.type === "target_hit" || data.type === "hit") {
            console.log("🎯 Processing direct hardware hit:", data);
            let points = 0;
            if (data.value === "HIT1") {
              points = 10;
            } else if (data.value === "HIT2") {
              points = 5;
            } else if (data.value === "HIT3") {
              points = 2;
            }
            if (points > 0) {
              totalHardwareHits.current += 1;  // Track hardware hits
              totalShots.current += 1;  // Track total shots
              totalActualHits.current += 1;  // Track actual hits
              setScore((prev) => {
                const newScore = prev + points;
                console.log(`🚀 HIT! ${points} points for ${data.value}. Score: ${prev} → ${newScore}, Total shots:`, totalShots.current, "Total hits:", totalActualHits.current);
                return newScore;
              });
            } else if (
              data.scoreIncrement &&
              typeof data.scoreIncrement === "number"
            ) {
              console.log("💥 Processing scoreIncrement hit:", data.scoreIncrement);
              totalHardwareHits.current += 1;  // Track hardware hits
              totalShots.current += 1;  // Track total shots
              totalActualHits.current += 1;  // Track actual hits
              setScore((prev) => {
                const newScore = prev + data.scoreIncrement;
                console.log(`🚀 SCORE INCREMENT! ${data.scoreIncrement} points. Score: ${prev} → ${newScore}, Total shots:`, totalShots.current, "Total hits:", totalActualHits.current);
                return newScore;
              });
            } else if (data.value === "HIT") {
              totalHardwareHits.current += 1;  // Track hardware hits
              totalShots.current += 1;  // Track total shots
              totalActualHits.current += 1;  // Track actual hits
              setScore((prev) => {
                const newScore = prev + 1;
                console.log("Hardware hit detected, score:", newScore, "Total shots:", totalShots.current, "Total hits:", totalActualHits.current);
                return newScore;
              });
            }
            // Add visual hit indicator
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              setHitPositions((prev) => [
                ...prev,
                { x: centerX, y: centerY, id: Date.now() },
              ]);
              setTimeout(generateTargets, 100);
            }
          }

          // Handle miss messages from hardware
          if (data.type === "target_miss" || data.type === "miss_registered") {
            console.log("❌ Processing hardware miss:", data);
            
            // Count hardware misses as shots for accuracy calculation
            totalShots.current += 1;  // Track total shots (including misses)
            console.log("📊 Hardware miss counted - Total shots:", totalShots.current, "Total hits:", totalActualHits.current);
            
            // Add visual miss indicator
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              setMissPositions((prev) => [
                ...prev,
                { x: centerX, y: centerY, id: Date.now() },
              ]);
            }
          }

          // Handle shot detection from hardware (for tracking accuracy)
          if (data.type === "shot_from_glove") {
            console.log("🔫 Shot detected from hardware:", data);
            // This is just a shot detection, the hit/miss will come in separate messages
            // Don't count it here to avoid double counting
          }

          // Handle count updates
          if (data.type === "count" && data.count !== undefined) {
            setScore(data.count);
          }

          // Handle position-based hits for visual feedback
          if (data.type === "hit" && data.position) {
            setHitPositions((prev) => [
              ...prev,
              {
                x: data.position.x,
                y: data.position.y,
                id: Date.now(),
              },
            ]);
          }

          // Handle game control confirmations
          if (data.type === "command_confirmed" || data.type === "command_executed") {
            console.log("🎮 Game command confirmed:", data);
          }

          // Handle game state updates from hardware
          if (data.type === "game_state_update") {
            console.log("🎮 Game state update from hardware:", data.state);
          }

        } catch (error) {
          console.error("WebSocket JSON error:", error);
        }
      };

      wsRef.current.onclose = () => console.log("WebSocket closed");
      wsRef.current.onerror = (error) =>
        console.error("WebSocket error:", error);
    } catch (error) {
      console.error("WebSocket setup failed:", error);
    }
  }, [currentSessionId, user]);

  const closeWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const generateTargets = useCallback(() => {
    if (!gameAreaRef.current || !isMounted.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const { targetCount, targetSize, targetColors } = settings;
    const newTargets = [];
    const minDistance = targetSize + 10;

    for (let i = 0; i < targetCount; i++) {
      let attempts = 0;
      let validPosition = false;
      let left, top;

      while (!validPosition && attempts < 20) {
        left = Math.random() * (rect.width - targetSize);
        top = Math.random() * (rect.height - targetSize);
        validPosition = newTargets.every((target) => {
          const distance = Math.hypot(left - target.left, top - target.top);
          return distance >= minDistance;
        });
        attempts++;
      }

      newTargets.push({
        id: `target-${Date.now()}-${i}`,
        left,
        top,
        color: targetColors[i % targetColors.length],
        size: targetSize,
        createdAt: Date.now(),
      });
    }

    if (isMounted.current) setTargets(newTargets);
  }, [settings]);



  // Countdown then start game
 const startGameWithCountdown = useCallback(() => {
  let count = 5;
  setCountdown(count);
  const countdownInterval = setInterval(() => {
    if (count > 1) {
      count--;
      setCountdown(count);
    } else {
      clearInterval(countdownInterval);
      setCountdown('FIRE'); // Display "FIRE"
      setTimeout(() => {
        setCountdown(null); // Clear the countdown
        actuallyStartGame(); // Start the game immediately after 4 seconds of blinking
      }, 4000); // Keep "FIRE" blinking for 4 seconds
    }
  }, 1000);
}, []);


  // FIXED: Added actuallyStartGame to dependencies
  const actuallyStartGame = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      // Create game session first
      console.log("Creating game session...");
      const sessionResponse = await createGameSession({
        playerName: user?.username || "Guest",
        gameMode: gameMode || "easy",
        userId: user?.id || user?._id
      });

      if (sessionResponse.ok) {
        setCurrentSessionId(sessionResponse.data.sessionId);
        console.log("Game session created:", sessionResponse.data.sessionId);
      } else {
        console.warn("Failed to create game session:", sessionResponse.error);
      }

      // Enable motors when game starts
      console.log("Enabling motors for game mode:", gameMode);
      const modeToSend = gameMode || "easy";
      
      // Send game start command to hardware
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "game_start",
          gameMode: modeToSend,
          timestamp: Date.now()
        }));
        console.log("Sent game_start command to hardware");
      }

      const motorResponse = await enableMotors(modeToSend);
      if (motorResponse.ok) {
        console.log("Motors enabled successfully:", motorResponse.data);
      } else {
        console.warn("Failed to enable motors:", motorResponse.error);
      }
    } catch (error) {
      console.error("Error starting game:", error);
    }

    setGameState("playing");
    setScore(0);
    console.log("🎮 Game started - Score reset to 0");
    // timeLeft is already set correctly by the useEffect when gameMode changes
    totalClicks.current = 0;
    totalHardwareHits.current = 0;  // Reset hardware hits counter
    totalShots.current = 0;  // Reset total shots counter
    totalActualHits.current = 0;  // Reset actual hits counter
    setHitPositions([]);
    setMissPositions([]);
    gameStartTime.current = Date.now();
    generateTargets();
    setupWebSocket();

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          // Use a timeout to ensure all state updates are complete
          setTimeout(() => {
            console.log(`⏰ Timer ended - calling endGame with score: ${currentScore.current}`);
            endGame();
          }, 100);
          return 0;
        }

        // ▶️ Play countdown at 6 seconds to align with 5s display
        if (prev === 6 && countdownAudioRef.current) {
          countdownAudioRef.current.play().catch((err) => {
            console.warn("Countdown audio failed to play:", err);
          });
        }

        return prev - 1;
      });
    }, GAME_CONSTANTS.TIMER_INTERVAL);

    targetMoveIntervalRef.current = setInterval(() => {
      if (isMounted.current) generateTargets();
    }, settings.targetSpeed);
  }, [settings, generateTargets, gameMode, setupWebSocket, user]);

  const calculateGameStats = useCallback(
    (finalScore, totalClicksCount, timePlayed) => {
      // Use the actual total shots counter which includes hits and misses
      const totalShotsCount = totalShots.current;
      
      // Calculate accuracy: (total actual hits / total shots) * 100
      // Total actual hits = totalActualHits.current, Total shots = totalShots.current (includes all attempts)
      const accuracy = totalShotsCount > 0 ? (totalActualHits.current / totalShotsCount) * 100 : 0;
      
      // Calculate hits per second using actual hits and time played
      const hitsPerSecond = timePlayed > 0 ? totalActualHits.current / timePlayed : 0;
      
      console.log("📊 Game Stats Calculation:");
      console.log("  Final Score:", finalScore);
      console.log("  Frontend Clicks:", totalClicksCount);
      console.log("  Hardware Hits:", totalHardwareHits.current);
      console.log("  Total Shots (from counter):", totalShotsCount);
      console.log("  Total Actual Hits:", totalActualHits.current);
      console.log("  Time Played:", timePlayed, "seconds");
      console.log("  Accuracy:", accuracy.toFixed(2) + "%");
      console.log("  Hits per Second:", hitsPerSecond.toFixed(2));
      
      return {
        accuracy,
        hitsPerSecond,
        totalClicks: totalClicksCount,
        totalHits: totalActualHits.current,  // Use actual hit count instead of score
        totalShots: totalShotsCount,
        hardwareHits: totalHardwareHits.current,
      };
    },
    [] // Remove timeLeft dependency since we're passing timePlayed directly
  );

  const submitGameScore = useCallback(
    async (finalScore, stats, timePlayedOverride) => {
      if (!isMounted.current) return;
      setIsLoading(true);
      try {
        // Defensive: handle missing user gracefully
        const userId =
          user && (user.id || user._id) ? user.id || user._id : null;
        const username = user && user.username ? user.username : "Guest";
        
        const scoreData = {
          user: userId,
          username: username,
          score: finalScore,
          accuracy: stats.accuracy,
          gameMode: gameMode || "easy",
          timePlayed:
            typeof timePlayedOverride === "number"
              ? timePlayedOverride
              : settings.gameDuration,
        };
        
        console.log("🚀 Submitting score data:", scoreData);
        const response = await submitScore(scoreData);
        
        if (response.ok) {
          console.log("✅ Score submitted successfully:", response.data);
        } else {
          console.error("❌ Submit failed:", response.error);
        }
      } catch (err) {
        console.error("Submit error:", err);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [user, gameMode, settings.gameDuration]
  );

  const endGame = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      // Send game stop command to hardware
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "game_stop",
          timestamp: Date.now()
        }));
        console.log("Sent game_stop command to hardware");
      }

      // End the game session if one exists
      if (currentSessionId) {
        console.log("Ending game session:", currentSessionId);
        const endSessionResponse = await endGameSession(currentSessionId);

        if (endSessionResponse.ok) {
          console.log(
            "Game session ended successfully:",
            endSessionResponse.data
          );
        } else {
          console.warn("Failed to end game session:", endSessionResponse.error);
        }
        setCurrentSessionId(null);
      }

      // Disable motors when game ends
      console.log("Disabling motors...");
      const motorResponse = await disableMotors();

      if (motorResponse.ok) {
        console.log("Motors disabled successfully:", motorResponse.data);
      } else {
        console.warn("Failed to disable motors:", motorResponse.error);
      }
    } catch (error) {
      console.error("Error in game cleanup:", error);
    }

    clearInterval(timerIntervalRef.current);
    clearInterval(targetMoveIntervalRef.current);
    closeWebSocket();
    setGameState("finished");
    
    // Calculate actual time played using game start time
    const gameEndTime = Date.now();
    const timePlayed = gameStartTime.current ? (gameEndTime - gameStartTime.current) / 1000 : settings.gameDuration - timeLeft;
    
    console.log("🎯 Game End Calculation:");
    console.log("  Game Start Time:", gameStartTime.current ? new Date(gameStartTime.current).toISOString() : "Not set");
    console.log("  Game End Time:", new Date(gameEndTime).toISOString());
    console.log("  Calculated Time Played:", timePlayed, "seconds");
    console.log("  Final Score (from state):", score);
    console.log("  Final Score (from ref):", currentScore.current);
    console.log("  Using score:", currentScore.current);
    console.log("  Total Clicks:", totalClicks.current);
    console.log("  Total Hardware Hits:", totalHardwareHits.current);
    console.log("  Total Actual Hits:", totalActualHits.current);
    
    const finalScore = currentScore.current; // Use the ref value instead of state
    const finalStats = calculateGameStats(
      finalScore,
      totalClicks.current,
      timePlayed
    );
    setGameStats(finalStats);
    if (!user || !(user.id || user._id)) {
      alert("You must be logged in to save your score!");
      localStorage.setItem("leaderboardRefresh", Date.now().toString());
      return;
    }
    submitGameScore(finalScore, finalStats, timePlayed).then(() => {
      if (setNeedsRefresh) setNeedsRefresh(true);
      localStorage.setItem("leaderboardRefresh", Date.now().toString());
    });
  }, [
    score,
    settings.gameDuration,
    timeLeft,
    calculateGameStats,
    user,
    setNeedsRefresh,
    submitGameScore,
    currentSessionId,
  ]);

  // FIXED: Pause game function with proper WebSocket commands
  const pauseGame = useCallback(async () => {
    console.log("=== pauseGame CALLED ===");
    console.log("Current gameState:", gameState);
    console.log("isPausing:", isPausing);
    console.log("Timestamp:", new Date().toISOString());

    // Prevent multiple rapid calls
    if (isPausing) {
      console.log("pauseGame already processing, ignoring call");
      return;
    }

    setIsPausing(true);

    try {
      if (gameState === "playing") {
        console.log("Pausing game...");

        // Send pause command to hardware
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "game_pause",
            timestamp: Date.now()
          }));
          console.log("Sent game_pause command to hardware");
        }

        try {
          console.log("Pausing game - Screen Handling...");
          const pauseResponse = await pauseGameAPI();
          if (pauseResponse.ok) {
            console.log("Game Paused:", pauseResponse.data);
          } else {
            console.warn("Failed to pause game:", pauseResponse.error);
          }
        } catch (error) {
          console.error("Error pausing game:", error);
        }

        // Disable motors when pausing
        try {
          console.log("Pausing game - disabling motors...");
          const motorResponse = await disableMotors();
          if (motorResponse.ok) {
            console.log("Motors disabled for pause:", motorResponse.data);
          } else {
            console.warn(
              "Failed to disable motors on pause:",
              motorResponse.error
            );
          }
        } catch (error) {
          console.error("Error disabling motors on pause:", error);
        }

        clearInterval(timerIntervalRef.current);
        clearInterval(targetMoveIntervalRef.current);
        setGameState("paused");
      } else if (gameState === "paused") {
        console.log("Resuming game...");

        // Send resume command to hardware
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "game_resume",
            gameMode: gameMode || "easy",
            timestamp: Date.now()
          }));
          console.log("Sent game_resume command to hardware");
        }

        // Re-enable motors when resuming
        try {
          console.log("Resuming game - enabling motors...");
          const motorResponse = await enableMotors(gameMode || "easy");

          if (motorResponse.ok) {
            console.log("Motors enabled for resume:", motorResponse.data);
          } else {
            console.warn(
              "Failed to enable motors on resume:",
              motorResponse.error
            );
          }
        } catch (error) {
          console.error("Error enabling motors on resume:", error);
        }

        setGameState("playing");
        timerIntervalRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              endGame();
              return 0;
            }
            return prev - 1;
          });
        }, GAME_CONSTANTS.TIMER_INTERVAL);

        targetMoveIntervalRef.current = setInterval(() => {
          if (isMounted.current) generateTargets();
        }, settings.targetSpeed);
      }
    } catch (error) {
      console.error("Error in pauseGame:", error);
    } finally {
      // Always reset the processing flag after a short delay
      setTimeout(() => {
        setIsPausing(false);
      }, 500);
    }
  }, [
    gameState,
    settings.targetSpeed,
    generateTargets,
    gameMode,
    endGame,
    isPausing,
  ]);

  const handleGameAreaClick = useCallback(
    (e) => {
      if (gameState !== "playing" || !gameAreaRef.current) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Track frontend clicks
      totalClicks.current += 1;
      totalShots.current += 1;  // Add to total shots count

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "click",
            position: { x, y },
            timestamp: Date.now(),
          })
        );
      }

      let hit = false;
      targets.forEach((target) => {
        const dx = x - (target.left + target.size / 2);
        const dy = y - (target.top + target.size / 2);
        if (dx * dx + dy * dy <= (target.size / 2) ** 2) {
          hit = true;
          totalActualHits.current += 1;  // Track actual hits from frontend clicks
          setHitPositions((prev) => [...prev, { x, y, id: Date.now() }]);
          setScore((prev) => prev + 1);
        }
      });

      if (!hit) {
        setMissPositions((prev) => [...prev, { x, y, id: Date.now() }]);
      }

      if (hit) {
        setTimeout(() => {
          if (isMounted.current) generateTargets();
        }, GAME_CONSTANTS.TARGET_SPAWN_DELAY);
      }
    },
    [gameState, targets, generateTargets]
  );

  const playAgain = useCallback(async () => {
    setShowFinal(true);
    setFinalPageStart(false);
    setGameState("ready");
    
    // Send reset command to hardware
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "game_reset",
        timestamp: Date.now()
      }));
      console.log("Sent game_reset command to hardware");
    }

    try {
      console.log("Play Again - Screen Handling...");
      const playAgainResponse = await playAgainAPI();
      if (playAgainResponse.ok) {
        console.log("Game Play Again:", playAgainResponse.data);
      } else {
        console.warn("Failed to Play Again game:", playAgainResponse.error);
      }
    } catch (error) {
      console.error("Error in play again:", error);
    }
  }, []);

  // FIXED: Properly declared handleStart function
  const handleStart = useCallback(async () => {
    setShowFinal(false);
    setFinalPageStart(true);
    // Start the countdown after a brief delay
    setTimeout(() => {
      startGameWithCountdown();
    }, 100);

    try {
      console.log("Play Again - Screen Handling...");
      const playAgainResponse = await startGame();
      if (playAgainResponse.ok) {
        console.log("Game Play Again:", playAgainResponse.data);
      } else {
        console.warn("Failed to Play Again game:", playAgainResponse.error);
      }
    } catch (error) {
      console.error("Error in play again:", error);
    }

  }, [startGameWithCountdown]);

  const FinalPage = React.useMemo(
    () => React.lazy(() => import("./FinalPage")),
    []
  );

  // FIXED: Clean up hit and miss position arrays periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setHitPositions(prev => prev.filter(hit => now - hit.id < 2000)); // Remove after 2 seconds
      setMissPositions(prev => prev.filter(miss => now - miss.id < 2000)); // Remove after 2 seconds
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Main render block
  return (
    <>
      {showFinal && !finalPageStart ? (
        <React.Suspense
          fallback={
            <div className="game-loading-fallback">Loading game page...</div>
          }
        >
          <FinalPage onStart={handleStart} score={score} timeLeft={timeLeft} />
        </React.Suspense>
      ) : countdown !== null ? (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <h1 className="countdown-number">{countdown}</h1>
          </div>
        </div>
      ) : gameState === "playing" ? (
        <div className="game-container">
          <div className="game-header">
            <GameInfoPanel
              score={score}
              gameMode={gameMode}
              timeLeft={timeLeft}
            />
            <div className="game-controls">
              <button
                className="control-btn pause-btn"
                onClick={pauseGame}
                disabled={isPausing}
                style={{ opacity: isPausing ? 0.7 : 1 }}
              >
                <span className="btn-icon">{isPausing ? "⏳" : "⏸"}</span>
                <span className="btn-text">
                  {isPausing ? "Pausing..." : "Pause"}
                </span>
              </button>
              <button className="control-btn quit-btn" onClick={endGame}>
                <span className="btn-icon">✕</span>
                <span className="btn-text">Quit</span>
              </button>
            </div>
          </div>

          <div
            className="game-area"
            ref={gameAreaRef}
            onClick={handleGameAreaClick}
          >
            <div className="game-area-overlay">
              <div className="crosshair"></div>
            </div>
            {targets.map((target) => (
              <Target
                key={target.id}
                color={target.color}
                style={{
                  position: "absolute",
                  left: target.left,
                  top: target.top,
                  width: target.size,
                  height: target.size,
                }}
              />
            ))}
            {hitPositions.map((hit) => (
              <div
                key={hit.id}
                className="hit-indicator"
                style={{ left: hit.x, top: hit.y }}
              >
                <div className="hit-ripple"></div>
              </div>
            ))}
            {missPositions.map((miss) => (
              <div
                key={miss.id}
                className="miss-indicator"
                style={{ left: miss.x, top: miss.y }}
              >
                <div className="miss-cross"></div>
              </div>
            ))}
          </div>
        </div>
      ) : gameState === "paused" ? (
        <div className="game-container">
          <div className="pause-overlay">
            <div className="pause-content">
              <h2 className="pause-title">Game Paused</h2>
              <div className="pause-buttons">
                <button
                  className="pause-action-btn resume-btn"
                  onClick={pauseGame}
                  disabled={isPausing}
                  style={{ opacity: isPausing ? 0.7 : 1 }}
                >
                  <span className="btn-icon">{isPausing ? "⏳" : "▶"}</span>
                  <span className="btn-text">
                    {isPausing ? "Resuming..." : "Resume"}
                  </span>
                </button>
                <button className="pause-action-btn quit-btn" onClick={endGame}>
                  <span className="btn-icon">✕</span>
                  <span className="btn-text">Quit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : gameState === "finished" ? (
        <div className="game-container">
          <div className="game-over-overlay">
            <div className="game-over-content">
              <div className="final-score-display">
                <h1 className="final-score-text">Final Score: {score}</h1>
              </div>

              <div className="game-over-header">
                <h2 className="game-over-title">Game Over!</h2>
              </div>

              <div className="game-results">
                <div className="result-item">
                  <span className="result-label">Player:</span>
                  <span className="result-value">
                    {user?.username || "Guest"}
                  </span>
                </div>
                <div className="result-item">
                  <span className="result-label">Game Mode:</span>
                  <span className="result-value">{gameMode || "easy"}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Score:</span>
                  <span className="result-value">{score}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Accuracy:</span>
                  <span className="result-value">
                    {gameStats.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="result-item">
                  <span className="result-label">Hits per Second:</span>
                  <span className="result-value">
                    {gameStats.hitsPerSecond.toFixed(2)}
                  </span>
                </div>
                <div className="result-item">
                  <span className="result-label">Total Hits:</span>
                  <span className="result-value">{gameStats.totalHits}</span>
                </div>
              </div>

              <button className="play-again-btn" onClick={playAgain}>
                <span className="btn-icon">🔄</span>
                <span className="btn-text">Play Again</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default PlayPage;