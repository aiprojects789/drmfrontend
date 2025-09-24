import React from 'react';

export const ChatbotIcon = ({ size = 24, isOpen = false }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Robot head */}
    <circle cx="12" cy="10" r="8" fill="url(#gradient)" stroke="white" strokeWidth="1.5"/>
    
    {/* Antenna */}
    <circle cx="12" cy="2" r="1.5" fill="#FFD700"/>
    <line x1="12" y1="3.5" x2="12" y2="5" stroke="#FFD700" strokeWidth="1.5"/>
    
    {/* Eyes */}
    <circle cx="9" cy="9" r="1.2" fill="white"/>
    <circle cx="15" cy="9" r="1.2" fill="white"/>
    <circle cx="9" cy="9" r="0.5" fill="#667eea"/>
    <circle cx="15" cy="9" r="0.5" fill="#667eea"/>
    
    {/* Smile */}
    <path d="M9 13 Q12 15 15 13" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    
    {/* Pulsing effect when open */}
    {isOpen && (
      <circle cx="12" cy="10" r="10" fill="none" stroke="rgba(102, 126, 234, 0.3)" strokeWidth="2">
        <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite"/>
      </circle>
    )}
    
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#667eea"/>
        <stop offset="100%" stopColor="#764ba2"/>
      </linearGradient>
    </defs>
  </svg>
);

export const CloseIcon = ({ size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="url(#closeGradient)"/>
    <path d="M15 9L9 15M9 9L15 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="closeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#cd22e0ff"/>
        <stop offset="100%" stopColor="#4327e6ff"/>
      </linearGradient>
    </defs>
  </svg>
);