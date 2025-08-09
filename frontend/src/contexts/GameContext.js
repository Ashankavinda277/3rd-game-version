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
      const parsedUser = storedUser && storedUser !== 'undefined' ? JSON.parse(storedUser) : null;
      console.log('🏁 GameContext: Loaded user from localStorage:', parsedUser);
      setUserState(parsedUser);
      
      const storedMode = localStorage.getItem('gameMode');
      const parsedMode = storedMode && storedMode !== 'undefined' ? JSON.parse(storedMode) : null;
      console.log('🏁 GameContext: Loaded gameMode from localStorage:', parsedMode);
      setGameModeState(parsedMode);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
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
    console.log(`🔄 GameContext: Setting gameMode to: ${mode}`);
    setGameModeState(mode);
    if (mode) {
      localStorage.setItem('gameMode', JSON.stringify(mode));
      console.log(`💾 GameContext: Saved gameMode to localStorage: ${mode}`);
    } else {
      localStorage.removeItem('gameMode');
      console.log(`🗑️ GameContext: Removed gameMode from localStorage`);
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
