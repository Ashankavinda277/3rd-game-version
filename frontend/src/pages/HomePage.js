/** @format */

import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/HomePage.css";
import Header from "../components/layout/Header";
import Target from "../components/common/Target";
import Button from "../components/common/Button";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage-wrapper">
      <Header />
      <Target />
      <div className="homepage-play-button-wrapper">
        <Button
          className="homepage-styled-button"
          variant='primary'
          size='large'
          onClick={() => navigate("/register")}
        >
          PLAY NOW
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
