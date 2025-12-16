"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, ArrowRight, Undo2, Ban } from 'lucide-react';
import { computeDiff, DiffChunk } from '@/lib/diffUtils';

interface CorrectionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    correctedText: string;
    onApply: (finalText: string) => void;
}

interface InteractiveChunk extends DiffChunk {
    id: number;
    status: 'accepted' | 'rejected'; // accepted = comply with AI (keep add, keep remove). rejected = revert to original.
}

export function CorrectionReviewModal({ isOpen, onClose, originalText, correctedText, onApply }: CorrectionReviewModalProps) {
    const [chunks, setChunks] = useState<InteractiveChunk[]>([]);

    useEffect(() => {
        if (isOpen && originalText && correctedText) {
            const rawDiff = computeDiff(originalText, correctedText);
            setChunks(rawDiff.map((c, i) => ({ ...c, id: i, status: 'accepted' })));
        }
    }, [isOpen, originalText, correctedText]);

    const handleToggleChunk = (id: number) => {
        setChunks(prev => prev.map(c =>
            c.id === id ? { ...c, status: c.status === 'accepted' ? 'rejected' : 'accepted' } : c
        ));
    };

    const finalPreview = useMemo(() => {
        return chunks.map(c => {
            if (c.added) {
                // If added by AI and accepted -> SHOW. If rejected -> HIDE.
                return c.status === 'accepted' ? c.value : '';
            }
            if (c.removed) {
                // If removed by AI and accepted -> HIDE. If rejected -> SHOW (restore original).
                return c.status === 'accepted' ? '' : c.value;
            }
            return c.value; // Unchanged
        }).join('');
    }, [chunks]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full h-[80vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shrink-0">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Check className="w-6 h-6" />
                            Revisar Cambios
                        </h2>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-purple-100 text-sm mt-2">
                        Pulsa sobre los textos marcados para <strong>rechazar</strong> o <strong>aceptar</strong> los cambios de la IA.
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Visual Diff Editor */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 leading-relaxed text-lg font-serif">
                        {chunks.map((chunk) => {
                            if (chunk.added) {
                                return (
                                    <span
                                        key={chunk.id}
                                        onClick={() => handleToggleChunk(chunk.id)}
                                        className={`cursor-pointer transition-colors px-1 rounded mx-0.5 select-none ${chunk.status === 'accepted'
                                                ? 'bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100 hover:bg-green-300' // Live Addition
                                                : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 line-through decoration-gray-500' // Rejected Addition (Hidden effectively but shown as crossed out preview)
                                            }`}
                                        title={chunk.status === 'accepted' ? "Clic para rechazar esta adición" : "Clic para aceptar esta adición"}
                                    >
                                        {chunk.value}
                                    </span>
                                );
                            }
                            if (chunk.removed) {
                                return (
                                    <span
                                        key={chunk.id}
                                        onClick={() => handleToggleChunk(chunk.id)}
                                        className={`cursor-pointer transition-colors px-1 rounded mx-0.5 select-none ${chunk.status === 'accepted'
                                                ? 'bg-red-200 text-red-900 line-through decoration-red-900 dark:bg-red-900/50 dark:text-red-100 hover:bg-red-300' // Live Deletion (Crossed out)
                                                : 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 border border-blue-200' // Rejected Deletion (Restored Original)
                                            }`}
                                        title={chunk.status === 'accepted' ? "Clic para restaurar (rechazar borrado)" : "Clic para borrar (aceptar borrado)"}
                                    >
                                        {chunk.value}
                                    </span>
                                );
                            }
                            return <span key={chunk.id} className="text-gray-700 dark:text-gray-300">{chunk.value}</span>;
                        })}
                    </div>

                    {/* Preview of Final Result */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Vista Previa Final</h3>
                        <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 italic">
                            {finalPreview}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onApply(finalPreview)}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 flex items-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Aplicar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
