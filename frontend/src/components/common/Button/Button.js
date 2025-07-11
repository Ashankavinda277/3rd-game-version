import React from 'react';
import styled from 'styled-components';

/**
 * Reusable Button component with multiple variants
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, danger, outline)
 * @param {string} [props.size='medium'] - Button size (small, medium, large)
 * @param {boolean} [props.fullWidth=false] - Whether button should take full width
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 */
// Use transient props for styled-components to avoid React DOM warnings
const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  disabled = false,
  onClick,
  children,
  ...props
}) => {
  return (
    <StyledButton 
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

// Button style variations
const getVariantStyles = (variant) => {
  switch (variant) {
    case 'primary':
      return `
        background: linear-gradient(to right, #27ae60, #219a52);
        color: white;
        
        &:hover:not(:disabled) {
          background: linear-gradient(to right, #219a52, #1e8449);
        }
      `;
    case 'secondary':
      return `
        background: linear-gradient(to right, #3498db, #2980b9);
        color: white;
        
        &:hover:not(:disabled) {
          background: linear-gradient(to right, #2980b9, #2471a3);
        }
      `;
    case 'danger':
      return `
        background: linear-gradient(to right, #e74c3c, #c0392b);
        color: white;
        
        &:hover:not(:disabled) {
          background: linear-gradient(to right, #c0392b, #a93226);
        }
      `;
    case 'outline':
      return `
        background: transparent;
        color: #2c3e50;
        border: 2px solid #2c3e50;
        
        &:hover:not(:disabled) {
          background: rgba(44, 62, 80, 0.1);
        }
      `;
    default:
      return `
        background: linear-gradient(to right, #27ae60, #219a52);
        color: white;
        
        &:hover:not(:disabled) {
          background: linear-gradient(to right, #219a52, #1e8449);
        }
      `;
  }
};

// Button size variations
const getSizeStyles = (size) => {
  switch (size) {
    case 'small':
      return `
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
      `;
    case 'medium':
      return `
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      `;
    case 'large':
      return `
        padding: 1rem 2rem;
        font-size: 1.25rem;
      `;
    default:
      return `
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      `;
  }
};

const StyledButton = styled.button`
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-block;
  text-align: center;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  /* Apply size styles */
  ${props => getSizeStyles(props.$size)}
  /* Apply variant styles */
  ${props => getVariantStyles(props.$variant)}
  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(40%);
  }
  /* Hover transform effect */
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  /* Active state */
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

export default Button;
