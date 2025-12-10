"use client";

import React, { useState, useEffect } from 'react';
import { useVocabulary } from '@/hooks/useVocabulary';
import { Plus, X, Book } from 'lucide-react';

interface VocabularySettingsProps {
    selectedText?: string;
    onCorrect?: (original: string, replacement: string) => void;
}

export function VocabularySettings({ selectedText, onCorrect }: VocabularySettingsProps) {
    const { replacements, addReplacement, removeReplacement } = useVocabulary();
    const [original, setOriginal] = useState('');
    const [replacement, setReplacement] = useState('');

    // Auto-fill selected text when component opens
    useEffect(() => {
        if (selectedText && selectedText.trim()) {
            setOriginal(selectedText.trim());
        }
    }, [selectedText]);

    const handleAdd = async () => {
        if (original && replacement) {
            await addReplacement(original, replacement);

            // Apply correction to current text if callback provided
            if (onCorrect) {
                onCorrect(original, replacement);
            }

            setOriginal('');
            setReplacement('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && original && replacement) {
            handleAdd();
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800 dark:text-gray-200">
                <Book className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                Diccionario Personal
            </h2>
            <div className="space-y-6">
                <div className="space-y-3">
                    {selectedText && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-200">
                            <strong>Texto seleccionado:</strong> "{selectedText}"
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Palabra original
                            </label>
                            <input
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white transition-all"
                                placeholder="ej: Halla"
                                value={original}
                                onChange={(e) => setOriginal(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Reemplazo correcto
                            </label>
                            <input
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white transition-all"
                                placeholder="ej: Haya"
                                value={replacement}
                                onChange={(e) => setReplacement(e.target.value)}
                                onKeyPress={handleKeyPress}
                                autoFocus={!!selectedText}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={!original || !replacement}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg shadow-blue-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{onCorrect ? 'Añadir y aplicar al texto' : 'Añadir corrección'}</span>
                    </button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Correcciones guardadas ({Object.entries(replacements).length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(replacements).length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                                No hay correcciones guardadas.
                            </p>
                        )}
                        {Object.entries(replacements).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors border border-gray-200 dark:border-gray-700">
                                <span className="text-sm flex items-center space-x-3">
                                    <span className="font-semibold text-red-500 dark:text-red-400 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg">{key}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">{val}</span>
                                </span>
                                <button
                                    onClick={() => removeReplacement(key)}
                                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    title="Eliminar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
