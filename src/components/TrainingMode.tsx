"use client";

import React, { useState, useEffect } from 'react';
import { X, Mic, Play, SkipForward, Trophy, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { useTrainingSession, TrainingTerm } from '@/hooks/useTrainingSession';

interface TrainingModeProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (results: Array<{ error: string; correct: string }>) => void;
    isListening: boolean;
    transcript: string;
    onStartListening: () => void;
    onStopListening: () => void;
}

export function TrainingMode({
    isOpen,
    onClose,
    onComplete,
    isListening,
    transcript,
    onStartListening,
    onStopListening
}: TrainingModeProps) {
    const {
        isActive,
        currentTerm,
        results,
        isComplete,
        startSession,
        recordResult,
        skipCurrent,
        endSession,
        getProgress,
        getStats
    } = useTrainingSession();

    const [lastTranscript, setLastTranscript] = useState('');

    // Monitor transcript changes
    useEffect(() => {
        if (isActive && !isComplete && transcript && transcript !== lastTranscript) {
            setLastTranscript(transcript);
            // Auto-record when transcript updates
            recordResult(transcript);
            onStopListening();
        }
    }, [transcript, isActive, isComplete, lastTranscript, recordResult, onStopListening]);

    const handleStart = () => {
        startSession();
    };

    const handleNext = () => {
        if (isListening) {
            onStopListening();
        }
        onStartListening();
    };

    const handleSkip = () => {
        skipCurrent();
        if (isListening) {
            onStopListening();
        }
    };

    const handleComplete = () => {
        // Extract learning pairs from results
        const learningPairs = results
            .filter(r => !r.correct && r.transcribed !== '(omitido)')
            .map(r => ({
                error: r.transcribed,
                correct: r.term
            }));

        endSession();
        onComplete(learningPairs);
        onClose();
    };

    const progress = getProgress();
    const stats = getStats();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Target className="w-6 h-6" />
                            Modo Entrenamiento
                        </h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-indigo-100 text-sm mt-2">
                        Dicta cada término médico para mejorar el reconocimiento de voz
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!isActive ? (
                        // Start Screen
                        <div className="text-center py-12">
                            <Trophy className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Entrena tu Asistente de Voz
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                Dicta 20+ términos médicos comunes. El sistema aprenderá tu pronunciación
                                y mejorará el reconocimiento automático.
                            </p>
                            <button
                                onClick={handleStart}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg flex items-center gap-2 mx-auto"
                            >
                                <Play className="w-5 h-5" />
                                Iniciar Entrenamiento
                            </button>
                        </div>
                    ) : isComplete ? (
                        // Results Screen
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                ¡Entrenamiento Completado!
                            </h3>

                            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {stats.correct}
                                    </div>
                                    <div className="text-sm text-green-700 dark:text-green-300">Correctos</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                                        {stats.incorrect}
                                    </div>
                                    <div className="text-sm text-red-700 dark:text-red-300">Errores</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {Math.round(stats.accuracy)}%
                                    </div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">Precisión</div>
                                </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Se añadirán {stats.incorrect} correcciones automáticas a tu diccionario
                            </p>

                            <button
                                onClick={handleComplete}
                                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            >
                                Finalizar y Guardar
                            </button>
                        </div>
                    ) : (
                        // Training Screen
                        <div>
                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    <span>Progreso</span>
                                    <span>{progress.current} / {progress.total}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${progress.percentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Current Term */}
                            {currentTerm && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 mb-6 text-center border-2 border-indigo-200 dark:border-indigo-700">
                                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                                        {currentTerm.category === 'acronym' ? '📝 Acrónimo' :
                                            currentTerm.category === 'descriptor' ? '🔍 Descriptor' :
                                                currentTerm.category === 'anatomy' ? '🫀 Anatomía' :
                                                    '📏 Medida'}
                                    </div>
                                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                        {currentTerm.term}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                                        Dicta este término claramente
                                    </div>
                                </div>
                            )}

                            {/* Microphone Status */}
                            <div className="text-center mb-6">
                                {isListening ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                        <Mic className="w-5 h-5 animate-pulse" />
                                        Escuchando...
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                                        <Mic className="w-5 h-5" />
                                        Pulsa para dictar
                                    </div>
                                )}
                            </div>

                            {/* Transcript Preview */}
                            {transcript && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-700">
                                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                                        Transcripción:
                                    </div>
                                    <div className="text-gray-900 dark:text-white font-medium">
                                        {transcript}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleNext}
                                    disabled={isListening}
                                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Mic className="w-5 h-5" />
                                    {isListening ? 'Escuchando...' : 'Dictar Ahora'}
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                    <SkipForward className="w-5 h-5" />
                                    Omitir
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
