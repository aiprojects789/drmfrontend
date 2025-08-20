import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { isLogin } = useContext(AuthContext)

  if (!isLogin) {
      return <Navigate to="/auth" replace  alert={'You must be logged in to view this page.'}/>
    }
    
    

    return children
}

export default ProtectedRoute