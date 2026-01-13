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
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200">
                    <button
                        onClick={() => toggleStep(index)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {isComplete || index < steps.length - 1 ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            )}
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{step.title}</span>
                        </div>
                        {expandedStep === index ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
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
                                <div className="p-4 bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
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
