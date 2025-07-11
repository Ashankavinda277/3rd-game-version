import React from 'react';
import styled from 'styled-components';

const Message = styled.div`
  color: #ff6b6b;
  background: rgba(255, 0, 0, 0.1);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-weight: bold;
`;

const ErrorDisplay = ({ message }) => {
  if (!message) return null;
  return <Message>{message}</Message>;
};

export default ErrorDisplay;
