import React, { useState } from 'react'
import AuthForm from '../components/auth/AuthForm'
import ForgetPasswordForm from '../components/auth/ForgotPasswordForm'  
const Auth = () => {
    const [showForgetPassword, setShowForgetPassword] = useState(false);
  return (
    <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-700 opacity-90"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20" 
          style={{ backgroundImage: "url('https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')" }}
        ></div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 ">
        <div className="p-4  flex flex-col md:flex-row items-center justify-center gap-6">
      <div className='text-center -mt-52'>
        <img src="/logo_white.png" alt="" className='block'/>
        <h1 className='text-4xl font-bold text-white mb-8 -mt-24'>Welcome to ARTDUNIYA </h1>
        <p className='text-white md:ms-8 ms-auto me-auto max-w-xs md:max-w-none text-sm md:text-base'>A blockchain-powered platform that ensures your digital artwork remains yours, prevents unauthorized use, and creates ethical revenue streams.</p>
      
      </div>
     {showForgetPassword ? (
            <ForgetPasswordForm onBack={()=>setShowForgetPassword(false)}/>
          ) : (
            <AuthForm onForgetPasswordClick={() => setShowForgetPassword(true)} />
          )}
    </div>
        </div>
      </div>
  )
}

export default Auth
