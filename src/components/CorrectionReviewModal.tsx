"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, BookPlus } from 'lucide-react';
import { computeDiff, DiffChunk } from '@/lib/diffUtils';
import { useErrorTracking } from '@/hooks/useErrorTracking';

interface CorrectionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    correctedText: string;
    confidence?: number;
    onApply: (finalText: string) => void;
    onSaveToDictionary?: (original: string, replacement: string) => void;
}

interface InteractiveChunk extends DiffChunk {
    id: number;
    status: 'accepted' | 'rejected'; // accepted = comply with AI (keep add, keep remove). rejected = revert to original.
    saved?: boolean;
}

export function CorrectionReviewModal({ isOpen, onClose, originalText, correctedText, confidence, onApply, onSaveToDictionary }: CorrectionReviewModalProps) {
    const [chunks, setChunks] = useState<InteractiveChunk[]>([]);
    const { logCorrection } = useErrorTracking();

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

    const handleSaveToDictionary = (chunkId: number) => {
        const chunk = chunks.find(c => c.id === chunkId);
        if (!chunk || !onSaveToDictionary) return;

        // Try to find the associated "removed" chunk to get the "original" word
        // Usually corrections come in pairs: [removed(old), added(new)] or [added(new), removed(old)]
        let original = "";
        const currentIndex = chunks.findIndex(c => c.id === chunkId);

        // Check previous chunk
        if (currentIndex > 0 && chunks[currentIndex - 1].removed) {
            original = chunks[currentIndex - 1].value.trim();
        }
        // Or check next chunk
        else if (currentIndex < chunks.length - 1 && chunks[currentIndex + 1].removed) {
            original = chunks[currentIndex + 1].value.trim();
        }

        if (original && chunk.value.trim()) {
            onSaveToDictionary(original, chunk.value.trim());
            setChunks(prev => prev.map(c => c.id === chunkId ? { ...c, saved: true } : c));
        } else {
            // Fallback: if we can't find original, maybe just ask or ignore
            // For now, let's just alert
            alert("Selecciona un cambio que corrija una palabra específica para guardarlo.");
        }
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

    const handleApply = async () => {
        // Extract context (50 chars before and after the changed text)
        const contextBefore = originalText.slice(Math.max(0, originalText.length - 50));
        const contextAfter = correctedText.slice(0, 50);

        // Log the correction
        await logCorrection({
            originalText,
            correctedText: finalPreview,
            confidence,
            contextBefore,
            contextAfter,
            correctionType: originalText.includes(' ') && correctedText.includes(' ') ? 'phrase' : 'word'
        }, true);

        // Apply the changes
        onApply(finalPreview);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
            <div className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 text-white shrink-0 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                                <Check className="w-6 h-6 text-[var(--accent)]" />
                                Revisar <span className="text-[var(--accent)]">Cambios</span> Tácticos
                            </h2>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase opacity-80">
                                Corrección Analítica IA • Verificación QA
                            </span>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Visual Diff Editor */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 leading-relaxed text-lg font-serif whitespace-pre-wrap">
                        {chunks.map((chunk) => {
                            if (chunk.added) {
                                return (
                                    <span
                                        key={chunk.id}
                                        className="inline-flex items-center group"
                                    >
                                        <span
                                            onClick={() => handleToggleChunk(chunk.id)}
                                            className={`cursor-pointer transition-colors px-1 rounded mx-0.5 select-none ${chunk.status === 'accepted'
                                                ? 'bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100 hover:bg-green-300' // Live Addition
                                                : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 line-through decoration-gray-500' // Rejected Addition (Hidden effectively but shown as crossed out preview)
                                                }`}
                                            title={chunk.status === 'accepted' ? "Clic para rechazar esta adición" : "Clic para aceptar esta adición"}
                                        >
                                            {chunk.value}
                                        </span>
                                        {chunk.status === 'accepted' && onSaveToDictionary && !chunk.saved && (
                                            <button
                                                onClick={() => handleSaveToDictionary(chunk.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                                                title="Aprender: Guardar en diccionario"
                                            >
                                                <BookPlus className="w-3 h-3" />
                                            </button>
                                        )}
                                        {chunk.saved && (
                                            <span className="ml-1 text-[10px] font-bold text-purple-500 uppercase">Aprendido</span>
                                        )}
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
                        <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 italic whitespace-pre-wrap">
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
                        onClick={handleApply}
                        className="px-8 py-3 bg-[var(--accent)] text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-3"
                    >
                        <Check className="w-5 h-5" />
                        Ejecutar Protocolo
                    </button>
                </div>
            </div>
        </div>
    );
}
