/** @format */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/HomePage.css";
import Header from "../components/layout/Header";
import Target from "../components/common/Target";
import Button from "../components/common/Button";

const HomePage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseActive, setIsMouseActive] = useState(false);
  const [backgroundParticles, setBackgroundParticles] = useState([]);

  // Advanced mouse tracking for tactical cursor
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsMouseActive(true);
    const handleMouseLeave = () => setIsMouseActive(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Generate tactical grid particles
  useEffect(() => {
    const generateParticles = () => {
      const particles = [];
      for (let i = 0; i < 12; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.4 + 0.1,
          duration: Math.random() * 4 + 3
        });
      }
      setBackgroundParticles(particles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleTargetHit = () => {
    // Create tactical hit effect
    const hitEffect = document.createElement('div');
    hitEffect.className = 'tactical-hit-effect';
    hitEffect.style.left = mousePosition.x + 'px';
    hitEffect.style.top = mousePosition.y + 'px';
    document.body.appendChild(hitEffect);
    
    setTimeout(() => {
      if (document.body.contains(hitEffect)) {
        document.body.removeChild(hitEffect);
      }
    }, 1000);
  };

  const handleEnterGame = () => {
    navigate("/register");
  };

  return (
    <div className="homepage-container">
      {/* Tactical Grid Background */}
      <div className="tactical-grid-background">
        {backgroundParticles.map(particle => (
          <div
            key={particle.id}
            className="grid-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>

      {/* Tactical Cursor */}
      {isMouseActive && (
        <div
          className="tactical-cursor"
          style={{
            left: mousePosition.x,
            top: mousePosition.y
          }}
        >
          <div className="cursor-crosshair"></div>
          <div className="cursor-dot"></div>
        </div>
      )}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="main-content">
      

        {/* Interactive Elements */}
        <section className="interactive-section">
          {/* Target Display */}
          <div className="target-display">
            <div className="target-glow-ring"></div>
            <div 
              className="interactive-target-wrapper"
              onClick={handleTargetHit}
            >
              <Target />
            </div>
            <div className="target-scanner"></div>
          </div>

         
        </section>
         {/* Mission Entry */}
          <div className="mission-entry">
            <div className="mission-brief">
              <h2 className="mission-title">MISSION BRIEFING</h2>
              <p className="mission-description">
                Enter the tactical zone and prove your combat skills
              </p>
            </div>
            
            <div className="enter-button-wrapper">
              <Button
                className="enter-game-button"
                variant="primary"
                size="large"
                onClick={handleEnterGame}
              >
                <span className="button-text">ENTER OPERATION</span>
                <div className="button-scanner"></div>
              </Button>
            </div>
          </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <span className="status-label">STATUS</span>
            <span className="status-value">OPERATIONAL</span>
          </div>
          <div className="status-item">
            <span className="status-label">CLEARANCE</span>
            <span className="status-value">AUTHORIZED</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;