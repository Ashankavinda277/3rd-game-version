import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
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
      if (!user?._id) {
        setError('User not authenticated');
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetchUserScores(user._id);
        if (response.ok) {
          const scores = response.data?.scores || response.data?.data?.scores || [];          // Group by mode
          const games = scores.map(s => ({
            id: s._id,
            score: s.score,
            mode: s.gameMode,
            accuracy: s.accuracy,
            duration: s.timePlayed,
            date: s.createdAt
          }));
          const totalGames = games.length;
          const highestScore = games.reduce((max, g) => g.score > max ? g.score : max, 0);
          const averageScore = totalGames > 0 ? (games.reduce((sum, g) => sum + g.score, 0) / totalGames) : 0;
          // Find preferred mode (most played)
          const modeCounts = games.reduce((acc, g) => { acc[g.mode] = (acc[g.mode] || 0) + 1; return acc; }, {});
          const preferredMode = Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b, '');
          setProgressData({ games, totalGames, averageScore, highestScore, preferredMode });
        } else {
          setError(response.error || 'Failed to load progress data');
        }
      } catch (err) {
        console.error('Progress loading error:', err);
        setError('Error connecting to server');
      } finally {
        setIsLoading(false);
        if (needsRefresh && setNeedsRefresh) setNeedsRefresh(false);
      }
    };
    loadUserScores();
  }, [user, needsRefresh, setNeedsRefresh]);

  // Calculate progress statistics
  const renderStatistics = () => {
    return (
      <StatsContainer>
        <StatCard>
          <StatTitle>Total Games</StatTitle>
          <StatValue>{progressData.totalGames}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Average Score</StatTitle>
          <StatValue>{progressData.averageScore.toFixed(2)}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Highest Score</StatTitle>
          <StatValue>{progressData.highestScore}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Preferred Mode</StatTitle>
          <StatValue>{progressData.preferredMode || 'N/A'}</StatValue>
        </StatCard>
      </StatsContainer>
    );
  };

  // Render game history with chart
  const renderGameHistory = () => {
    return (
      <HistorySection>
        <h3>Game History</h3>
        
        {progressData.games.length > 0 ? (
          <>
            <ChartContainer>
              {/* Simple bar chart implementation */}
              {progressData.games.slice(-10).map((game, index) => (
                <ChartBar key={game.id || index}>
                  <Bar height={(game.score / progressData.highestScore) * 100}>
                    <BarValue>{game.score}</BarValue>
                  </Bar>
                  <BarLabel>{new Date(game.date).toLocaleDateString()}</BarLabel>
                </ChartBar>
              ))}
            </ChartContainer>
            
            <GamesTable>
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
            </GamesTable>
          </>
        ) : (
          <NoDataMessage>No game history available</NoDataMessage>
        )}
      </HistorySection>
    );
  };
  
  return (
    <ProgressWrapper>
      <HeaderSection>
        <h1>PLAYER PROGRESS</h1>
        {user && <Username>Player: {user.username}</Username>}
      </HeaderSection>
      
      <ContentSection>
        {isLoading ? (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <>
            {renderStatistics()}
            {renderGameHistory()}
          </>
        )}
      </ContentSection>
      
      <ButtonsSection>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
        <Button onClick={() => navigate('/game-modes')}>Choose Game Mode</Button>
      </ButtonsSection>
    </ProgressWrapper>
  );
};

const ProgressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%);
  color: white;
  padding: 2rem;
`;

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    color: gold;
  }
`;

const Username = styled.h3`
  font-size: 1.5rem;
  font-weight: 400;
  color: #3498db;
`;

const ContentSection = styled.div`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const StatTitle = styled.h4`
  font-size: 1.1rem;
  color: #bdc3c7;
  margin: 0 0 1rem 0;
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #3498db;
`;

const HistorySection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 1.5rem;
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
    color: #e67e22;
  }
`;

const ChartContainer = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 1rem 0;
  margin-bottom: 2rem;
`;

const ChartBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
`;

const Bar = styled.div`
  position: relative;
  width: 100%;
  height: ${props => props.height}%;
  background: linear-gradient(to top, #3498db, #2ecc71);
  border-radius: 3px;
  min-height: 5px;
`;

const BarValue = styled.span`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  white-space: nowrap;
  color: #3498db;
`;

const BarLabel = styled.span`
  margin-top: 0.5rem;
  font-size: 0.7rem;
  transform: rotate(-45deg);
  color: #bdc3c7;
`;

const GamesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 0.8rem;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  th {
    background: rgba(0, 0, 0, 0.2);
    font-weight: 600;
  }
  
  tr:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #bdc3c7;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border-radius: 5px;
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
`;

const LoaderWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const ButtonsSection = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 1rem;
`;

const SensorDataSection = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid #2ecc71;
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    text-align: center;
    color: #2ecc71;
  }
  
  p {
    text-align: center;
    margin-bottom: 1rem;
  }
`;

const SensorDataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const SensorDataItem = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
`;

const SensorLabel = styled.div`
  font-size: 0.9rem;
  color: #bdc3c7;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
`;

const SensorValue = styled.div`
  font-size: 1.8rem;
  font-weight: 600;
  color: #2ecc71;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  background: #3498db;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    background: #2980b9;
  }
`;

export default PlayerProgressPage;
