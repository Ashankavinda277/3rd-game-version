/** @format */

// src/components/auth/SignUpForm.js
import React, { useState } from "react";
import styled from "styled-components";
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
      {serverError && <ErrorMessage>{serverError}</ErrorMessage>}
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
  <Field>
    <label>{label}</label>
    <input name={name} value={value} onChange={onChange} type={type} />
    {error && <span>{error}</span>}
  </Field>
);

const Field = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;

  label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: white;
  }

  input {
    padding: 0.5rem;
    font-size: 1.1rem;
    border: 1px solid ${(props) => (props.error ? "#ff6b6b" : "#ccc")};
    border-radius: 5px;
    background: white;
    color: #333;
  }

  span {
    color: #ff6b6b;
    font-size: 0.9rem;
    margin-top: 0.2rem;
  }
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 0.75rem;
  border-radius: 5px;
  margin-bottom: 1rem;
  font-weight: bold;
  text-align: center;
  border: 1px solid rgba(255, 107, 107, 0.3);
`;

export default SignUpForm;
