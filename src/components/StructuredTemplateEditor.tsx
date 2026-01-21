"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { useStructuredTemplate } from '@/hooks/useStructuredTemplate';
import { useVocabulary } from '@/hooks/useVocabulary';
import { processTranscriptSegment } from '@/lib/textProcessor';
import { TemplateField as DbTemplateField } from '@/hooks/useTemplates';
import { Mic, X, RotateCcw, Check, FileText, Square } from 'lucide-react';
import { parseTemplateText } from '@/lib/textProcessor';

interface StructuredTemplateEditorProps {
    fields: DbTemplateField[];
    templateName: string;
    onComplete: (text: string) => void;
    onCancel: () => void;
}

export function StructuredTemplateEditor({ fields: initialDbFields, templateName, onComplete, onCancel }: StructuredTemplateEditorProps) {
    // Map DB fields (snake_case) to hook expected format (camelCase)
    const mappedFields = initialDbFields.map(f => ({
        id: f.id,
        fieldName: f.field_name,
        defaultText: f.default_text,
        section: f.section,
        displayOrder: f.display_order,
        isRequired: f.is_required,
        variants: f.variants || []
    }));

    const {
        fields,
        activeFieldId,
        startRecording: setFieldRecording,
        stopRecording: setFieldStopped,
        resetField,
        updateField,
        updateSelection,
        selections,
        generateReport,
        stats
    } = useStructuredTemplate(mappedFields);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fieldId: string } | null>(null);

    const {
        isListening,
        startListening,
        stopListening,
        interimResult,
        lastEvent
    } = useTranscription();

    const { replacements } = useVocabulary();
    const lastProcessedTimestamp = useRef<number>(0);

    // Effect to handle transcription results
    useEffect(() => {
        if (activeFieldId && lastEvent && lastEvent.timestamp > lastProcessedTimestamp.current) {
            console.log("LOG: Procesando evento", lastEvent.text);
            const field = fields.find(f => f.id === activeFieldId);
            if (field) {
                // Determine if we should append or start fresh

                let newText = field.currentText;

                // If the text is the default text, replace it completely on first dictation
                if (field.currentText === field.defaultText) {
                    // Start fresh: context is empty to trigger capitalization
                    const processedText = processTranscriptSegment(lastEvent.text, replacements, '');
                    newText = processedText;
                } else {
                    // If already edited/recording, append
                    // Use currentText as context for capitalization logic
                    const processedText = processTranscriptSegment(lastEvent.text, replacements, field.currentText);
                    const needsSpace = field.currentText.length > 0 && !/\s$/.test(field.currentText);

                    newText = field.currentText + (needsSpace ? ' ' : '') + processedText;
                }

                updateField(activeFieldId, newText);
                lastProcessedTimestamp.current = lastEvent.timestamp;
            }
        }
    }, [lastEvent, activeFieldId, fields, updateField, replacements]);

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, fieldId: string) => {
        e.preventDefault();
        // Only show if field has variants or generic options
        setContextMenu({ x: e.clientX, y: e.clientY, fieldId });
    };

    const applyVariant = (text: string) => {
        if (contextMenu) {
            updateField(contextMenu.fieldId, text);
            setContextMenu(null);
        }
    };

    const handleFieldClick = (fieldId: string) => {
        // If already listening on this field, stop
        if (isListening && activeFieldId === fieldId) {
            stopListening();
            setFieldStopped(fieldId, fields.find(f => f.id === fieldId)?.currentText || '');
        } else {
            // If listening on another field, just switch focus without stopping mic
            if (isListening) {
                // Stop visual recording state on old field
                if (activeFieldId) {
                    setFieldStopped(activeFieldId, fields.find(f => f.id === activeFieldId)?.currentText || '');
                }

                // Start visual recording state on new field
                setFieldRecording(fieldId);
                // We do NOT call stopListening() / startListening() so the stream continues uninterrupted
            } else {
                // Not listening yet, start fresh
                setFieldRecording(fieldId);
                startListening();
            }
        }
    };

    const handleStopGlobal = () => {
        if (isListening && activeFieldId) {
            stopListening();
            setFieldStopped(activeFieldId, fields.find(f => f.id === activeFieldId)?.currentText || '');
        }
    };

    const handleFieldReset = (e: React.MouseEvent, fieldId: string) => {
        e.stopPropagation();
        resetField(fieldId);
        if (isListening && activeFieldId === fieldId) {
            stopListening();
        }
    };

    // Group fields by section for rendering
    const sections = React.useMemo(() => {
        const groups: Record<string, typeof fields> = {};
        fields.forEach(f => {
            if (!groups[f.section]) groups[f.section] = [];
            groups[f.section].push(f);
        });
        return groups;
    }, [fields]);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-gray-900 to-indigo-950">
                <div className="flex flex-col">
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[var(--accent)]" />
                        Entrada <span className="text-[var(--accent)]">Táctica</span>: {templateName}
                    </h2>
                    <div className="flex space-x-3 text-[10px] font-bold tracking-[0.1em] text-[var(--accent)] uppercase opacity-80 mt-1">
                        <span>{stats.total} SECTORES</span>
                        <span className="text-green-500">{stats.normal} NOMINAL</span>
                        <span className="text-amber-500">{stats.edited} ANOMALÍAS</span>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                {Object.entries(sections).map(([section, sectionFields]) => (
                    <div key={section}>
                        <h3 className="text-xs font-black text-[var(--accent)] uppercase tracking-[0.2em] mb-4 opacity-60 border-l-2 border-[var(--accent)] pl-2">{section}</h3>
                        <div className="space-y-4">
                            {sectionFields
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map(field => {
                                    const isActive = activeFieldId === field.id;
                                    const isEdited = field.isEdited;

                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => handleFieldClick(field.id)}
                                            onContextMenu={(e) => handleContextMenu(e, field.id)}
                                            className={`
                                                relative p-5 rounded-xl border-2 transition-all cursor-pointer group
                                                ${isActive
                                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_20px_rgba(234,179,8,0.1)] ring-1 ring-[var(--accent)]/50'
                                                    : isEdited
                                                        ? 'border-amber-500/50 bg-amber-500/5'
                                                        : 'border-white/5 bg-white/5 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-[var(--accent)]' : 'text-white/60'}`}>
                                                    {field.fieldName}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                    {isActive && (
                                                        <span className="animate-pulse flex items-center text-[var(--accent)] text-[10px] font-black tracking-tighter">
                                                            <Mic className="w-3 h-3 mr-1" /> ANALIZANDO AUDIO
                                                        </span>
                                                    )}
                                                    {isEdited && !isActive && (
                                                        <button
                                                            onClick={(e) => handleFieldReset(e, field.id)}
                                                            className="p-1 hover:bg-white/10 rounded text-amber-500 transition-colors"
                                                            title="Restaurar normalidad"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`text-sm leading-relaxed font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>
                                                {field.isEdited ? (
                                                    <span>{field.currentText}</span>
                                                ) : (
                                                    <>
                                                        {parseTemplateText(field.defaultText).map((token, idx) => {
                                                            if (token.type === 'text') return <span key={idx}>{token.content}</span>;
                                                            if (token.type === 'variable') {
                                                                const options = token.options || [];
                                                                const fieldSels = selections[field.id] || {};
                                                                // If no selection, use first option (default)
                                                                const selectedValue = fieldSels[idx] || options[0];

                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center mx-1 px-2 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/30 border border-[var(--accent)]/30 select-none transition-colors text-[10px] font-black uppercase tracking-tighter"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const currentIndex = options.indexOf(selectedValue);
                                                                            const nextIndex = (currentIndex + 1) % options.length;
                                                                            updateSelection(field.id, idx, options[nextIndex]);
                                                                        }}
                                                                        title="Clic para cambiar opción"
                                                                    >
                                                                        {selectedValue}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </>
                                                )}
                                                {isActive && interimResult && (
                                                    <span className="text-[var(--accent)]/50 italic ml-1">{interimResult}</span>
                                                )}
                                            </div>

                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isActive ? 'bg-[var(--accent)]' : isEdited ? 'bg-amber-500' : 'bg-green-500/30'
                                                }`} />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl flex justify-end items-center space-x-4 shrink-0 shadow-2xl">
                {isListening && (
                    <button
                        onClick={handleStopGlobal}
                        className="px-6 py-3 bg-red-600/20 text-red-500 border border-red-500/50 rounded-xl hover:bg-red-600/30 flex items-center font-black uppercase tracking-widest animate-pulse"
                    >
                        <Square className="w-5 h-5 mr-3" /> DETENER SENSOR
                    </button>
                )}
                <button
                    onClick={() => onComplete(generateReport())}
                    className="px-8 py-4 bg-[var(--accent)] text-black rounded-xl hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.3)] flex items-center font-black uppercase tracking-widest transition-all"
                >
                    <Check className="w-6 h-6 mr-3" />
                    Finalizar Informe
                </button>
            </div>
            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed z-50 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg py-1 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 mb-1">
                        Variantes Rápidas
                    </div>
                    {fields.find(f => f.id === contextMenu.fieldId)?.variants?.length ? (
                        fields.find(f => f.id === contextMenu.fieldId)?.variants?.map((v, i) => (
                            <button
                                key={i}
                                onClick={() => applyVariant(v)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                {v}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-sm text-gray-500 italic">No hay variantes definidas</div>
                    )}
                </div>
            )}
        </div>
    );
}
