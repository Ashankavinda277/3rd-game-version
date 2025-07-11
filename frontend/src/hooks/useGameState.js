import { useState, useCallback } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { validateRegistrationForm } from '../utils/validation';
import { registerUser } from '../services/api';

/**
 * Custom hook for handling game registration
 * @returns {Object} Registration state and functions
 */
export const useRegistration = () => {
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    mode: 'easy'
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Game context
  const { setUser, setGameMode } = useGameContext();
  
  // Form field change handler
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear the error for the changed field
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);
  
  // Form submission handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateRegistrationForm(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      // Convert age to number
      const payload = {
        ...formData,
        age: parseInt(formData.age, 10)
      };
      
      // Submit form data to API
      const response = await registerUser(
        payload.username, 
        payload.age, 
        payload.mode
      );
      
      if (response.ok) {
        // Update global state with user info
        setUser(response.user);
        setGameMode(payload.mode);
        return { success: true };
      } else {
        setErrors({ submit: response.error || 'Registration failed' });
        return { success: false, error: response.error };
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  }, [formData, setUser, setGameMode]);
  
  return {
    formData,
    isLoading,
    errors,
    handleChange,
    handleSubmit,
    setFormData
  };
};

/**
 * Custom hook for managing scores
 * @returns {Object} Score state and functions
 */
export const useScores = () => {
  const { user, gameMode, scores, setScores } = useGameContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Implementation can be expanded as needed
  
  return {
    scores,
    isLoading,
    error,
    // Add more functions as needed
  };
};
