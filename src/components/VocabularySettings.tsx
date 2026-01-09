"use client";

import React, { useState, useEffect } from 'react';
import { useVocabulary } from '@/hooks/useVocabulary';
import { Plus, X, Book, Edit2, Download, Upload } from 'lucide-react';

interface VocabularySettingsProps {
    selectedText?: string;
    onCorrect?: (original: string, replacement: string) => void;
}

export function VocabularySettings({ selectedText, onCorrect }: VocabularySettingsProps) {
    const { replacements, addReplacement, removeReplacement, updateReplacement } = useVocabulary();
    const [original, setOriginal] = useState('');
    const [replacement, setReplacement] = useState('');
    const [editingEntry, setEditingEntry] = useState<{ original: string; replacement: string } | null>(null);

    // Auto-fill selected text when component opens
    useEffect(() => {
        if (selectedText && selectedText.trim() && !editingEntry) {
            setOriginal(selectedText.trim());
        }
    }, [selectedText, editingEntry]);

    const handleAdd = async () => {
        if (original && replacement) {
            if (editingEntry) {
                // Update existing entry
                await updateReplacement(editingEntry.original, original, replacement);
                setEditingEntry(null);
            } else {
                // Add new entry
                await addReplacement(original, replacement);

                // Apply correction to current text if callback provided
                if (onCorrect) {
                    onCorrect(original, replacement);
                }
            }

            setOriginal('');
            setReplacement('');
        }
    };

    const handleStartEdit = (orig: string, repl: string) => {
        setEditingEntry({ original: orig, replacement: repl });
        setOriginal(orig);
        setReplacement(repl);
    };

    const handleCancel = () => {
        setEditingEntry(null);
        setOriginal('');
        setReplacement('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && original && replacement) {
            handleAdd();
        }
    };

    const handleExport = () => {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            entries: Object.entries(replacements).map(([orig, repl]) => ({
                original: orig,
                replacement: repl
            }))
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diccionario-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (!data.entries || !Array.isArray(data.entries)) {
                    alert('Formato de archivo inválido');
                    return;
                }

                let imported = 0;
                for (const entry of data.entries) {
                    if (entry.original && entry.replacement) {
                        await addReplacement(entry.original, entry.replacement);
                        imported++;
                    }
                }

                alert(`Se importaron ${imported} entradas correctamente`);
            } catch (error) {
                console.error('Error importing:', error);
                alert('Error al importar el archivo. Verifica que el formato sea correcto.');
            }
        };
        input.click();
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
                        onClick={handleExport}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Exportar diccionario"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleImport}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Importar diccionario"
                    >
                        <Upload className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex space-x-2">
                    {editingEntry && (
                        <button
                            onClick={handleCancel}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        onClick={handleAdd}
                        disabled={!original || !replacement}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {editingEntry ? 'Actualizar' : (onCorrect ? 'Añadir y aplicar al texto' : 'Añadir')}
                    </button>
                </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Correcciones guardadas ({Object.entries(replacements).length})
                </h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(replacements).length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-8">
                            No hay correcciones guardadas.
                        </p>
                    )}
                    {Object.entries(replacements).map(([orig, val]) => (
                        <div key={orig} className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
                            <div className="flex-1">
                                <span className="font-mono text-gray-700 dark:text-gray-300">
                                    {orig}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 mx-3">→</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {replacements[orig]}
                                </span>
                            </div>
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => handleStartEdit(orig, replacements[orig])}
                                    className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => removeReplacement(orig)}
                                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
