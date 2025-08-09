/** @format */

import React from "react";
import "../styles/pages/GameModesPage.css";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { useGameContext } from "../contexts/GameContext";
import { setGameMode as setGameModeAPI } from '../services/api';

const GameModesPage = () => {
  const navigate = useNavigate();
  const { setGameMode } = useGameContext();

  const handleModeSelect = async (mode) => {
    console.log(`🎮 Mode selected: ${mode}`);
    setGameMode(mode);
    try {
      await setGameModeAPI(mode);
      console.log(`✅ Mode ${mode} sent to backend successfully`);
    } catch (err) {
      // Optionally handle error (e.g., show a message)
      console.error('Failed to send game mode to backend:', err);
    }
    navigate("/play");
  };

  return (
    <div className="gamemodes-wrapper">
      <div className="gamemodes-overlay">
        <h1>Game Modes</h1>
        <div className="gamemodes-container">
          <Button
            className="gamemodes-styled-button"
            onClick={() => handleModeSelect("easy")}
            variant='primary'
          >
            Easy Mode
          </Button>
          <Button
            className="gamemodes-styled-button"
            onClick={() => handleModeSelect("medium")}
            variant='secondary'
          >
            Medium Mode
          </Button>
          <Button
            className="gamemodes-styled-button"
            onClick={() => handleModeSelect("hard")}
            variant='danger'
          >
            Hard Mode
          </Button>
        </div>
        <Button className="gamemodes-back-button" onClick={() => navigate("/")} variant='outline'>
          Back
        </Button>
      </div>
    </div>
  );
};

export default GameModesPage;
