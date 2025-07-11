import React from 'react';
import '../styles/pages/FinalPage.css';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/common/Loader';

const FinalPage = ({ onStart }) => {
  const navigate = useNavigate();
  console.log('FinalPage rendered');
  return (
    <div className="final-page-wrapper">
      <h2 className="final-page-header">WELCOME TO THE GAME</h2>
      <div className="final-page-content-wrapper">
        <div className="final-page-overlay">
          <div className="final-page-button-container">
            <button className="final-page-button" onClick={onStart}>Play Now</button>
            <button className="final-page-button" onClick={() => navigate('/leaderboard')}>Leader Board</button>
            <button className="final-page-button" onClick={() => navigate('/progress')}>Player Progress</button>
          </div>
        </div>
        <div className="final-page-loader-wrapper">
          <div className="final-page-styled-loader">
            <Loader />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalPage;