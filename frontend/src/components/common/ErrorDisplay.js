import React from 'react';
import '../../styles/components/common/ErrorDisplay.css';

const ErrorDisplay = ({ message }) => {
  if (!message) return null;
  return <div className="error-message">{message}</div>;
};

export default ErrorDisplay;
