"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, TrendingUp, AlertTriangle, Zap, CheckCircle2, X } from 'lucide-react';
import { useLearningStats, WeeklyProgress, GlobalStats } from '@/hooks/useLearningStats';
import { useErrorTracking, LearningStat } from '@/hooks/useErrorTracking';

interface LearningDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LearningDashboard({ isOpen, onClose }: LearningDashboardProps) {
    const { getWeeklyProgress, getGlobalStats, getMostUsedTerms } = useLearningStats();
    const { getFrequentErrors, markAsAutoLearned } = useErrorTracking();

    const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
    const [topErrors, setTopErrors] = useState<LearningStat[]>([]);
    const [mostUsed, setMostUsed] = useState<{ term: string, count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [progress, stats, errors, terms] = await Promise.all([
                getWeeklyProgress(),
                getGlobalStats(),
                getFrequentErrors(5),
                getMostUsedTerms(5)
            ]);

            setWeeklyProgress(progress);
            setGlobalStats(stats);
            setTopErrors(errors);
            setMostUsed(terms);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoLearn = async (pattern: string, correction: string) => {
        await markAsAutoLearned(pattern, correction);
        loadData(); // Reload to update UI
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                            Panel de Aprendizaje
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Estadísticas y progreso de tu asistente de IA</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
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
                                                <button
                                                    onClick={() => handleAutoLearn(error.errorPattern, error.correction)}
                                                    className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                                                >
                                                    Auto-aprender
                                                </button>
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
