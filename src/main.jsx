import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { Web3Provider } from './context/Web3Context'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router> {/* Router at the top level */}
      <Web3Provider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Web3Provider>
    </Router>
  </React.StrictMode>,
)