"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Check, RotateCcw, X, Clock } from 'lucide-react';
import { useAutoCorrection, AutoCorrectionLog } from '@/hooks/useAutoCorrection';

interface AutoCorrectionLogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AutoCorrectionLogModal({ isOpen, onClose }: AutoCorrectionLogProps) {
    const [logs, setLogs] = useState<AutoCorrectionLog[]>([]);
    const { getAutoCorrectLog, revertAutoCorrection } = useAutoCorrection();

    const loadLogs = useCallback(async () => {
        const data = await getAutoCorrectLog();
        setLogs(data);
    }, [getAutoCorrectLog]);

    useEffect(() => {
        if (isOpen) {
            loadLogs();
        }
    }, [isOpen, loadLogs]);

    const handleRevert = async (logId: string) => {
        const success = await revertAutoCorrection(logId);
        if (success) {
            setLogs(prev => prev.filter(log => log.id !== logId));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
            <div className="glass-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white border-b border-white/10 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-2">
                                <Check className="w-6 h-6 text-[var(--accent)]" />
                                Auto-Corrección <span className="text-[var(--accent)]">Sentinel</span>
                            </h2>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">
                                Registros de Inteligencia Autónoma • Bat-Computadora
                            </span>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No hay correcciones automáticas hoy</p>
                            <p className="text-sm mt-1">Las correcciones de alta confianza aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(log.timestamp).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-mono text-sm">
                                                    {log.original}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-mono text-sm">
                                                    {log.corrected}
                                                </span>
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                                    {Math.round(log.confidence * 100)}% confianza
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevert(log.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Revertir esta corrección"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        💡 Las correcciones se aplican automáticamente cuando la IA tiene {'>'} 95% de confianza
                        y el error se ha visto antes.
                    </p>
                </div>
            </div>
        </div>
    );
}
