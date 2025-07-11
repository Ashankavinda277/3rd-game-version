import React, { createContext, useState, useContext } from 'react';

// Create context
const GameContext = createContext();

// Context Provider component

export const GameProvider = ({ children }) => {
  // Loading state for context hydration
  const [loading, setLoading] = useState(true);
  // User state (persisted in localStorage)
  const [user, setUserState] = useState(undefined);
  // Game mode state (persisted in localStorage)
  const [gameMode, setGameModeState] = useState(undefined);
  // Game settings state based on mode
  const [gameSettings, setGameSettings] = useState(null);
  // Game scores
  const [scores, setScores] = useState([]);
  // Global refresh flag for leaderboard/progress
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Hydrate user and gameMode from localStorage on mount
  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      setUserState(storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : null);
      const storedMode = localStorage.getItem('gameMode');
      setGameModeState(storedMode && storedMode !== 'undefined' ? JSON.parse(storedMode) : null);
    } catch {
      setUserState(null);
      setGameModeState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist user to localStorage on change
  const setUser = (userObj) => {
    setUserState(userObj);
    if (userObj) {
      localStorage.setItem('user', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('user');
    }
  };

  const setGameMode = (mode) => {
    setGameModeState(mode);
    if (mode) {
      localStorage.setItem('gameMode', JSON.stringify(mode));
    } else {
      localStorage.removeItem('gameMode');
    }
  };

  // Context value
  const value = {
    // User information
    user,
    setUser,
    // Game mode
    gameMode,
    setGameMode,
    // Game settings
    gameSettings,
    setGameSettings,
    // Scores
    scores,
    setScores,
    // Refresh flag
    needsRefresh,
    setNeedsRefresh,
    // Loading state
    loading
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Custom hook for using the game context
export const useGameContext = () => {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  
  return context;
};
