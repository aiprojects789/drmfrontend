import React, { useEffect, useState } from 'react';
import { Form, Input } from 'antd';
import { Button } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaUnlock } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';

const layout = {
  labelCol: { span: 24 },
  wrapperCol: { span: 24 },
};

const validateMessages = {
  required: '${label} is required!',
  types: {
    email: '${label} is not a valid email!',
    number: '${label} is not a valid number!',
  },
  number: {
    range: '${label} must be between ${min} and ${max}',
  },
};

const AuthForm = ({ onForgetPasswordClick }) => {
  const [authMode, setAuthMode] = useState('login');
  const { isAuthenticated, loginWithCredentials, signup } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const baseURL = import.meta.env.VITE_BASE_URL_BACKEND;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // In your AuthForm component, update the onFinish function:
  const onFinish = async (values) => {
    const { email, password, name } = values.user;
    
    if (authMode === 'signup') {
      try {
        await signup({
          email,
          password,
          username: name,
        });
        
        alert('Successfully Registered. Please login to continue.');
        setAuthMode('login');
        form.resetFields();
      } catch (error) {
        console.error('Registration failed:', error);
      }
    } else {
      try {
        const response = await loginWithCredentials(email, password);
        
        if (response.role === 'admin') {
          navigate('/admin/dashboard'); // Updated path
        } else {
          navigate('/dashboard'); // This will now work correctly
        }
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  // Custom username validator
  const validateUsername = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Username is required!'));
    }
    
    // Check if username matches the required pattern: only letters, numbers, and underscores
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    if (!usernamePattern.test(value)) {
      return Promise.reject(new Error('Username can only contain letters, numbers, and underscores'));
    }
    
    // Check minimum length
    if (value.length < 3) {
      return Promise.reject(new Error('Username must be at least 3 characters long'));
    }
    
    // Check maximum length
    if (value.length > 30) {
      return Promise.reject(new Error('Username must be less than 30 characters'));
    }
    
    return Promise.resolve();
  };

  useEffect(() => {
    form.resetFields();
  }, [authMode, form]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-xl">
      <Form
        {...layout}
        form={form}
        name="auth"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
        layout="vertical"
        validateMessages={validateMessages}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-5">
          {authMode === 'signup' ? 'Create Account' : 'Login'}
        </h1>

        {authMode === 'signup' && (
          <Form.Item 
            name={['user', 'name']} 
            label="Username" 
            rules={[
              { validator: validateUsername }
            ]}
            help="Only letters, numbers, and underscores allowed (3-30 characters)"
          >
            <Input 
              className="border-2 border-gray-300 focus:!border-purple-600 hover:!border-purple-600 !py-2 px-4 text-lg rounded-md" 
              placeholder="e.g., john_doe123"
            />
          </Form.Item>
        )}

        <Form.Item name={['user', 'email']} label="Email" rules={[{ type: 'email', required: true }]}>
          <Input className="focus:!border-purple-600 hover:!border-purple-600 border-2 border-gray-300 !py-2 px-4 text-lg rounded-md" />
        </Form.Item>

        <Form.Item
          name={['user', 'password']}
          label="Password"
          rules={[
            {
              required: true,
              pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/,
              message:
                'Password must be at least 8 characters, include upper and lower case, number, and special character.',
            },
          ]}
        >
          <Input.Password
            iconRender={(visible) => (visible ? <FaUnlock color="gray" /> : <FaLock color="gray" />)}
            className="border-2 border-gray-300 !py-2 px-4 text-lg rounded-md active:!border-purple-600 focus:!border-purple-600 hover:!border-purple-600"
          />
        </Form.Item>

        <div className="text-sm flex justify-end mb-5">
          <p
            onClick={onForgetPasswordClick}
            className="font-medium text-blue-800 hover:text-blue-700 cursor-pointer"
          >
            Forgot your password?
          </p>
        </div>

        <Form.Item label={null}>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 focus:ring-4 focus:ring-purple-300 text-white w-full py-3 rounded-md transition-all duration-200 ease-in-out font-medium text-lg"
          >
            {authMode === 'signup' ? 'Sign Up' : 'Login'}
          </button>

          <p className="text-center my-3">or</p>

          <Button
            startIcon={<FcGoogle />}
            size="large"
            className="w-full bg-gray-50 !border-white !shadow-2xs !shadow-gray-300"
          >
            Continue With Google
          </Button>
        </Form.Item>

        <div>
          {authMode === 'signup' ? (
            <p className="text-center">
              Already have an account?{' '}
              <span
                className="text-purple-600 cursor-pointer hover:underline"
                onClick={() => setAuthMode('login')}
              >
                Login
              </span>
            </p>
          ) : (
            <p className="text-center">
              Don't have an account?{' '}
              <span
                className="text-purple-600 cursor-pointer hover:underline"
                onClick={() => setAuthMode('signup')}
              >
                Signup
              </span>
            </p>
          )}
        </div>
      </Form>
    </div>
  );
};

export default AuthForm;