/** @format */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import GameModesPage from "./pages/GameModesPage";
import RegisterPage from "./pages/RegisterPage";
import FinalPage from "./pages/FinalPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import PlayerProgressPage from "./pages/PlayerProgressPage";
import PlayPage from "./pages/PlayPage";
import { GameProvider } from "./contexts/GameContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import "./styles/App.css";

function App() {
  const location = useLocation();

  return (
    <div className='App'>
      {location.pathname === "/" && (
        <>
          <div className='bullet'></div>
          <div className='laser'></div>
        </>
      )}
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/game-modes' element={<GameModesPage />} />
        <Route path='/final-page' element={<FinalPage />} />
        <Route path='/leaderboard' element={<LeaderboardPage />} />
        <Route path='/progress' element={<PlayerProgressPage />} />
        <Route path='/play' element={<PlayPage />} />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <GameProvider>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </GameProvider>
    </Router>
  );
}
