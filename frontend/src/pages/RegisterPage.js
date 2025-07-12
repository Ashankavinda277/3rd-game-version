/** @format */

import React, { useState } from "react";
import "../styles/pages/RegisterPage.css";
import { useNavigate } from "react-router-dom";
import Target from "../components/common/Target";
import Button from "../components/common/Button";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";
import { registerUser, loginUser } from "../services/api";
import { useGameContext } from "../contexts/GameContext";

const RegisterPage = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useGameContext();

  const handleSignIn = async ({ username, password }) => {
    console.log("🔁 SignIn Called");
    setIsLoading(true);
    setError("");
    try {
      const response = await loginUser(username, password);
      console.log("✅ Response from loginUser:", response);

      let userObj = response.data && (response.data.user || (response.data.data && response.data.data.user));
      console.log("👤 Extracted userObj:", userObj);

      if (response.ok && userObj && (userObj.id || userObj._id)) {
        console.log("✅ Conditions passed, calling setUser and navigate");
        setUser(userObj);
        setTimeout(() => {
          console.log("🚀 Navigating to /game-modes");
          navigate("/game-modes");
        }, 200);
      } else {
        console.warn("❌ Login failed:", response.error || "Unknown");
        setError(response.error || "Login failed");
      }
    } catch (err) {
      console.error("💥 Login error:", err);
      setError("Server connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async ({ username, age, password }) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await registerUser(
        username,
        parseInt(age),
        password
      );
      console.log("✅ Response from registerUser:", response);
      let userObj = response.data && (response.data.user || (response.data.data && response.data.data.user));
      console.log("👤 Extracted userObj:", userObj);
      if (response.ok && userObj && (userObj.id || userObj._id)) {
        setError("");
        setUser(userObj);
        navigate("/game-modes");
      } else {
        console.warn("❌ Registration failed:", response.error, response);
        if (response.error && response.error.includes("already exists")) {
          setError(`${response.error} Would you like to sign in instead?`);
          setTimeout(() => {
            setIsSignUp(false);
            setError("");
          }, 3000);
        } else {
          setError(response.error || JSON.stringify(response) || "Registration failed");
        }
      }
    } catch (err) {
      console.error("💥 Sign Up error:", err);
      setError(err.message || "Server connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-content">
        <div className="register-overlay">
          <div className="register-header">
            <h2 className="register-title">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <h3 className="register-subtitle">
              {isSignUp 
                ? "Join the Smart Shooting Gallery" 
                : "Sign in to continue your journey"
              }
            </h3>
          </div>

          <div className="register-toggle-container">
            <div className="register-toggle-wrapper">
              <button
                className={`register-toggle-button ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true);
                  setError("");
                }}
                disabled={isLoading}
              >
                <span className="button-text">Sign Up</span>
              </button>
              <button
                className={`register-toggle-button ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false);
                  setError("");
                }}
                disabled={isLoading}
              >
                <span className="button-text">Sign In</span>
              </button>
            </div>
          </div>

          <div className="register-form-container">
            {isSignUp ? (
              <SignUpForm
                onSubmit={handleSignUp}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <>
                {error && (
                  <div className="register-error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                  </div>
                )}
                <SignInForm onSubmit={handleSignIn} isLoading={isLoading} />
              </>
            )}
          </div>

          <div className="register-back-button">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/")}
              disabled={isLoading}
              fullWidth
            >
              <span className="back-icon">←</span>
              Back to Home
            </Button>
          </div>
        </div>

        <div className="register-target-wrapper">
          <div className="target-glow">
            <Target showAnimations={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;