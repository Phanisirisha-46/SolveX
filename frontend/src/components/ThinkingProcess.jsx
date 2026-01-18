import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ThinkingProcess = ({ steps, isComplete }) => {
    const [expandedStep, setExpandedStep] = useState(null);

    const toggleStep = (index) => {
        setExpandedStep(expandedStep === index ? null : index);
    };

    return (
        <div className="w-full max-w-2xl mx-auto my-4 space-y-2">
            {steps.map((step, index) => (
                <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50 shadow-sm transition-colors duration-200">
                    <button
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {isComplete || index < steps.length - 1 ? (
                                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                </div>
                            ) : (
                                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                            )}
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{step.title}</span>
                        </div>
                        {expandedStep === index ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                    </button>

                    <AnimatePresence>
                        {expandedStep === index && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            a: ({ node, ...props }) => (
                                                <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer" />
                                            )
                                        }}
                                    >
                                        {String(step.content || '')}
                                    </ReactMarkdown>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

export default ThinkingProcess;
