import React from 'react';
import '../styles/components/PlayButton.css';
import { useNavigate } from 'react-router-dom';

const PlayButton = () => {
  const navigate = useNavigate();

  return (
    <div className="play-button-wrapper">
      <button className="play-button" onClick={() => navigate('/game-modes')}>
        PLAY NOW
      </button>
    </div>
  );
}

export default PlayButton;