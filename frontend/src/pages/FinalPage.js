import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';

const FinalPage = ({ onStart }) => {
  const navigate = useNavigate();
  console.log('FinalPage rendered');
  return (
    <FinalPageWrapper>
      <Header>WELCOME TO THE GAME</Header>
      <ContentWrapper>
        <Overlay>
          <ButtonContainer>
            <Button onClick={onStart}>Play Now</Button>
            <Button onClick={() => navigate('/leaderboard')}>Leader Board</Button>
            <Button onClick={() => navigate('/progress')}>Player Progress</Button>
          </ButtonContainer>
        </Overlay>
        <LoaderWrapper>
          <StyledLoader />
        </LoaderWrapper>
      </ContentWrapper>
    </FinalPageWrapper>
  );
};

const FinalPageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: url('https://c4.wallpaperflare.com/wallpaper/229/473/231/religion-jesus-christ-cross-flower-of-life-wallpaper-preview.jpg') no-repeat center center;
  background-size: cover;
  text-align: center;
  color: white;
`;

const Header = styled.h2`
  font-size: 4rem;
  margin-bottom: 2rem;
  color: gold;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Overlay = styled.div`
  background: silver; /* Light overlay for better text visibility */
  padding: 2rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Button = styled.button`
  width: 250px;
  padding: 20px;
  font-size: 1.5rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(to right, #27ae60, #219a52);
  color: white;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const LoaderWrapper = styled.div`
  margin-top: 20px; /* Adjust margin to place it right after the overlay */
`;

const StyledLoader = styled(Loader)`
  transform: scale(0.5); /* Reduce the size of the loader */
`;

export default FinalPage;