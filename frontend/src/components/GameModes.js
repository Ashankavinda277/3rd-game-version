// src/pages/GameModesPage.js

import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/components/GameModes.css";

const GameModesPage = () => {
  const navigate = useNavigate();

  const handleSelectMode = (mode) => {
    // You can save the mode in context, localStorage, or navigate with params
    console.log("Selected mode:", mode);
    // For example, navigate to game page with mode param:
    navigate(`/game?mode=${mode}`);
  };

  return (
    <div className="game-modes-wrapper">
      <div className="game-modes-overlay">
        <h1>Select Game Mode</h1>
        <div className="modes-container">
          <button className="mode-button" onClick={() => handleSelectMode("easy")}>Easy</button>
          <button className="mode-button" onClick={() => handleSelectMode("medium")}>Medium</button>
          <button className="mode-button" onClick={() => handleSelectMode("hard")}>Hard</button>
        </div>
        <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
};

export default GameModesPage;
