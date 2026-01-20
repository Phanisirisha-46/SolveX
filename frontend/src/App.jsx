import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Sun, Moon, Trash2, PlusCircle, Calculator, ChevronRight, Brain, Zap, Box, Star, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ThinkingProcess from './components/ThinkingProcess';

function App() {
  // Access Control State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode.toLowerCase() === "rabbit") {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  });

  // Model State
  const [selectedModel, setSelectedModel] = useState('groq-llama3.3');

  const models = [
    { id: 'groq-llama3.3', name: 'LLaMA-3.3-70B', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'groq-qwen2.5', name: 'Qwen-2.5-32B', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'groq-math-wizard', name: 'Gemma-2-9B', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'groq-llama3.1', name: 'LLaMA-3.1-8B', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'gemini', name: 'Gemini', icon: <Star className="w-3.5 h-3.5" /> },
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

  // Image State
  const [selectedImage, setSelectedImage] = useState(null); // Data URL for preview
  const [selectedImageFile, setSelectedImageFile] = useState(null); // Base64 for sending
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 1. Create an image to load the file
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        // 2. Calculate new size (max width 600px - aggressive for mobile/Vercel)
        const maxWidth = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // 3. Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 4. Get compressed Base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // 50% quality

        setSelectedImage(dataUrl);
        // Extract base64 part only
        const base64String = dataUrl.split(',')[1];
        setSelectedImageFile(base64String);

        // Clean up
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        console.error("Failed to load image for resizing");
        alert("Failed to process image. Please try another one.");
      };
    }
  };

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

    const userMessage = {
      role: 'user',
      content: input,
      image: selectedImage // Add image to local state for rendering
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      console.log("Sending payload...", {
        model: selectedModel,
        hasImage: !!selectedImageFile
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: userMessage.content || "Analyze this image",
          model_provider: selectedModel,
          image_data: selectedImageFile
        }),
      });

      // Reset image after sending
      setSelectedImage(null);
      setSelectedImageFile(null);

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

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md p-8"
        >
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 p-8 flex flex-col items-center">

            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 mb-2">
              SolveX Access
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 text-center">
              Please enter the access code to continue.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter code"
                  className={`
                    w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border outline-none transition-all
                    ${authError
                      ? 'border-red-500 ring-2 ring-red-500/20 text-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white'}
                  `}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-shadow"
              >
                Access System
              </motion.button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-semibold">
              <Box className="w-3 h-3" />
              <span>Protected Environment</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

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
                        <div className="flex flex-col gap-2">
                          {msg.image && (
                            <img src={msg.image} alt="User upload" className="max-w-full rounded-lg border border-white/20" />
                          )}
                          <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                        </div>
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
              <div className="relative flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 transition-all focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/50 overflow-hidden">

                {/* Image Preview */}
                {selectedImage && (
                  <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                    <div className="relative group/image">
                      <img src={selectedImage} alt="Upload preview" className="h-16 w-auto rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => { setSelectedImage(null); setSelectedImageFile(null); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity shadow-md"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Image attached</span>
                  </div>
                )}

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="pl-4 text-slate-400 hover:text-accent transition-colors"
                    title="Upload Image"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedImage ? "Add context about this image..." : "Ask any math question..."}
                    disabled={isLoading}
                    className="w-full bg-transparent text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 px-4 py-4 focus:outline-none"
                  />
                  <div className="pr-3">
                    <button
                      type="submit"
                      disabled={(!input.trim() && !selectedImage) || isLoading}
                      className="p-3 rounded-2xl bg-accent hover:bg-accent-hover text-white disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
            <div className="text-center mt-3">
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase opacity-60">
                Powered by SolveX Engine • Copyrights 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
