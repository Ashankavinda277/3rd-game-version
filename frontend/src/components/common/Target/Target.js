import React from 'react';
import './Target.css';

/**
 * Target component that displays a shooting target with optional animations
 * @param {Object} props - Component props
 * @param {boolean} [props.showAnimations=true] - Whether to show bullet/laser animations
 * @param {string} [props.color] - Custom color for the target
 * @returns {JSX.Element} Target component
 */
const Target = ({ showAnimations = true, color }) => {
  const ringStyles = color ? {
    '--target-color': color,
  } : {};

  return (
    <div className="target-wrapper" style={ringStyles}>
      <div className="target">
        <div className="target-circle ring-7"></div>
        <div className="target-circle ring-6"></div>
        <div className="target-circle ring-5"></div>
        <div className="target-circle ring-4"></div>
        <div className="target-circle ring-3"></div>
        <div className="target-circle ring-2"></div>
        <div className="target-circle ring-1"></div>
      </div>
      {showAnimations && (
        <>
          <div className="bullet-hit"></div>
          <div className="laser-hit"></div>
        </>
      )}
    </div>
  );
};

export default Target;
