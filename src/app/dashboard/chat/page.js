'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, AlertCircle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

const MOCK_CHAT_HISTORY = [
  {
    id: 1,
    role: 'bot',
    content: "Hello! I'm Kairox AI, your factory intelligence assistant. I can help you analyze orders, track delays, or find air-freight risks. How can I help you today?",
    time: '09:00 AM'
  },
  {
    id: 2,
    role: 'user',
    content: "Which orders are at risk of air freight right now?",
    time: '09:02 AM'
  },
  {
    id: 3,
    role: 'bot',
    content: "I found **2 orders** currently at risk of air freight due to delays:\n\n1. **ORD-8F92A (Acne Studios)**: Delayed by 4 days in the *Stitching* stage. Estimated air freight penalty risk: high.\n2. **ORD-3B19C (Zara)**: Delayed by 3 days in *Cutting*.\n\nWould you like me to suggest a resource reallocation plan to speed these up?",
    time: '09:02 AM'
  }
];

export default function AIChatPage() {
  const [messages, setMessages] = useState(MOCK_CHAT_HISTORY);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const newUserMsg = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Mock bot response after delay
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        role: 'bot',
        content: "I'm currently running on **Mock Data mode**. In the future, I will be connected to the live backend to give you real-time intelligence on this query!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px] animate-fade-in max-w-5xl mx-auto">
      
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#c8834a' }} />
            AI Operations Assistant
          </h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
            Ask questions about orders, delays, and worker performance.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(200,131,74,0.1)', border: '1px solid rgba(200,131,74,0.2)' }}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#c8834a' }}></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: '#c8834a' }}></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#c8834a' }}>AI Active (Mock)</span>
        </div>
      </div>

      {/* ─── CHAT WINDOW ─── */}
      <SpotlightCard className="flex-1 bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col relative" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.05)">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" style={{ background: 'linear-gradient(to bottom, #ffffff, #faf6f0)' }}>
          
          <div className="flex justify-center mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isBot = msg.role === 'bot';
            
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isBot ? 'self-start' : 'ml-auto flex-row-reverse'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white`}
                     style={{ background: isBot ? 'linear-gradient(135deg, #c8834a, #e8a06a)' : 'linear-gradient(135deg, #2d1f0e, #5a3e28)' }}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-1.5 ${isBot ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>
                      {isBot ? 'Kairox AI' : 'You'}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: 'rgba(154,122,90,0.6)' }}>{msg.time}</span>
                  </div>
                  
                  <div className={`px-5 py-3.5 text-sm leading-relaxed shadow-sm font-medium ${
                    isBot 
                      ? 'bg-white rounded-2xl rounded-tl-sm' 
                      : 'text-white rounded-2xl rounded-tr-sm'
                  }`}
                  style={isBot ? { border: '1px solid rgba(200,131,74,0.15)', color: '#2d1f0e' } : { background: 'linear-gradient(135deg, #2d1f0e, #5a3e28)' }}>
                    {/* Render newlines properly for mock bot responses */}
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={line === '' ? 'h-2' : ''}>
                        {/* Very simple bold parsing for mock data */}
                        {line.split('**').map((part, index) => 
                          index % 2 === 1 ? <strong key={index} className={isBot ? 'font-black' : 'font-black text-white'} style={isBot ? { color: '#c8834a' } : {}}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 max-w-[85%] self-start">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-5 py-4 bg-white rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#c8834a', animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#c8834a', animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#c8834a', animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* ─── INPUT AREA ─── */}
        <div className="p-4 bg-white relative z-10" style={{ borderTop: '1px solid rgba(200,131,74,0.15)' }}>
          <form onSubmit={handleSend} className="relative flex items-end gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask about delays, worker efficiency, or air freight risks..."
                className="w-full rounded-2xl pl-4 pr-12 py-3.5 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-[#c8834a]/30 resize-none"
                rows="1"
                style={{ 
                  minHeight: '52px', maxHeight: '120px', 
                  background: '#faf6f0', 
                  border: '1.5px solid rgba(200,131,74,0.2)', 
                  color: '#2d1f0e' 
                }}
              />
              <button 
                type="button" 
                className="absolute right-3 bottom-3 transition-colors"
                title="AI context options"
                style={{ color: '#9a7a5a' }}
                onMouseEnter={e => e.currentTarget.style.color = '#c8834a'}
                onMouseLeave={e => e.currentTarget.style.color = '#9a7a5a'}
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-[52px] px-5 text-white rounded-2xl flex items-center justify-center transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9a7a5a' }}>
              AI responses are based on real-time data. Check <span className="underline cursor-pointer transition-colors" style={{ color: '#c8834a' }}>Traceability Logs</span> for exact events.
            </p>
          </div>
        </div>

      </SpotlightCard>
    </div>
  );
}
