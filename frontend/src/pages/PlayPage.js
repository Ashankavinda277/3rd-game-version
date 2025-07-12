import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/PlayPage.css';
import { useGameContext } from '../contexts/GameContext';
import Target from '../components/common/Target';
import { submitScore } from '../services/api';
import Loader from '../components/common/Loader';

// Constants
const GAME_CONSTANTS = {
  HIT_ANIMATION_DELAY: 100,
  TARGET_SPAWN_DELAY: 100,
  TIMER_INTERVAL: 1000,
  RED_TIME_THRESHOLD: 10,
  BLINK_TIME_THRESHOLD: 5
};

const DIFFICULTY_SETTINGS = {
  easy: {
    gameDuration: 90,
    targetSpeed: 1500,
    targetSize: 80,
    targetCount: 1,
    targetColors: ['#27ae60']
  },
  medium: {
    gameDuration: 60,
    targetSpeed: 1200,
    targetSize: 70,
    targetCount: 2,
    targetColors: ['#2ecc71', '#e67e22']
  },
  hard: {
    gameDuration: 45,
    targetSpeed: 800,
    targetSize: 60,
    targetCount: 3,
    targetColors: ['#e74c3c', '#3498db', '#e67e22']
  }
};

// Enhanced Game Info Component
const GameInfoPanel = ({ score, gameMode, timeLeft }) => {
  const isRed = timeLeft <= GAME_CONSTANTS.RED_TIME_THRESHOLD;
  const shouldBlink = timeLeft <= GAME_CONSTANTS.BLINK_TIME_THRESHOLD;
  
  return (
    <div className="game-info-panel">
      <div className="info-card score-card">
        <div className="info-label">Score</div>
        <div className="info-value score-value">{score}</div>
      </div>
      <div className="info-card mode-card">
        <div className="info-label">Mode</div>
        <div className="info-value mode-value">{gameMode || 'easy'}</div>
      </div>
      <div className="info-card time-card">
        <div className="info-label">Time Left</div>
        <div className={`info-value time-value ${isRed ? 'red' : ''} ${shouldBlink ? 'blink' : ''}`}>
          {timeLeft}s
        </div>
      </div>
    </div>
  );
};

