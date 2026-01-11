import React, { useState, useRef, useEffect } from 'react';

import { Send, Bot, User, Loader2, Sparkles, Sun, Moon, Trash2, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ThinkingProcess from './components/ThinkingProcess';

function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]); // For thinking process
  const messagesEndRef = useRef(null);

  // History State
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(history));
  }, [history]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentSteps([]);
    setActiveChatId(Date.now());
  };

  const loadChat = (chatId) => {
    const chat = history.find(h => h.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setActiveChatId(chatId);
    }
  };

  const deleteChat = (e, chatId) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== chatId));
    if (activeChatId === chatId) {
      startNewChat();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentSteps([]); // Reset steps for new turn

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_text: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = {
        role: 'assistant',
        content: data.response,
        steps: data.steps // Store steps in message
      };

      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      // Save to history
      const chatId = activeChatId || Date.now();
      if (!activeChatId) setActiveChatId(chatId);

      setHistory(prev => {
        const existingIndex = prev.findIndex(h => h.id === chatId);
        const chatEntry = {
          id: chatId,
          title: userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : ''),
          messages: updatedMessages,
          date: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          const newHistory = [...prev];
          newHistory[existingIndex] = chatEntry;
          return newHistory;
        } else {
          return [chatEntry, ...prev];
        }
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
      setCurrentSteps([]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-black hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-black dark:bg-white rounded-full transition-colors duration-200">
              <Sparkles className="w-4 h-4 text-white dark:text-black fill-current" />
            </div>
            <span className="font-semibold text-lg">SolveX</span>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">History</div>
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors mb-4 border border-gray-200 dark:border-gray-700"
          >
            <PlusCircle className="w-4 h-4" />
            New Chat
          </button>

          <div className="space-y-1">
            {history.map((chat) => (
              <div
                key={chat.id}
                className={`
                        group flex items-center justify-between p-2 rounded cursor-pointer text-sm transition-colors
                        ${activeChatId === chat.id
                    ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}
                    `}
                onClick={() => loadChat(chat.id)}
              >
                <span className="truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => deleteChat(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500"></div>
            <span>User</span>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-gray-800/50 transition-colors duration-200">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto space-y-6 pb-32">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4 transition-colors">
                  <Sparkles className="w-8 h-8 text-black dark:text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">How can I help you today?</h2>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 border border-green-400/20 shadow-lg shadow-green-500/10">
                        <Sparkles className="w-5 h-5 text-white fill-white" />
                      </div>
                    )}

                    <div className={`
                            relative max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user'
                        ? 'bg-gray-100 dark:bg-[#2f2f2f] text-gray-800 dark:text-white'
                        : 'bg-white dark:bg-transparent text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-none'}
                        `}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {msg.steps && msg.steps.length > 0 && (
                            <ThinkingProcess steps={msg.steps} isComplete={true} />
                          )}
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 animate-pulse">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm pt-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Thinking...
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 dark:from-gray-900 dark:via-gray-900 to-transparent pt-10 pb-6 px-4 transition-colors duration-200">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message SolveX..."
                disabled={isLoading}
                className="w-full bg-white dark:bg-[#2f2f2f] text-gray-900 dark:text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-500 shadow-lg dark:shadow-xl placeholder-gray-500 dark:placeholder-gray-400 transition-all border border-gray-200 dark:border-transparent focus:border-gray-400 dark:focus:border-gray-600"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-black dark:bg-white disabled:bg-gray-300 dark:disabled:bg-gray-500 disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
              >
                <Send className="w-4 h-4 text-white dark:text-black" />
              </button>
            </form>
            <div className="text-center text-xs text-gray-500 mt-2">
              SolveX can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
