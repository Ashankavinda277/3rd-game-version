/** @format */

// src/components/auth/SignUpForm.js
import React, { useState } from "react";
import "../styles/pages/SignUpForm.css";
import Button from "../components/common/Button";
import ErrorDisplay from "../components/common/ErrorDisplay";
// Optional reusable error component

const SignUpForm = ({ onSubmit, isLoading, error: serverError }) => {
  const [formData, setFormData] = useState({
    username: "",
    age: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.username || formData.username.length < 3)
      newErrors.username = "Minimum 3 characters";
    if (!formData.age || formData.age < 1 || formData.age > 120)
      newErrors.age = "Age must be between 1–120";
    if (!formData.password || formData.password.length < 6)
      newErrors.password = "Minimum 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {serverError && <div className="signup-error-message">{serverError}</div>}
      <InputField
        label='Username'
        name='username'
        value={formData.username}
        onChange={handleChange}
        error={errors.username}
      />
      <InputField
        label='Age'
        type='number'
        name='age'
        value={formData.age}
        onChange={handleChange}
        error={errors.age}
      />
      <InputField
        label='Password'
        type='password'
        name='password'
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
      />
      <InputField
        label='Confirm Password'
        type='password'
        name='confirmPassword'
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
      />

      <Button variant='primary' type='submit' disabled={isLoading} fullWidth>
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
      <Button
        variant='secondary'
        type='reset'
        onClick={() =>
          setFormData({
            username: "",
            age: "",
            password: "",
            confirmPassword: "",
          })
        }
        fullWidth
      >
        Clear
      </Button>
    </form>
  );
};

const InputField = ({ label, name, value, onChange, error, type = "text" }) => (
  <div className="signup-field">
    <label>{label}</label>
    <input 
      name={name} 
      value={value} 
      onChange={onChange} 
      type={type} 
      className={error ? 'error' : ''}
    />
    {error && <span>{error}</span>}
  </div>
);

export default SignUpForm;
