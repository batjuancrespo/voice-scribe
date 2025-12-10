"use client";

import React, { useState } from 'react';
import { useVocabulary } from '@/hooks/useVocabulary';
import { Plus, X, Book } from 'lucide-react';

export function VocabularySettings() {
    const { replacements, addReplacement, removeReplacement } = useVocabulary();
    const [original, setOriginal] = useState('');
    const [replacement, setReplacement] = useState('');

    const handleAdd = () => {
        if (original && replacement) {
            addReplacement(original, replacement);
            setOriginal('');
            setReplacement('');
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800 dark:text-gray-200">
                <Book className="w-5 h-5 mr-2" />
                Diccionario Personal
            </h2>
            <div className="space-y-4">
                <div className="flex space-x-2">
                    <input
                        className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                        placeholder="Palabra original (ej: Halla)"
                        value={original}
                        onChange={(e) => setOriginal(e.target.value)}
                    />
                    <input
                        className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                        placeholder="Reemplazo (ej: Haya)"
                        value={replacement}
                        onChange={(e) => setReplacement(e.target.value)}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!original || !replacement}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(replacements).length === 0 && (
                        <p className="text-sm text-gray-500 italic">No hay correcciones guardadas.</p>
                    )}
                    {Object.entries(replacements).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <span className="text-sm">
                                <span className="font-medium text-red-500">{key}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium text-green-600">{val}</span>
                            </span>
                            <button
                                onClick={() => removeReplacement(key)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
