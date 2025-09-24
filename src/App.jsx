import React from 'react'
import AppRoutes from './routes/Approutes'
import { Toaster } from "react-hot-toast";
import Chatbot from './components/Chatbot/Chatbot';

const App = () => {
  return (
    <>
      <AppRoutes />
      <Chatbot />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  )
}
export default App;