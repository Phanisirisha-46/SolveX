import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const PerformanceMetricsModal = ({ isOpen, onClose, modelStats }) => {
    // calculate metrics from raw stats
    const chartData = useMemo(() => {
        if (!modelStats) return [];

        // Format: [{ name: 'Gemini', score: 85, compliance: 90 }, ...]
        const models = Object.keys(modelStats);

        const DISPLAY_NAMES = {
            'groq-math-wizard': 'Gemma', // Legacy
            'gemma-2-9b': 'Gemma',       // New
            'groq-llama3.3': 'Llama 3.3',
            'groq-llama3.1': 'Llama 3.1',
            'groq-qwen2.5': 'Qwen 2.5',
            'gemini': 'Gemini'
        };

        return models.map(model => {
            let totalQuestions = 0;
            let totalUserLikes = 0;
            let totalCompliancePasses = 0;

            // Aggregate across all categories
            Object.values(modelStats[model] || {}).forEach(categoryStats => {
                totalQuestions += (categoryStats.total || 0);
                totalUserLikes += (categoryStats.likes || 0);
                totalCompliancePasses += (categoryStats.compliance || 0);
            });

            if (totalQuestions === 0) return { name: DISPLAY_NAMES[model] || model, accuracy: 0, compliance: 0, hybrid: 0 };

            const userScore = (totalUserLikes / totalQuestions) * 100;
            const complianceScore = (totalCompliancePasses / totalQuestions) * 100;

            // Hybrid Calculation: 50% User Vote + 50% System Integrity
            const hybridScore = (userScore * 0.5) + (complianceScore * 0.5);

            return {
                name: DISPLAY_NAMES[model] || model,
                accuracy: Math.round(userScore),
                compliance: Math.round(complianceScore),
                hybrid: Math.round(hybridScore)
            };
        });
    }, [modelStats]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Model Performance Dashboard</h2>
                                    <p className="text-sm text-slate-500">Real-time accuracy & compliance metrics</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-8">

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-100 dark:border-violet-900/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-violet-500" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Top Performer</span>
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                                        {chartData.length > 0 ? chartData.reduce((prev, current) => (prev.hybrid > current.hybrid) ? prev : current).name : 'N/A'}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-100 dark:border-green-900/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">System Integrity</span>
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-white">
                                        {chartData.length > 0 ? Math.round(chartData.reduce((acc, curr) => acc + curr.compliance, 0) / chartData.length) : 0}%
                                    </div>
                                </div>
                            </div>

                            {/* Main Hybrid Chart */}
                            <div className="h-[400px] w-full bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-6">Hybrid Accuracy Score (User Vote + Format Compliance)</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.1} vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }}
                                            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar
                                            dataKey="accuracy"
                                            name="User Vote %"
                                            stackId="a"
                                            fill="#8b5cf6"
                                            radius={[0, 0, 4, 4]}
                                            barSize={40}
                                        />
                                        <Bar
                                            dataKey="compliance"
                                            name="Format Compliance %"
                                            stackId="a"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>



                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500" />
                                    Metric Definitions
                                </h4>
                                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                    <p><strong className="text-slate-700 dark:text-slate-200">User Vote:</strong> Percentage of answers you liked (Thumbs Up).</p>
                                    <p><strong className="text-slate-700 dark:text-slate-200">Format Compliance:</strong> Automated check. Passes if the AI correctly generates structured "Thinking Steps".</p>
                                    <p><strong className="text-slate-700 dark:text-slate-200">Hybrid Score:</strong> 50/50 average of User Vote and Format Compliance.</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );
};

export default PerformanceMetricsModal;
