import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/LeaderboardPage.css';
import { fetchLeaderboard } from '../services/api';
import Loader from '../components/common/Loader';
import { useGameContext } from '../contexts/GameContext';

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMode, setActiveMode] = useState('all');
  const navigate = useNavigate();
  const { gameMode, needsRefresh, setNeedsRefresh } = useGameContext();
  
  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetchLeaderboard(activeMode);
        if (response.ok) {
          // Support both {scores: [...]} and direct array
       const scores = Array.isArray(response.data)
  ? response.data
  : (response.data?.scores || response.data?.data?.scores || []);
          setLeaderboardData(scores);
        } else {
          setError(response.error || 'Failed to load leaderboard data');
        }
      } catch (err) {
        console.error('Leaderboard loading error:', err);
        setError('Error connecting to server');
      } finally {
        setIsLoading(false);
        if (needsRefresh && setNeedsRefresh) setNeedsRefresh(false);
      }
    };

    // Listen for leaderboard refresh trigger from PlayPage
    const handleStorage = (e) => {
      if (e.key === 'leaderboardRefresh') {
        loadLeaderboard();
      }
    };
    window.addEventListener('storage', handleStorage);
    loadLeaderboard();
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeMode, needsRefresh, setNeedsRefresh]);
  
  const handleModeChange = (mode) => {
    setActiveMode(mode);
  };
  
  return (
    <div className="leaderboard-wrapper">
      <div className="leaderboard-header-section">
        <h1 className="leaderboard-title">LEADERBOARD</h1>
        <div className="leaderboard-mode-toggle">
          <button 
            className={`leaderboard-mode-button ${activeMode === 'all' ? 'active' : ''}`}
            onClick={() => handleModeChange('all')}
          >
            All Modes
          </button>
          <button 
            className={`leaderboard-mode-button ${activeMode === 'easy' ? 'active' : ''}`}
            onClick={() => handleModeChange('easy')}
          >
            Easy
          </button>
          <button 
            className={`leaderboard-mode-button ${activeMode === 'medium' ? 'active' : ''}`}
            onClick={() => handleModeChange('medium')}
          >
            Medium
          </button>
          <button 
            className={`leaderboard-mode-button ${activeMode === 'hard' ? 'active' : ''}`}
            onClick={() => handleModeChange('hard')}
          >
            Hard
          </button>
        </div>
      </div>
      
      <div className="leaderboard-content-section">
        {isLoading ? (
          <div className="leaderboard-loader-wrapper">
            <Loader />
          </div>
        ) : error ? (
          <div className="leaderboard-error-message">{error}</div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
                <th>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.length > 0 ? (
                leaderboardData.map((entry, index) => (
                  <tr key={entry._id || entry.id || index}>
                    <td>{index + 1}</td>
                    <td>{entry.user && entry.user.username ? entry.user.username : 'Unknown'}</td>
                    <td>{entry.score}</td>
                    <td>{entry.gameMode}</td>
                    <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ''}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No scores available yet</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="leaderboard-buttons-section">
        <button className="leaderboard-button" onClick={() => navigate('/final-page')}>Back to Menu</button>
        <button className="leaderboard-button" onClick={() => navigate('/play')}>Play Again</button>
      </div>
    </div>
  );
};

export default LeaderboardPage;
