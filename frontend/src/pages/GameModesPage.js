/** @format */

import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { useGameContext } from "../contexts/GameContext";

const GameModesPage = () => {
  const navigate = useNavigate();
  const { setGameMode } = useGameContext();

  const handleModeSelect = (mode) => {
    setGameMode(mode);
    navigate("/play");
  };

  return (
    <GameModesWrapper>
      <Overlay>
        <h1>Game Modes</h1>
        <ModesContainer>
          <StyledButton
            onClick={() => handleModeSelect("easy")}
            variant='primary'
          >
            Easy Mode
          </StyledButton>
          <StyledButton
            onClick={() => handleModeSelect("medium")}
            variant='secondary'
          >
            Medium Mode
          </StyledButton>
          <StyledButton
            onClick={() => handleModeSelect("hard")}
            variant='danger'
          >
            Hard Mode
          </StyledButton>
        </ModesContainer>
        <StyledBackButton onClick={() => navigate("/")} variant='outline'>
          Back
        </StyledBackButton>
      </Overlay>
    </GameModesWrapper>
  );
};

const GameModesWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background-image: url("https://images.pexels.com/photos/6092077/pexels-photo-6092077.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"); /* Replace with actual image URL */
  background-size: cover;
  background-position: center;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Overlay = styled.div`
  background: rgb(0, 0, 0); /* Dark overlay for better text visibility */
  padding: 2rem;
  text-align: center;
  color: white;
  border-radius: 10px;
`;

const ModesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 40px 0;
`;

const StyledButton = styled(Button)`
  width: 200px;
  margin: 0 auto;
  font-size: 18px;
`;

const StyledBackButton = styled(Button)`
  margin-top: 20px;
`;

export default GameModesPage;
