import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/PlayerProgressPage.css';
import { fetchPlayerProgress, fetchUserScores } from '../services/api';
import { useGameContext } from '../contexts/GameContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import Loader from '../components/common/Loader';

const PlayerProgressPage = () => {
  const [progressData, setProgressData] = useState({
    games: [],
    totalGames: 0,
    averageScore: 0,
    highestScore: 0,
    preferredMode: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const navigate = useNavigate();
  const { user, needsRefresh, setNeedsRefresh } = useGameContext();
  const { isConnected, lastMessage } = useWebSocket();
  
  useEffect(() => {
    // Handle incoming ESP8266 data
    if (lastMessage && lastMessage.type === 'esp8266_data') {
      setSensorData(lastMessage.data);
    }
  }, [lastMessage]);
  
  useEffect(() => {
    const loadUserScores = async () => {
      let finished = false;
      try {
        if (!user?._id) {
          setError('User not authenticated');
          setIsLoading(false);
          finished = true;
          return;
        }
        const response = await fetchUserScores(user._id);
        if (response.ok) {
          const scores = response.data?.scores || response.data?.data?.scores || [];
          // Map and sort all games by date descending
          const allGames = scores
            .map(s => ({
              id: s._id,
              score: Number(s.score) || 0,
              mode: s.gameMode || 'Unknown',
              accuracy: Number(s.accuracy) || 0,
              duration: Number(s.timePlayed) || 0,
              date: s.createdAt
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          const newestGames = allGames.slice(0, 10);
          const totalGames = allGames.length; // All games, not just newest 10
          const highestScore = allGames.length > 0 ? allGames.reduce((max, g) => Math.max(max, g.score), 0) : 0;
          const averageScore = totalGames > 0 ? Math.round((allGames.reduce((sum, g) => sum + g.score, 0) / totalGames) * 100) / 100 : 0;
          // Find preferred mode (most played)
          const modeCounts = allGames.reduce((acc, g) => { acc[g.mode] = (acc[g.mode] || 0) + 1; return acc; }, {});
          const preferredMode = Object.keys(modeCounts).length > 0 
            ? Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b, '')
            : 'No games played';
          setProgressData({ games: newestGames, totalGames, averageScore, highestScore, preferredMode });
        } else {
          setError(response.error || 'Failed to load progress data');
        }
      } catch (err) {
        console.error('Progress loading error:', err);
        setError('Error connecting to server');
      } finally {
        setIsLoading(false);
        if (setNeedsRefresh) setNeedsRefresh(false);
      }
    };
    loadUserScores();
  }, [user, needsRefresh, setNeedsRefresh]);

  // Calculate progress statistics
  const renderStatistics = () => {
    return (
      <div className="player-progress-stats-grid">
        <div className="player-progress-stat-card">
          <div className="player-progress-stat-value">{progressData.totalGames}</div>
          <div className="player-progress-stat-label">Total Games</div>
        </div>
        <div className="player-progress-stat-card">
          <div className="player-progress-stat-value">{progressData.averageScore.toFixed(2)}</div>
          <div className="player-progress-stat-label">Average Score</div>
        </div>
        <div className="player-progress-stat-card">
          <div className="player-progress-stat-value">{progressData.highestScore}</div>
          <div className="player-progress-stat-label">Highest Score</div>
        </div>
        <div className="player-progress-stat-card">
          <div className="player-progress-stat-value">{progressData.preferredMode || 'N/A'}</div>
          <div className="player-progress-stat-label">Preferred Mode</div>
        </div>
      </div>
    );
  };

  // Render game history with chart
  const renderGameHistory = () => {
    return (
      <div className="player-progress-history-section">
        <h3 className="player-progress-history-title">Game History</h3>
        
        {progressData.games.length > 0 ? (
          <>
            <div className="player-progress-chart-container">
              {/* Simple bar chart implementation */}
              {progressData.games.map((game, index) => (
                <div key={game.id || index} className="player-progress-chart-bar">
                  <div 
                    className="player-progress-bar"
                    style={{
                      height: `${progressData.highestScore > 0 ? Math.max((game.score / progressData.highestScore) * 100, 5) : 5}%`
                    }}
                  >
                    <span className="player-progress-bar-value">{game.score}</span>
                  </div>
                  <span className="player-progress-bar-label">{new Date(game.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            
            <table className="player-progress-games-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {progressData.games.map((game, index) => (
                  <tr key={game.id || index}>
                    <td>{new Date(game.date).toLocaleDateString()}</td>
                    <td>{game.mode}</td>
                    <td>{game.score}</td>
                    <td>{game.duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="player-progress-no-data">No game history available</div>
        )}
      </div>
    );
  };
  
  return (
    <div className="player-progress-wrapper">
      <div className="player-progress-container">
        <div className="player-progress-header">
          <h1 className="player-progress-title">PLAYER PROGRESS</h1>
          {user && <h3 className="player-progress-subtitle">Player: {user.username}</h3>}
        </div>
        
        <div className="player-progress-content">
          {isLoading ? (
            <div className="player-progress-loading">
              <Loader />
            </div>
          ) : error ? (
            <div className="player-progress-error">{error}</div>
          ) : (
            <>
              {/* Sensor Data Section */}
              {isConnected && (
                <div className="player-progress-sensor-section">
                  <div className="player-progress-sensor-data">
                    <p className={`player-progress-sensor-status ${isConnected ? 'connected' : 'disconnected'}`}>
                      Status: {isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                    {sensorData && (
                      <div>
                        <p>Temperature: {sensorData.temperature}°C</p>
                        <p>Humidity: {sensorData.humidity}%</p>
                        <p>Light Level: {sensorData.lightLevel}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {renderStatistics()}
              {renderGameHistory()}
            </>
          )}
        </div>
        
        <div className="player-progress-navigation">
          <button className="player-progress-nav-button" onClick={() => navigate('/')}>Back to Home</button>
          <button className="player-progress-nav-button" onClick={() => navigate('/game-modes')}>Choose Game Mode</button>
        </div>
      </div>
    </div>
  );
};

export default PlayerProgressPage;
