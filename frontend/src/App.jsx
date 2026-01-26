import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Sun, Moon, Trash2, PlusCircle, Calculator, ChevronRight, Brain, Zap, Box, Star, Image, ShieldCheck, Cpu, Lock as LockIcon, Mic, MicOff, BarChart3, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ThinkingProcess from './components/ThinkingProcess';
import PerformanceMetricsModal from './components/PerformanceMetricsModal';

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
    { id: 'gemma-2-9b', name: 'Gemma-2-9B', icon: <Sparkles className="w-3.5 h-3.5" /> },
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

  // Dictation State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Browser does not support speech recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // --- USER PROFILE STATE ---
  const [username, setUsername] = useState('Guest');
  const [userRole, setUserRole] = useState('User');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  // --- METRICS STATE ---
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [modelStats, setModelStats] = useState(() => {
    const saved = localStorage.getItem('solveX_modelStats');
    return saved ? JSON.parse(saved) : {};
  });

  // Save metrics on change (removed localStorage, now purely backend sync)
  useEffect(() => {
    // Initial fetch from backend
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setModelStats(data);
        }
      })
      .catch(err => console.error("Failed to fetch persistent stats:", err));
  }, []);

  const updateStats = (model, category, type, value) => {
    // 1. Optimistic Update (UI)
    setModelStats(prev => {
      const newStats = { ...prev };
      if (!newStats[model]) newStats[model] = {};
      if (!newStats[model][category]) newStats[model][category] = { total: 0, likes: 0, compliance: 0 };

      if (type === 'init') {
        newStats[model][category].total += 1;
      } else if (type === 'vote') {
        if (value) newStats[model][category].likes += 1;
      } else if (type === 'compliance') {
        if (value) newStats[model][category].compliance += 1;
      }
      return newStats;
    });

    // 2. Persistent Update (Backend)
    const payload = {
      model,
      category,
      event_type: type,
      value: value === null ? null : value // Explicit null for init
    };

    // Fire and forget
    fetch('/api/stats/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Failed to persist vote:", err));
  };

  const handleVote = (index, isUpvote) => {
    // 1. Update Active Messages
    setMessages(prev => {
      const newMessages = [...prev];
      const msg = newMessages[index];

      if (!msg || !msg.model || !msg.category) return prev;
      if (msg.userVote) return prev; // Prevent double voting

      newMessages[index] = { ...msg, userVote: isUpvote ? 'up' : 'down' };

      // Update stats (Backend Sync)
      updateStats(msg.model, msg.category, 'vote', isUpvote);

      return newMessages;
    });

    // 2. Update History (Local Storage Persistence)
    if (activeChatId) {
      setHistory(prevHistory => {
        return prevHistory.map(chat => {
          if (chat.id === activeChatId) {
            const updatedMessages = [...chat.messages];
            // Verify index bounds just in case
            if (updatedMessages[index]) {
              updatedMessages[index] = { ...updatedMessages[index], userVote: isUpvote ? 'up' : 'down' };
            }
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        });
      });
    }
  };

  // Load profile on mount
  useEffect(() => {
    const savedName = localStorage.getItem('solveX_username');
    if (savedName) {
      setUsername(savedName);
      checkRole(savedName);
    }
  }, []);

  const checkRole = (name) => {
    if (name.trim().toLowerCase() === 'veerankiphanisirisha') {
      setUserRole('Admin');
    } else {
      setUserRole('User');
    }
  };

  const handleSaveProfile = () => {
    if (!tempUsername.trim()) return;
    setUsername(tempUsername);
    localStorage.setItem('solveX_username', tempUsername);
    checkRole(tempUsername);
    setIsProfileOpen(false);
  };

  const openProfile = () => {
    setTempUsername(username);
    setIsProfileOpen(true);
  };

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
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      image: selectedImage
    };

    // Create a placeholder for the bot response immediately
    const initialBotMessage = {
      role: 'assistant',
      content: '', // Will fill this via stream tokens
      steps: [],   // Will fill this via stream steps
      model: selectedModel, // Track model for stats
      category: 'Other'     // Default category, updated via stream
    };


    const newMessages = [...messages, userMessage, initialBotMessage];
    setMessages(newMessages);

    // Save payload vars before clearing state
    const payload = {
      input_text: userMessage.content || "Analyze this image",
      model_provider: selectedModel,
      image_data: selectedImageFile
    };

    setInput('');
    setIsLoading(true);

    // Clear image state
    setSelectedImage(null);
    setSelectedImageFile(null);

    try {
      console.log("Sending payload...", { model: selectedModel, hasImage: !!payload.image_data });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Streaming Handler
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Local accumulator for history saving
      let finalContent = '';
      let finalSteps = [];

      // --- SMOOTH STREAMING SETUP ---
      let pendingQueue = '';
      let currentDisplayContent = '';
      let isStreamingDone = false;

      // Consumer Loop (UI Updater) - ~50fps - Strict character-by-character
      const streamInterval = setInterval(() => {
        if (pendingQueue.length > 0) {
          // If stream is done (network closed), flush the buffer INSTANTLY (User request: "give end fast")
          // Otherwise, stream 1 char at a time for smooth "typing" while generating
          const charsToTake = isStreamingDone ? pendingQueue.length : 1;

          const chunk = pendingQueue.slice(0, charsToTake);
          pendingQueue = pendingQueue.slice(charsToTake);
          currentDisplayContent += chunk;

          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              const lastMsg = { ...updated[updated.length - 1] };
              if (lastMsg.role === 'assistant') {
                lastMsg.content = currentDisplayContent;
                updated[updated.length - 1] = lastMsg;
              }
            }
            return updated;
          });
        } else if (isStreamingDone) {
          clearInterval(streamInterval);
          clearInterval(streamInterval);

          // Final History Update

          // Final History Update
          const chatId = activeChatId || Date.now();
          if (!activeChatId) setActiveChatId(chatId);

          const finalBotMessage = {
            role: 'assistant',
            content: finalContent,
            steps: finalSteps
          };

          const messagesForHistory = [...newMessages];
          messagesForHistory[messagesForHistory.length - 1] = finalBotMessage;

          setHistory(prev => {
            const existingIndex = prev.findIndex(h => h.id === chatId);
            const chatEntry = {
              id: chatId,
              title: userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '') || "Image Analysis",
              messages: messagesForHistory,
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

          // Auto-Track COMPLIANCE (System Integrity)
          // Pass if we successfully parsed at least one Step or structured content
          const hasSteps = finalSteps.length > 0;
          const usedcategory = newMessages[newMessages.length - 1].category || 'Other';
          updateStats(selectedModel, usedcategory, 'init', null); // Increment total
          updateStats(selectedModel, usedcategory, 'compliance', hasSteps);

          // Stop loading state ONLY after everything is visually done
          setIsLoading(false);
        }
      }, 20);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);

                if (data.type === 'token') {
                  // Buffer tokens instead of direct update
                  pendingQueue += data.content;
                  finalContent += data.content;
                } else if (data.type === 'step') {
                  finalSteps.push(data.data);
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = { ...updated[updated.length - 1] };
                    lastMsg.steps = [...(lastMsg.steps || []), data.data];

                    // Capture Category from backend if present
                    if (data.data.category) {
                      lastMsg.category = data.data.category;
                    }

                    updated[updated.length - 1] = lastMsg;
                    return updated;
                  });
                } else if (data.type === 'done') {
                  // Stream finished signal
                } else if (data.type === 'error') {
                  console.error("Stream error:", data.message);
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg.role === 'assistant') {
                      lastMsg.content = `**System Error:** ${data.message}`;
                    }
                    return updated;
                  });
                }
              } catch (parseError) {
                console.error("JSON Parse Error on line:", line, parseError);
              }
            }
          }

          if (done) break;
        }
      } finally {
        isStreamingDone = true;
      }

    } catch (error) {
      clearInterval(streamInterval);
      console.error('Failed to send message:', error);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1].content = "Sorry, I encountered an error. Please try again.";
        }
        return updated;
      });
      setIsLoading(false);
    }
    // no finally block for loading here, handled by consumer loop
  };

  // Vault State
  const [vaultState, setVaultState] = useState('closed'); // closed, open, processing, success, error
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const handleVaultClick = () => {
    if (vaultState === 'closed') {
      setVaultState('open');
      setTimeout(() => inputRefs.current[0]?.focus(), 500);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1); // Only take last char
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit check
    const code = newOtp.join('').toLowerCase();
    if (code.length === 6 && index === 5 && value) {
      verifyCode(code);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = (code) => {
    setVaultState('processing');
    setTimeout(() => {
      if (code === 'rabbit') {
        setVaultState('success');
        setTimeout(() => setIsAuthenticated(true), 1500);
      } else {
        setVaultState('error');
        setTimeout(() => {
          setVaultState('open');
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 1000);
      }
    }, 800);
  };

  // Spotlight Effect State
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current || isFocused) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  if (!isAuthenticated) {
    const mathSymbols = ['∫', '∑', 'π', '√', '∞', '≠', '≈', '∆', 'λ', 'θ', 'Ω', 'β', 'α', 'γ', 'δ', 'ε', 'ζ', 'η', 'ι', 'κ', 'μ', 'ν', 'ξ', 'ο', 'ρ', 'σ', 'τ', 'φ', 'χ', 'ψ', 'ω'];

    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative font-sans transition-colors duration-500">

        {/* Deep Ambient Background Gradients - LIGHTER */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-violet-400/10 dark:bg-violet-500/10 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-cyan-300/10 dark:bg-cyan-500/10 rounded-full blur-[80px] animate-pulse animation-delay-4000" />
        </div>

        {/* Dynamic Animated Mesh - HIGH VISIBILITY */}
        <div className="absolute inset-0 opacity-60 dark:opacity-50 pointer-events-none">
          <div className="absolute inset-0 animate-spin-slow origin-center scale-[1.5]"
            style={{ background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(59, 130, 246, 0.1) 60deg, transparent 120deg, rgba(139, 92, 246, 0.1) 180deg, transparent 240deg, rgba(59, 130, 246, 0.1) 300deg, transparent 360deg)' }}
          />
        </div>

        {/* Floating Math Symbols - MAX VISIBILITY */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {mathSymbols.map((symbol, i) => (
            <motion.div
              key={i}
              className="absolute text-blue-900/40 dark:text-blue-200/40 font-serif font-bold text-3xl select-none filter blur-[0.5px]"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                rotate: Math.random() * 360,
                scale: 0.5 + Math.random() * 0.5,
                opacity: 0
              }}
              animate={{
                y: [null, Math.random() * -200],
                x: [null, (Math.random() - 0.5) * 100],
                rotate: [null, Math.random() * 360],
                opacity: [0, 0.8, 0] // High opacity
              }}
              transition={{
                duration: Math.random() * 20 + 10,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 5
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center">

          <AnimatePresence mode='wait'>
            {vaultState === 'closed' && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(79, 70, 229, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVaultClick}
                className="group relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-xl shadow-blue-500/30 flex items-center justify-center overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                <LockIcon className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute bottom-6 text-[10px] text-white/80 tracking-widest font-bold translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  UNLOCK
                </span>
              </motion.button>
            )}

            {vaultState !== 'closed' && (
              <motion.div
                initial={{ width: 100, opacity: 0 }}
                animate={{
                  width: "auto",
                  opacity: 1,
                  transition: { type: "spring", stiffness: 300, damping: 25 }
                }}
                className="relative"
              >
                {/* Spotlight Card Container */}
                <div
                  ref={divRef}
                  onMouseMove={handleMouseMove}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className={`
                    relative p-2 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border shadow-2xl transition-colors duration-300 overflow-hidden
                    ${vaultState === 'error' ? 'border-red-500 animate-shake shadow-red-500/20' : 'border-white/50 dark:border-slate-700 shadow-blue-500/10'}
                    ${vaultState === 'success' ? 'border-green-500 shadow-green-500/20' : ''}
                  `}
                >
                  {/* Spotlight Effect Layer */}
                  <div
                    className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                    style={{
                      opacity,
                      background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99, 102, 241, 0.1), transparent 40%)`,
                    }}
                  />

                  {/* Inner Content */}
                  <div className="px-8 py-8 flex flex-col items-center gap-6 relative z-10">

                    {/* Header */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-1">
                        <ShieldCheck className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                        Security Check
                      </h2>
                      <p className={`text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${vaultState === 'processing' ? 'text-blue-500 animate-pulse' :
                        vaultState === 'success' ? 'text-green-500' :
                          vaultState === 'error' ? 'text-red-500' :
                            'text-slate-400'
                        }`}>
                        {vaultState === 'processing' ? 'Verifying...' :
                          vaultState === 'success' ? 'Access Granted' :
                            vaultState === 'error' ? 'Incorrect Passcode' :
                              'Enter 6-Character Code'}
                      </p>
                    </div>

                    {/* Input Grid */}
                    <div className="flex gap-2.5">
                      {otp.map((digit, idx) => (
                        <motion.input
                          key={idx}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          ref={el => inputRefs.current[idx] = el}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          onFocus={handleFocus}
                          onBlur={handleBlur}
                          disabled={vaultState === 'processing' || vaultState === 'success'}
                          className={`
                            w-10 h-14 rounded-xl text-center text-xl font-bold transition-all duration-200 outline-none border-2
                            ${vaultState === 'error'
                              ? 'border-red-200 bg-red-50 text-red-500'
                              : vaultState === 'success'
                                ? 'border-green-200 bg-green-50 text-green-600'
                                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-700 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800'}
                          `}
                        />
                      ))}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 opacity-40 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <Cpu className="w-3 h-3" />
              <span>SolveX Security</span>
            </div>
          </div>
        </div>
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

        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={() => { setIsMetricsOpen(true); }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-left text-slate-600 dark:text-slate-400 hover:text-accent"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">Metrics Dashboard</span>
          </button>

          <button
            onClick={() => { openProfile(); }}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-left"
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner transition-colors ${userRole === 'Admin' ? 'bg-gradient-to-tr from-amber-500 to-red-500' : 'bg-gradient-to-tr from-indigo-400 to-cyan-400'}`}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{username}</span>
              <span className={`text-xs ${userRole === 'Admin' ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>{userRole}</span>
            </div>
          </button>
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
                            <ThinkingProcess
                              steps={msg.steps}
                              isComplete={index !== messages.length - 1 || !isLoading}
                            />
                          )}
                          <div className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed font-light">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          {/* Feedback Buttons */}
                          {index === messages.length - 1 && !isLoading && (
                            <div className="flex justify-end gap-2 mt-2 transition-opacity">
                              <button
                                onClick={() => handleVote(index, true)}
                                disabled={!!msg.userVote}
                                className={`p-1 transition-colors ${msg.userVote === 'up' ? 'text-green-500' : msg.userVote ? 'opacity-30 cursor-not-allowed' : 'opacity-50 hover:opacity-100 hover:text-green-500'}`}
                                title={msg.userVote === 'up' ? "Voted Accurate" : "Accurate"}
                              >
                                <ThumbsUp
                                  className={`w-4 h-4`}
                                  fill={msg.userVote === 'up' ? "currentColor" : "none"}
                                />
                              </button>
                              <button
                                onClick={() => handleVote(index, false)}
                                disabled={!!msg.userVote}
                                className={`p-1 transition-colors ${msg.userVote === 'down' ? 'text-red-500' : msg.userVote ? 'opacity-30 cursor-not-allowed' : 'opacity-50 hover:opacity-100 hover:text-red-500'}`}
                                title={msg.userVote === 'down' ? "Voted Inaccurate" : "Inaccurate"}
                              >
                                <ThumbsDown
                                  className={`w-4 h-4`}
                                  fill={msg.userVote === 'down' ? "currentColor" : "none"}
                                />
                              </button>
                            </div>
                          )}
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

                  {/* Dictation Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`ml-2 p-1.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-accent'}`}
                    title={isListening ? "Stop Listening" : "Start Dictation"}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : (selectedImage ? "Add context about this image..." : "Ask any math question...")}
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
      {/* Profile Settings Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Profile Settings
                </h2>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <div className="w-5 h-5 text-slate-400">✕</div>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                    placeholder="Enter your name"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Tip: Special names grant special powers.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 block mb-1">Current Role Status</span>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${userRole === 'Admin' ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className={`font-bold ${userRole === 'Admin' ? 'text-amber-500' : 'text-slate-600 dark:text-slate-400'}`}>
                      {/* Pure calculation for preview, NO state update */}
                      {(tempUsername.trim().toLowerCase() === 'veerankiphanisirisha' ? 'Admin' : 'User')} (Preview)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Metrics Modal */}
      <PerformanceMetricsModal
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        modelStats={modelStats}
      />

    </div>
  );
}

export default App;
