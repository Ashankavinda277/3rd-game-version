import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
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
    <LeaderboardWrapper>
      <HeaderSection>
        <h1>LEADERBOARD</h1>
        <ModeToggle>
          <ModeButton 
            $active={activeMode === 'all'} 
            onClick={() => handleModeChange('all')}
          >
            All Modes
          </ModeButton>
          <ModeButton 
            $active={activeMode === 'easy'} 
            onClick={() => handleModeChange('easy')}
          >
            Easy
          </ModeButton>
          <ModeButton 
            $active={activeMode === 'medium'} 
            onClick={() => handleModeChange('medium')}
          >
            Medium
          </ModeButton>
          <ModeButton 
            $active={activeMode === 'hard'} 
            onClick={() => handleModeChange('hard')}
          >
            Hard
          </ModeButton>
        </ModeToggle>
      </HeaderSection>
      
      <ContentSection>
        {isLoading ? (
          <LoaderWrapper>
            <Loader />
          </LoaderWrapper>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <LeaderboardTable>
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
          </LeaderboardTable>
        )}
      </ContentSection>
      
      <ButtonsSection>
        <Button onClick={() => navigate('/final-page')}>Back to Menu</Button>
        <Button onClick={() => navigate('/play')}>Play Again</Button>
      </ButtonsSection>
    </LeaderboardWrapper>
  );
};

const LeaderboardWrapper = styled.div`
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
    margin-bottom: 1rem;
    color: gold;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  gap: 1rem;
`;

const ModeButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 30px;
  background: ${props => props.$active ? '#27ae60' : '#34495e'};
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    background: ${props => props.$active ? '#219a52' : '#2c3e50'};
  }
`;

const ContentSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
`;

const LeaderboardTable = styled.table`
  width: 100%;
  max-width: 900px;
  border-collapse: collapse;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  overflow: hidden;
  
  th, td {
    padding: 1rem;
    text-align: center;
  }
  
  th {
    background: rgba(0, 0, 0, 0.4);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  tr:nth-child(even) {
    background: rgba(0, 0, 0, 0.1);
  }
  
  tr:nth-child(1) td {
    background: rgba(255, 215, 0, 0.1); /* Gold for first place */
  }
  
  tr:nth-child(2) td {
    background: rgba(192, 192, 192, 0.1); /* Silver for second place */
  }
  
  tr:nth-child(3) td {
    background: rgba(205, 127, 50, 0.1); /* Bronze for third place */
  }
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

export default LeaderboardPage;
