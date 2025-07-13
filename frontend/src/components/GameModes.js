// src/pages/GameModesPage.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "../contexts/GameContext";
import { setGameMode as setGameModeAPI } from "../services/api";
import "../styles/components/GameModes.css";

const GameModesPage = () => {
  const navigate = useNavigate();
  const { setGameMode } = useGameContext();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);

  const handleSelectMode = async (mode) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setSelectedMode(mode);
    
    try {
      console.log("Selected mode:", mode);
      
      // Save mode in context and localStorage
      setGameMode(mode);
      
      // Send game mode to backend to configure motors (but not start them)
      const response = await setGameModeAPI(mode);
      
      if (response.ok) {
        console.log("Game mode configured on device:", response.data);
        
        // Navigate to game page with mode param
        navigate(`/game?mode=${mode}`);
      } else {
        console.error("Failed to configure game mode:", response.error);
        alert(`Failed to configure game mode: ${response.error}. Proceeding without hardware configuration.`);
        
        // Still navigate to game even if hardware configuration fails
        navigate(`/game?mode=${mode}`);
      }
    } catch (error) {
      console.error("Error configuring game mode:", error);
      alert("Error configuring game mode. Proceeding without hardware configuration.");
      
      // Still navigate to game even if there's an error
      navigate(`/game?mode=${mode}`);
    } finally {
      setIsLoading(false);
      setSelectedMode(null);
    }
  };

  return (
    <div className="game-modes-wrapper">
      <div className="game-modes-overlay">
        <h1>Select Game Mode</h1>
        <div className="modes-container">
          <button 
            className={`mode-button ${selectedMode === 'easy' ? 'loading' : ''}`}
            onClick={() => handleSelectMode("easy")}
            disabled={isLoading}
          >
            {selectedMode === 'easy' && isLoading ? 'Configuring...' : 'Easy'}
          </button>
          <button 
            className={`mode-button ${selectedMode === 'medium' ? 'loading' : ''}`}
            onClick={() => handleSelectMode("medium")}
            disabled={isLoading}
          >
            {selectedMode === 'medium' && isLoading ? 'Configuring...' : 'Medium'}
          </button>
          <button 
            className={`mode-button ${selectedMode === 'hard' ? 'loading' : ''}`}
            onClick={() => handleSelectMode("hard")}
            disabled={isLoading}
          >
            {selectedMode === 'hard' && isLoading ? 'Configuring...' : 'Hard'}
          </button>
        </div>
        <button 
          className="back-button" 
          onClick={() => navigate(-1)}
          disabled={isLoading}
        >
          Back
        </button>
        {isLoading && (
          <div className="loading-message">
            Configuring motors for {selectedMode} mode...
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModesPage;
