import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber } from 'antd';
import { Button } from '@mui/material'
import { useContext } from 'react'
import AuthContext from '../../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom';
import { FaLock, FaUnlock } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';
import { Password } from '@mui/icons-material';
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
  const [authMode, setAuthMode] = useState('login')
  const { isLogin,setIsLogin } = useContext(AuthContext)
  const navigate = useNavigate();
  const [form] = Form.useForm()
  const baseURL = import.meta.env.VITE_BASE_URL_BACKEND
  const now = new Date();
const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 week
const expiry = now.getTime() + oneWeekInMs;
 useEffect(() => {
    if (isLogin) {
      navigate('/');
    }
  }, [isLogin, navigate]);
  const onFinish = async (values) => {
    const { email, password, name } = values.user;
    if (authMode == 'signup') {
      try {
        const res = await axios.post(`${baseURL}/api/v1/auth/signup`, {
          email,
          password,
          username: name,

        })
        console.log('Successfully Registered :', res.data)
        alert('Successfully Registered Login to continue')
        setAuthMode('login')
      }
      catch (error) {
        console.log(error)
      }
    }
    else {
  const loginData = new URLSearchParams();
loginData.append('username', email); 
loginData.append('password', password);

try {
  const res = await axios.post(
    `${baseURL}/api/v1/auth/login`,
    loginData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  console.log('Login Success:', res.data);

  localStorage.setItem('token', res.data.access_token);
  // localStorage.setItem('token_expiry', expiry);
  setIsLogin(true);
  alert('Login successful');

  if (res.data.role == 'admin') {
    navigate('/admin/dashboard');
  } else {
    navigate('/');
  }
} catch (err){
  console.error('Login Error:', err.response?.data || err.message);
  alert(err.response?.data.detail || 'Login failed');
}


  }
  }
    useEffect(() => {
      form.resetFields()
    }, [authMode])
    return (

      <div className="bg-white p-8 rounded-2xl  shadow-lg w-full max-w-xl">
        <Form
          {...layout}
          form={form}
          name="auth"
          onFinish={onFinish}
          style={{ maxWidth: 600 }}
          layout='vertical'
          validateMessages={validateMessages}
        >
          {<h1 className='text-4xl md:text-5xl font-bold text-center mb-5'>{authMode == 'signup' ? 'Create Account' : 'Login'}</h1>}
          {authMode == 'signup' ? <Form.Item name={['user', 'name']} label="Username" rules={[{ required: true }]}>
            <Input className="border-2 border-gray-300 focus:!border-purple-600 hover:!border-purple-600 !py-2 px-4 text-lg rounded-md" />
          </Form.Item> : ""}
          <Form.Item name={['user', 'email']} label="Email" rules={[{ type: 'email', required: true }]}>
            <Input className="focus:!border-purple-600 hover:!border-purple-600 border-2 border-gray-300 !py-2 px-4 text-lg rounded-md" />
          </Form.Item>
          <Form.Item name={['user', 'password']} label="Password" rules={[
            {
              required: true,
              pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/,
              message:
                'Password must be at least 8 characters, include upper and lower case, number, and special character.',
            },
          ]}>
            <Input.Password iconRender={(visible) => (visible ? <FaUnlock color='gray' /> : <FaLock color='gray' />)} className="  border-2 border-gray-300 !py-2 px-4 text-lg rounded-md active:!border-purple-600 focus:!border-purple-600 hover:!border-purple-600" />
          </Form.Item>
          <div className="text-sm flex justify-end mb-5">
            <p onClick={onForgetPasswordClick} className="font-medium text-blue-800 hover:text-blue-700 cursor-pointer">
              Forgot your password?
            </p>
          </div>
          <Form.Item label={null}>
             <Button
              className="!bg-purple-600 hover:!bg-purple-500 active:!bg-purple-700 focus:!ring-4 focus:!ring-purple-300 !text-white w-full rounded-md transition-all duration-200 ease-in-out"
              type='primary'
              size='large'
              htmlType="submit" // Add this line
            >
              {authMode === 'signup' ? 'Sign Up' : 'Login'}
              </Button>
   
            <p className='text-center my-3'>or</p>
            <Button startIcon={<FcGoogle />
            } size='large' className='w-full bg-gray-50 !border-white !shadow-2xs !shadow-gray-300'>
              Continue With Google
            </Button>

          </Form.Item>
          <div>
            {authMode === 'signup' ? (
              <p className='text-center'>
                Already have an account?{' '}
                <span className='text-purple-600 cursor-pointer' onClick={() => setAuthMode('login')}>
                  Login
                </span>
              </p>
            ) : (
              <p className='text-center'>
                Don't have an account?{' '}
                <span className='text-purple-600 cursor-pointer' onClick={() => setAuthMode('signup')}>
                  Signup
                </span>
              </p>
            )}
          </div>
        </Form>
      </div>

    )
  }
  export default AuthForm