// src/components/auth/SignInForm.js
import React, { useState } from 'react';
import styled from 'styled-components';
import Button from '../components/common/Button';


const SignInForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.username || formData.username.length < 3) newErrors.username = 'Minimum 3 characters';
    if (!formData.password || formData.password.length < 6) newErrors.password = 'Minimum 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputField label="Username" name="username" value={formData.username} onChange={handleChange} error={errors.username} />
      <InputField label="Password" type="password" name="password" value={formData.password} onChange={handleChange} error={errors.password} />
      <Button variant="primary" type="submit" disabled={isLoading} fullWidth>
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
};

const InputField = ({ label, name, value, onChange, error, type = 'text' }) => (
  <Field>
    <label>{label}</label>
    <input name={name} value={value} onChange={onChange} type={type} />
    {error && <span>{error}</span>}
  </Field>
);

const Field = styled.div`
  display: flex;
  flex-direction: column;

  label {
    font-weight: bold;
  }

  input {
    padding: 0.5rem;
    font-size: 1.1rem;
    border: 1px solid ${props => (props.error ? '#ff6b6b' : '#ccc')};
    border-radius: 5px;
  }

  span {
    color: #ff6b6b;
    font-size: 0.9rem;
  }
`;

export default SignInForm;
