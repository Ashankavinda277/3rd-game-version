/** @format */

import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "../components/layout/Header";
import Target from "../components/common/Target";
import Button from "../components/common/Button";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <HomePageWrapper>
      <Header />
      <Target />
      <PlayButtonWrapper>
        <StyledButton
          variant='primary'
          size='large'
          onClick={() => navigate("/register")}
        >
          PLAY NOW
        </StyledButton>
      </PlayButtonWrapper>
    </HomePageWrapper>
  );
};

const HomePageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
`;

const PlayButtonWrapper = styled.div`
  margin-top: 20px;
  margin-bottom: 80px;
`;

const StyledButton = styled(Button)`
  width: 250px;
  height: 60px;
  font-size: 24px;
  border-radius: 30px;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.05);
  }
`;

export default HomePage;
