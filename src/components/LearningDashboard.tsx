"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, TrendingUp, AlertTriangle, Zap, CheckCircle2, X } from 'lucide-react';
import { useLearningStats, WeeklyProgress, GlobalStats } from '@/hooks/useLearningStats';
import { useErrorTracking, LearningStat } from '@/hooks/useErrorTracking';
import { useVocabulary } from '@/hooks/useVocabulary';

interface LearningDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LearningDashboard({ isOpen, onClose }: LearningDashboardProps) {
    const { getWeeklyProgress, getGlobalStats } = useLearningStats();
    const { getFrequentErrors, markAsAutoLearned, ignoreErrorPattern } = useErrorTracking();
    const { addReplacement } = useVocabulary();

    const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [topErrors, setTopErrors] = useState<LearningStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [progress, stats, errors] = await Promise.all([
                getWeeklyProgress(),
                getGlobalStats(),
                getFrequentErrors(5)
            ]);

            setWeeklyProgress(progress);
            setGlobalStats(stats);
            setTopErrors(errors);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    }, [getWeeklyProgress, getGlobalStats, getFrequentErrors]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, loadData]);

    const handleAutoLearn = async (statId: string, pattern: string, correction: string) => {
        // 1. Mark as learned in stats (for UI/tracking)
        await markAsAutoLearned(statId);

        // 2. Actually add to personal dictionary (for real automation)
        await addReplacement(pattern, correction);

        loadData(); // Reload to update UI
    };

    const handleIgnore = async (statId: string) => {
        await ignoreErrorPattern(statId);
        loadData(); // Reload to update list
    };

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    const maxDailyCorrections = Math.max(...weeklyProgress.map(d => d.corrections + d.autoCorrections), 1);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
            <div className="glass-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
                            <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
                            Motor <span className="text-[var(--accent)]">Analítico</span>
                        </h2>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">
                            Progreso de Aprendizaje • Estado de Red Neuronal
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Zap className="w-5 h-5 text-yellow-500" />}
                            label="Autocorrecciones"
                            value={globalStats?.autoLearnedCount || 0}
                            subtext="Errores evitados automáticamente"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                            label="Total Correcciones"
                            value={globalStats?.totalCorrections || 0}
                            subtext="Intervenciones manuales"
                        />
                        <StatCard
                            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
                            label="Términos Aprendidos"
                            value={globalStats?.termsLearned || 0}
                            subtext="Vocabulario personalizado"
                        />
                        <StatCard
                            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                            label="Error Frecuente"
                            value={globalStats?.mostFrequentError || "N/A"}
                            subtext="El error más común"
                            isText
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Progress Chart */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <BarChart className="w-5 h-5 text-gray-500" />
                                Actividad Semanal
                            </h3>
                            <div className="flex items-end justify-between h-48 gap-2">
                                {weeklyProgress.map((day) => {
                                    const total = day.corrections + day.autoCorrections;
                                    const heightPercent = (total / maxDailyCorrections) * 100;
                                    const manualPercent = total > 0 ? (day.corrections / total) * 100 : 0;
                                    const autoPercent = total > 0 ? (day.autoCorrections / total) * 100 : 0;

                                    return (
                                        <div key={day.date} className="flex flex-col items-center flex-1 group">
                                            <div className="w-full relative flex flex-col justify-end" style={{ height: '100%' }}>
                                                {total > 0 && (
                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden relative" style={{ height: `${heightPercent}%` }}>
                                                        {/* Manual corrections (Red) */}
                                                        <div
                                                            className="w-full bg-red-400 absolute bottom-0 transition-all duration-500 group-hover:bg-red-500"
                                                            style={{ height: `${manualPercent}%`, bottom: 0 }}
                                                            title={`${day.corrections} manuales`}
                                                        />
                                                        {/* Auto corrections (Green) */}
                                                        <div
                                                            className="w-full bg-green-400 absolute transition-all duration-500 group-hover:bg-green-500"
                                                            style={{ height: `${autoPercent}%`, bottom: `${manualPercent}%` }}
                                                            title={`${day.autoCorrections} automáticas`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 mt-2 truncate w-full text-center">
                                                {new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div> Manuales
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-400 rounded-sm"></div> Automáticas
                                </div>
                            </div>
                        </div>

                        {/* Top Errors & Recommendations */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-gray-500" />
                                Errores Frecuentes
                            </h3>
                            <div className="space-y-4">
                                {topErrors.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No hay errores frecuentes registrados aún 👏</p>
                                ) : (
                                    topErrors.map((error, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-500 line-through text-sm">{error.errorPattern}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-600 font-medium">{error.correction}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Ocurrió {error.frequency} veces
                                                </div>
                                            </div>
                                            {!error.autoLearned && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAutoLearn(error.id, error.errorPattern, error.correction)}
                                                        className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                                                    >
                                                        Auto-aprender
                                                    </button>
                                                    <button
                                                        onClick={() => handleIgnore(error.id)}
                                                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                        title="Hace desaparecer este elemento de la lista"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            )}
                                            {error.autoLearned && (
                                                <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                                                    Aprendido
                                                </span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subtext, isText = false }: {
    icon: React.ReactNode,
    label: string,
    value: number | string,
    subtext: string,
    isText?: boolean
}) {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</h4>
                    <div className={`font-bold text-gray-900 dark:text-white ${isText ? 'text-lg truncate max-w-[120px]' : 'text-2xl'}`}>
                        {value}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{subtext}</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    );
}
