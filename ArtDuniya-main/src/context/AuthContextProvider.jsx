import React, { useState } from 'react'
import AuthContext from './AuthContext'

const AuthContextProvider = ({children}) => {
    const [isLogin, setIsLogin] = useState(false)
  return (
    <AuthContext.Provider value={{isLogin,setIsLogin}}>{children}</AuthContext.Provider>
  )
}

export default AuthContextProvider