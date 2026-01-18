import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Sun, Moon, Trash2, PlusCircle, Calculator, ChevronRight } from 'lucide-react';
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

  // Model State
  const [selectedModel, setSelectedModel] = useState('groq-llama3.3');

  const models = [
    { id: 'groq-llama3.3', name: 'DeepSeek-Math', icon: '🧠' },
    { id: 'groq-math-wizard', name: 'Math Wizard', icon: '🧙‍♂️' },
    { id: 'groq-qwen2.5', name: 'Qwen 2.5 Math', icon: '➗' },
    { id: 'groq-llama3.1', name: 'LLaMA 3.1 8B', icon: '⚡' },
    { id: 'gemini', name: 'Gemini 1.5 Pro', icon: '✨' },
  ];

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: userMessage.content,
          model_provider: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = {
        role: 'assistant',
        content: data.response,
        steps: data.steps
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
    }
  };

  return (
    <div className="flex h-screen bg-primary dark:bg-primary-dark transition-colors duration-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[280px] bg-secondary dark:bg-secondary-dark border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col transition-colors duration-300 z-10">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent blur-md opacity-30 rounded-full"></div>
              <div className="relative p-2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 rounded-xl">
                <Calculator className="w-5 h-5 text-white dark:text-slate-900" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">SolveX</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-400" />}
          </button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-accent hover:bg-accent-hover text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="text-sm">New Calculation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">History</div>
          {history.map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat.id)}
              className={`
                group relative flex items-center px-4 py-3 rounded-lg cursor-pointer transition-all duration-200
                ${activeChatId === chat.id
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}
              `}
            >
              <div className="flex-1 min-w-0 pr-8">
                <h3 className={`text-sm font-medium truncate ${activeChatId === chat.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {chat.title || 'Untitled Calculation'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(chat.date).toLocaleDateString()}</p>
              </div>
              <button
                onClick={(e) => deleteChat(e, chat.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded-md transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-400 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              US
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">User Account</span>
              <span className="text-xs text-slate-400">Pro Plan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-primary dark:bg-primary-dark">
        {/* Header (Mobile) could go here */}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 pb-40">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm"
                >
                  <Sparkles className="w-12 h-12 text-accent" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400 mb-6 tracking-tight"
                >
                  What can I solve for you?
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-slate-500 max-w-lg leading-relaxed"
                >
                  Ready to tackle complex math problems, algebraic equations, and step-by-step logic.
                </motion.p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex gap-6 mb-8 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}

                    <div className={`
                      relative max-w-[85%] md:max-w-[75%] 
                      ${msg.role === 'user' ? 'bg-accent text-white shadow-xl shadow-blue-500/10 rounded-[2rem] rounded-tr-md px-6 py-4' : 'w-full'}
                    `}>
                      {msg.role === 'assistant' ? (
                        <div className="space-y-4">
                          {msg.steps && msg.steps.length > 0 && (
                            <ThinkingProcess steps={msg.steps} isComplete={true} />
                          )}
                          <div className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-light">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium pt-2">
                      <span>Analyzing problem matches...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Floating Capsule */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Model Pills */}
            <div className="flex justify-center mb-4 gap-2">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`
                      px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all border
                      ${selectedModel === model.id
                      ? 'bg-accent/10 border-accent/20 text-accent shadow-sm'
                      : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white/80'}
                    `}
                >
                  <span className="mr-1.5">{model.icon}</span>
                  {model.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="relative group">
              <div className="relative flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/50 overflow-hidden">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask any math question..."
                  disabled={isLoading}
                  className="w-full bg-transparent text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 px-6 py-4 focus:outline-none"
                />
                <div className="pr-3">
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-3 rounded-2xl bg-accent hover:bg-accent-hover text-white disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
            <div className="text-center mt-3">
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase opacity-60">
                Powered by SolveX Engine • LateX Support Enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
