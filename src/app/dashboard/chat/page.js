'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Sparkles, AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px] animate-fade-in">
      
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            AI Operations Assistant
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Ask questions about orders, delays, and worker performance.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">AI Active (Mock)</span>
        </div>
      </div>

      {/* ─── CHAT WINDOW ─── */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          
          <div className="flex justify-center mb-6">
            <span className="bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isBot = msg.role === 'bot';
            
            return (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isBot ? 'self-start' : 'ml-auto flex-row-reverse'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBot ? 'bg-indigo-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-1 ${isBot ? 'items-start' : 'items-end'}`}>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isBot ? 'Kairox AI' : 'You'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-300">{msg.time}</span>
                  </div>
                  
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isBot 
                      ? 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm' 
                      : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                  }`}>
                    {/* Render newlines properly for mock bot responses */}
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={line === '' ? 'h-2' : ''}>
                        {/* Very simple bold parsing for mock data */}
                        {line.split('**').map((part, index) => 
                          index % 2 === 1 ? <strong key={index} className={isBot ? 'text-slate-900' : 'text-white'}>{part}</strong> : part
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
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-4 rounded-2xl bg-white border border-slate-100 rounded-tl-sm flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* ─── INPUT AREA ─── */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="relative flex items-end gap-2 max-w-4xl mx-auto">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                rows="1"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
              <button 
                type="button" 
                className="absolute right-3 bottom-3 text-slate-400 hover:text-indigo-600 transition-colors"
                title="AI context options"
              >
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-[52px] px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] text-slate-400 font-medium">
              AI responses are generated based on real-time shop floor data. Check <span className="underline cursor-pointer hover:text-slate-600">Traceability Logs</span> for exact events.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
