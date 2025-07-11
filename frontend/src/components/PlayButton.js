import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const PlayButton = () => {
  const navigate = useNavigate();

  return (
    <StyledWrapper>
      <button onClick={() => navigate('/game-modes')}>
        PLAY NOW
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  margin-top: 20px;  /* Add margin-top to position below Target */
  margin-bottom: 80px;
  
  button {
    width: 9em;
    height: 3em;
    border-radius: 30em;
    font-size: 24px;
    font-family: inherit;
    border: none;
    position: relative;
    overflow: hidden;
    z-index: 1;
    box-shadow: 6px 6px 12px #c5c5c5,
                -6px -6px 12px #ffffff;
  }

  button::before {
    content: '';
    width: 0;
    height: 3em;
    border-radius: 30em;
    position: absolute;
    top: 0;
    left: 0;
    background-image: linear-gradient(to right, #27ae60 0%, #219a52 100%);
    transition: .5s ease;
    display: block;
    z-index: -1;
  }

  button:hover::before {
    width: 9em;
  }
`;

export default PlayButton;