const PlayPage = () => {
  const { user, gameMode, gameSettings, setNeedsRefresh, loading } = useGameContext();
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [targets, setTargets] = useState([]);
  const [hitPositions, setHitPositions] = useState([]);
  const [missPositions, setMissPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(DIFFICULTY_SETTINGS.easy);
  const [gameStats, setGameStats] = useState({
    accuracy: 0,
    hitsPerSecond: 0,
    totalClicks: 0,
    totalHits: 0,
  });

  const gameAreaRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const targetMoveIntervalRef = useRef(null);
  const totalClicks = useRef(0);
  const isMounted = useRef(true);
  const gameStartTime = useRef(null);
  const wsRef = useRef(null);

  const navigate = useNavigate();

  // Only redirect if user is explicitly null/false, not undefined (undefined = still loading)
  React.useEffect(() => {
    if (!loading && (user === null || user === false)) {
      alert('You must be logged in to play!');
      navigate('/register');
    }
  }, [user, loading, navigate]);

  // If context is still loading, show loader
  if (loading) return <Loader />;

  const gameAreaDimensions = useMemo(() => {
    if (!gameAreaRef.current) return { width: 0, height: 0 };
    return gameAreaRef.current.getBoundingClientRect();
  }, [gameState]);

  useEffect(() => {
    const mode = gameMode || 'easy';
    const newSettings = DIFFICULTY_SETTINGS[mode] || DIFFICULTY_SETTINGS.easy;
    setSettings(newSettings);
    setTimeLeft(newSettings.gameDuration);
  }, [gameMode]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      clearInterval(timerIntervalRef.current);
      clearInterval(targetMoveIntervalRef.current);
      closeWebSocket();
    };
  }, []);

  const setupWebSocket = () => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        const handshakeMessage = {
          type: "identify",
          clientType: "web",
          sessionId: user?.id || "guest_" + Date.now(),
          playerName: user?.username || "Guest"
        };
        wsRef.current.send(JSON.stringify(handshakeMessage));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'count' && data.count !== undefined) {
            setScore(data.count);
          }

          if (data.type === 'hit' && data.value === 'HIT') {
            setScore(prev => prev + 1);
            const rect = gameAreaRef.current?.getBoundingClientRect();
            if (rect) {
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              setHitPositions(prev => [...prev, { x: centerX, y: centerY, id: Date.now() }]);
              setTimeout(generateTargets, 100);
            }
          }

          if (data.type === 'target_hit' && typeof data.scoreIncrement === 'number') {
            setScore(prev => prev + data.scoreIncrement);
          }

          if (data.type === 'hit_registered' && data.hitData && typeof data.hitData.scoreIncrement === 'number') {
            setScore(prev => prev + data.hitData.scoreIncrement);
          }

          if (data.type === 'hit' && data.position) {
            setHitPositions(prev => [...prev, {
              x: data.position.x,
              y: data.position.y,
              id: Date.now()
            }]);
          }
        } catch (error) {
          console.error('WebSocket JSON error:', error);
        }
      };

      wsRef.current.onclose = () => console.log('WebSocket closed');
      wsRef.current.onerror = (error) => console.error('WebSocket error:', error);

    } catch (error) {
      console.error('WebSocket setup failed:', error);
    }
  };

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
        validPosition = newTargets.every(target => {
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
        createdAt: Date.now()
      });
    }

    if (isMounted.current) setTargets(newTargets);
  }, [settings]);

  const startGame = useCallback(() => {
    if (!isMounted.current) return;
    setGameState('playing');
    setScore(0);
    setTimeLeft(settings.gameDuration);
    totalClicks.current = 0;
    setHitPositions([]);
    setMissPositions([]);
    gameStartTime.current = Date.now();
    generateTargets();
    setupWebSocket();

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
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
  }, [settings, generateTargets]);

  const pauseGame = useCallback(() => {
    if (gameState === 'playing') {
      clearInterval(timerIntervalRef.current);
      clearInterval(targetMoveIntervalRef.current);
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
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
  }, [gameState, settings.targetSpeed, generateTargets]);

  const calculateGameStats = useCallback((finalScore, totalClicksCount, gameDuration) => {
    const accuracy = totalClicksCount > 0 ? (finalScore / totalClicksCount) * 100 : 0;
    const timeElapsed = gameDuration - timeLeft;
    const hitsPerSecond = timeElapsed > 0 ? finalScore / timeElapsed : 0;
    return { accuracy, hitsPerSecond, totalClicks: totalClicksCount, totalHits: finalScore };
  }, [timeLeft]);

  const submitGameScore = useCallback(async (finalScore, stats, timePlayedOverride) => {
    if (!isMounted.current) return;
    setIsLoading(true);
    try {
      // Defensive: handle missing user gracefully
      const userId = user && (user.id || user._id) ? (user.id || user._id) : null;
      const username = user && user.username ? user.username : 'Guest';
      const response = await submitScore({
        user: userId,
        username: username,
        score: finalScore,
        accuracy: stats.accuracy,
        gameMode: gameMode || 'easy',
        timePlayed: typeof timePlayedOverride === 'number' ? timePlayedOverride : settings.gameDuration
      });
      if (!response.ok) console.error('Submit failed:', response.error);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [user, gameMode, settings.gameDuration]);

  const endGame = useCallback(() => {
    if (!isMounted.current) return;
    clearInterval(timerIntervalRef.current);
    clearInterval(targetMoveIntervalRef.current);
    closeWebSocket();
    setGameState('finished');
    // Calculate actual time played if quitting early
    const timePlayed = settings.gameDuration - timeLeft;
    const finalStats = calculateGameStats(score, totalClicks.current, timePlayed);
    setGameStats(finalStats);
    if (!user || !(user.id || user._id)) {
      alert('You must be logged in to save your score!');
      localStorage.setItem('leaderboardRefresh', Date.now().toString());
      return;
    }
    submitGameScore(score, finalStats, timePlayed).then(() => {
      if (setNeedsRefresh) setNeedsRefresh(true);
      localStorage.setItem('leaderboardRefresh', Date.now().toString());
    });
  }, [score, settings.gameDuration, timeLeft, calculateGameStats, user, setNeedsRefresh, submitGameScore]);

  const handleGameAreaClick = useCallback((e) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    totalClicks.current += 1;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'click',
        position: { x, y },
        timestamp: Date.now()
      }));
    }

    let hit = false;
    targets.forEach(target => {
      const dx = x - (target.left + target.size / 2);
      const dy = y - (target.top + target.size / 2);
      if (dx * dx + dy * dy <= (target.size / 2) ** 2) {
        hit = true;
        setHitPositions(prev => [...prev, { x, y, id: Date.now() }]);
        setScore(prev => prev + 1);
      }
    });

    if (!hit) {
      setMissPositions(prev => [...prev, { x, y, id: Date.now() }]);
    }

    if (hit) {
      setTimeout(() => {
        if (isMounted.current) generateTargets();
      }, GAME_CONSTANTS.TARGET_SPAWN_DELAY);
    }
  }, [gameState, targets, generateTargets]);

  // Show FinalPage after game mode selection, and navigate to PlayPage on Start
  const [showFinal, setShowFinal] = useState(true);
  const [finalPageStart, setFinalPageStart] = useState(false);
  const FinalPage = React.useMemo(() => React.lazy(() => import('./FinalPage')), []);

  // Main render block
  return (
    <>
      {showFinal && !finalPageStart ? (
        <React.Suspense fallback={<div className="game-loading-fallback">Loading game page...</div>}>
          <FinalPage
            onStart={() => {
              setShowFinal(false);
              setFinalPageStart(true);
              setTimeout(() => {
                startGame();
              }, 0);
            }}
            score={score}
            timeLeft={timeLeft}
          />
        </React.Suspense>
      ) : gameState === 'playing' ? (
        <div className="game-container">
          <div className="game-header">
            <GameInfoPanel 
              score={score} 
              gameMode={gameMode} 
              timeLeft={timeLeft} 
            />
            <div className="game-controls">
              <button className="control-btn pause-btn" onClick={pauseGame}>
                <span className="btn-icon">⏸</span>
                <span className="btn-text">Pause</span>
              </button>
              <button className="control-btn quit-btn" onClick={endGame}>
                <span className="btn-icon">✕</span>
                <span className="btn-text">Quit</span>
              </button>
            </div>
          </div>
          
          <div className="game-area" ref={gameAreaRef} onClick={handleGameAreaClick}>
            <div className="game-area-overlay">
              <div className="crosshair"></div>
            </div>
            {targets.map(target => (
              <Target
                key={target.id}
                color={target.color}
                style={{
                  position: 'absolute',
                  left: target.left,
                  top: target.top,
                  width: target.size,
                  height: target.size
                }}
              />
            ))}
            {hitPositions.map(hit => (
              <div key={hit.id} className="hit-indicator" style={{ left: hit.x, top: hit.y }}>
                <div className="hit-ripple"></div>
              </div>
            ))}
            {missPositions.map(miss => (
              <div key={miss.id} className="miss-indicator" style={{ left: miss.x, top: miss.y }}>
                <div className="miss-cross"></div>
              </div>
            ))}
          </div>
        </div>
      ) : gameState === 'paused' ? (
        <div className="game-container">
          <div className="pause-overlay">
            <div className="pause-content">
              <h2 className="pause-title">Game Paused</h2>
              <div className="pause-buttons">
                <button className="pause-action-btn resume-btn" onClick={pauseGame}>
                  <span className="btn-icon">▶</span>
                  <span className="btn-text">Resume</span>
                </button>
                <button className="pause-action-btn quit-btn" onClick={endGame}>
                  <span className="btn-icon">✕</span>
                  <span className="btn-text">Quit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : gameState === 'finished' ? (
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
                  <span className="result-value">{user?.username || 'Guest'}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Game Mode:</span>
                  <span className="result-value">{gameMode || 'easy'}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Score:</span>
                  <span className="result-value">{score}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Accuracy:</span>
                  <span className="result-value">{gameStats.accuracy.toFixed(1)}%</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Hits per Second:</span>
                  <span className="result-value">{gameStats.hitsPerSecond.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Total Hits:</span>
                  <span className="result-value">{gameStats.totalHits}</span>
                </div>
              </div>
              
              <button
                className="play-again-btn"
                onClick={() => {
                  setShowFinal(true);
                  setFinalPageStart(false);
                  setGameState('ready');
                }}
              >
                <span className="btn-icon">🔄</span>
                <span className="btn-text">Play Again</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default PlayPage;