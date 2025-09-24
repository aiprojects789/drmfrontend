import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Bot, Sparkles, Shield, Zap, Lock, X } from "lucide-react";
import { chatbotAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Welcome message when first opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        role: "bot",
        content: `🤖 **Welcome to XDRM AI Assistant!** 

I'm your intelligent guide for everything related to digital artwork protection. Here's what I can help you with:

✨ **Artwork Protection** - Secure your digital creations
🔗 **Blockchain Registration** - Immutable ownership records
📜 **Licensing Management** - Control how your art is used
🔍 **Piracy Detection** - Monitor unauthorized usage
💰 **Royalty Systems** - Automate payments and earnings

*What would you like to know about protecting your digital artwork?*`
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Prepare user context if authenticated
      const userContext = isAuthenticated && user ? {
        user_id: user.id,
        username: user.username,
        role: user.role,
        wallet_address: user.wallet_address
      } : null;

      const response = await chatbotAPI.sendMessage(input, userContext);
      
      const botMessage = { 
        role: "bot", 
        content: response.response || chatbotAPI.getFallbackResponse(input)
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
    } catch (error) {
      console.error("Chatbot error:", error);
      
      // Use fallback response
      const botMessage = { 
        role: "bot", 
        content: `⚠️ **Connection Issue**\n\nI'm having trouble connecting right now, but here's what I can tell you:\n\n${chatbotAPI.getFallbackResponse(input)}\n\n*Please try again in a moment!*`
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    // Add new welcome message after clear
    setTimeout(() => {
      const welcomeMessage = {
        role: "bot",
        content: "🔮 **Conversation cleared!**\n\nHow can I assist you with your digital artwork protection needs today?"
      };
      setMessages([welcomeMessage]);
    }, 300);
  };

  // Quick action buttons
  const quickActions = [
    { icon: Shield, label: "Protect Artwork", question: "How do I protect my digital artwork?" },
    { icon: Lock, label: "Blockchain", question: "How does blockchain registration work?" },
    { icon: Zap, label: "Licensing", question: "Tell me about licensing options" },
    { icon: Sparkles, label: "Piracy", question: "How does piracy detection work?" }
  ];

  // Format message content with light theme styling
  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #7c3aed; font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #8b5cf6;">$1</em>')
      .replace(/\n/g, '<br />')
      .replace(/✨/g, '<span style="color: #f59e0b;">✨</span>')
      .replace(/🔗/g, '<span style="color: #3b82f6;">🔗</span>')
      .replace(/📜/g, '<span style="color: #10b981;">📜</span>')
      .replace(/🔍/g, '<span style="color: #ef4444;">🔍</span>')
      .replace(/💰/g, '<span style="color: #f59e0b;">💰</span>')
      .replace(/🤖/g, '<span style="color: #7c3aed;">🤖</span>')
      .replace(/⚠️/g, '<span style="color: #ef4444;">⚠️</span>')
      .replace(/🔮/g, '<span style="color: #8b5cf6;">🔮</span>');
  };

  return (
    <>
      {/* Enhanced Floating Chat Button - Always Blue-Purple */}
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        right: '30px', 
        zIndex: 1000 
      }}>
        {/* Pulsing glow effect - Blue-Purple */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.1) 70%, transparent 100%)',
            animation: isOpen ? 'pulse-glow 2s infinite' : 'none',
            zIndex: -1
          }}
        />
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Always blue-purple
            border: '3px solid white',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 4px rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(90deg) scale(1.1)' : 'scale(1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = isOpen ? 'rotate(90deg) scale(1.15)' : 'scale(1.15)';
            e.target.style.boxShadow = '0 15px 50px rgba(102, 126, 234, 0.6), 0 0 0 6px rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = isOpen ? 'rotate(90deg) scale(1.1)' : 'scale(1)';
            e.target.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 4px rgba(255, 255, 255, 0.1)';
          }}
        >
          {/* Animated rings */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            animation: 'rotate 3s linear infinite',
            zIndex: 1
          }} />
          
          {/* Icon */}
          <div style={{ zIndex: 2, position: 'relative' }}>
            {isOpen ? <X size={28} /> : <Bot size={32} />}
          </div>
          
          {/* Notification dot */}
          {!isOpen && messages.length > 1 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: '2px solid white',
              animation: 'pulse 2s infinite'
            }} />
          )}
        </button>
        
        {/* Assistant label */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          opacity: isOpen ? 0 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}>
          🤖 AI Assistant
        </div>
      </div>

      {/* Chat Panel with Slide Animation */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? '0' : '-420px', // Slide in from right
          width: '420px',
          height: '100vh',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          boxShadow: '-20px 0px 60px rgba(0, 0, 0, 0.1)',
          transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Header - Blue-Purple Gradient */}
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={24} color="white" />
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: '700',
                color: 'white'
              }}>
                XDRM AI
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: '11px', 
                  fontWeight: '500' 
                }}>
                  Online • Ready to assist
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={clearChat}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Sparkles size={12} />
              Clear
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div style={{
            padding: '16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '12px', 
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              Quick actions:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInput(action.question)}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    color: '#374151',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.borderColor = '#667eea';
                    e.target.style.color = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.color = '#374151';
                  }}
                >
                  <action.icon size={10} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'white'
        }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '10px',
                maxWidth: '100%',
                flexDirection: msg.role === "user" ? "row-reverse" : "row"
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '12px',
                  background: msg.role === "user" 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  {msg.role === "user" ? 
                    (user?.username?.charAt(0)?.toUpperCase() || "U") : 
                    <Bot size={14} />
                  }
                </div>
              </div>
              <div style={{ 
                flex: 1, 
                maxWidth: 'calc(100% - 42px)'
              }}>
                <div style={{
                  background: msg.role === "user" 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  color: msg.role === "user" ? 'white' : '#374151',
                  lineHeight: '1.4',
                  border: msg.role === "user" ? 'none' : '1px solid #e5e7eb',
                  borderTopRightRadius: msg.role === "user" ? '4px' : '16px',
                  borderTopLeftRadius: msg.role === "user" ? '16px' : '4px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessage(msg.content) 
                    }}
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{
              display: 'flex',
              gap: '10px',
              maxWidth: '100%'
            }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: '2px solid white'
                }}>
                  <Bot size={14} />
                </div>
              </div>
              <div style={{ flex: 1, maxWidth: 'calc(100% - 42px)' }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderTopLeftRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '4px',
                    alignItems: 'center',
                    color: '#667eea',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span style={{
                        height: '4px',
                        width: '4px',
                        background: '#667eea',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite ease-in-out'
                      }}></span>
                      <span style={{
                        height: '4px',
                        width: '4px',
                        background: '#667eea',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite ease-in-out',
                        animationDelay: '0.2s'
                      }}></span>
                      <span style={{
                        height: '4px',
                        width: '4px',
                        background: '#667eea',
                        borderRadius: '50%',
                        animation: 'typing 1.4s infinite ease-in-out',
                        animationDelay: '0.4s'
                      }}></span>
                    </div>
                    XDRM AI is thinking...
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px',
          background: '#f8fafc',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                background: 'white',
                color: '#374151',
                fontSize: '13px',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              placeholder="Ask about artwork protection, blockchain, licensing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 16px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px'
              }}
              onMouseEnter={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && input.trim()) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay when chatbot is open */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
            animation: 'fadeIn 0.3s ease-out'
          }}
        />
      )}

      {/* Enhanced CSS Animations */}
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.4;
            }
            50% { 
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 0.6;
            }
          }
          
          @keyframes pulse {
            0%, 100% { 
              opacity: 1;
              transform: scale(1);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
          
          @keyframes rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes typing {
            0%, 80%, 100% { 
              transform: scale(0.8); 
              opacity: 0.5;
            }
            40% { 
              transform: scale(1.2); 
              opacity: 1;
            }
          }
          
          /* Scrollbar styling */
          ::-webkit-scrollbar {
            width: 4px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 2px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          
          @media (max-width: 768px) {
            .chatbot-sidebar {
              width: 100vw !important;
            }
          }
        `}
      </style>
    </>
  );
}