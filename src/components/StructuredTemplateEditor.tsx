"use client";

import React, { useEffect, useState } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { useStructuredTemplate } from '@/hooks/useStructuredTemplate';
import { TemplateField as DbTemplateField } from '@/hooks/useTemplates';
import { Mic, Check, AlertTriangle, Play, Square, X, RotateCcw } from 'lucide-react';

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
        isRequired: f.is_required
    }));

    const {
        fields,
        activeFieldId,
        startRecording: setFieldRecording,
        stopRecording: setFieldStopped,
        resetField,
        updateField,
        generateReport,
        stats
    } = useStructuredTemplate(mappedFields);

    const {
        isListening,
        startListening,
        stopListening,
        interimResult,
        lastEvent
    } = useTranscription();

    // Effect to handle transcription results
    useEffect(() => {
        if (activeFieldId && lastEvent) {
            const field = fields.find(f => f.id === activeFieldId);
            if (field) {
                // Determine if we should append or start fresh
                // Logic: If field was "freshly" opened for recording, maybe we should've cleared it?
                // But for now, let's just append if it's already edited, or replace if it's default.

                let newText = field.currentText;

                // If the text is the default text, replace it completely on first dictation
                if (field.currentText === field.defaultText) {
                    newText = lastEvent.text; // Start fresh
                } else {
                    // If already edited/recording, append
                    newText = (field.currentText + ' ' + lastEvent.text).trim();
                }

                updateField(activeFieldId, newText);
            }
        }
    }, [lastEvent, activeFieldId, fields, updateField]);

    const handleFieldClick = (fieldId: string) => {
        // If already listening on this field, stop
        if (isListening && activeFieldId === fieldId) {
            stopListening();
            setFieldStopped(fieldId, fields.find(f => f.id === fieldId)?.currentText || '');
        } else {
            // If listening on another field, stop that one first
            if (isListening) {
                stopListening();
                // Find prev active
                if (activeFieldId) {
                    setFieldStopped(activeFieldId, fields.find(f => f.id === activeFieldId)?.currentText || '');
                }
            }

            // Start recording on this field
            // Clear default text if we are starting fresh? Maybe best handled in the useEffect above to apply only when speech is detected.
            // But visuals should update immediately.
            setFieldRecording(fieldId);
            startListening();
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
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{templateName}</h2>
                    <div className="flex space-x-3 text-xs mt-1">
                        <span className="text-gray-500">{stats.total} campos</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{stats.normal} normales</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{stats.edited} patológicos</span>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {Object.entries(sections).map(([section, sectionFields]) => (
                    <div key={section}>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{section}</h3>
                        <div className="space-y-3">
                            {sectionFields
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map(field => {
                                    const isActive = activeFieldId === field.id;
                                    const isEdited = field.isEdited;

                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => handleFieldClick(field.id)}
                                            className={`
                                                relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                                                ${isActive
                                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg ring-2 ring-red-200 dark:ring-red-900'
                                                    : isEdited
                                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                                        : 'border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-600'
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-sm font-bold ${isActive ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {field.fieldName}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                    {isActive && (
                                                        <span className="animate-pulse flex items-center text-red-600 text-xs font-bold">
                                                            <Mic className="w-3 h-3 mr-1" /> GRABANDO
                                                        </span>
                                                    )}
                                                    {isEdited && !isActive && (
                                                        <button
                                                            onClick={(e) => handleFieldReset(e, field.id)}
                                                            className="p-1 hover:bg-white/50 rounded text-amber-600 hover:text-amber-800"
                                                            title="Restaurar normalidad"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {field.currentText}
                                                {isActive && interimResult && (
                                                    <span className="text-gray-400 italic ml-1">{interimResult}</span>
                                                )}
                                            </p>

                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isActive ? 'bg-red-500' : isEdited ? 'bg-amber-400' : 'bg-green-400'
                                                }`} />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                {isListening && (
                    <button
                        onClick={handleStopGlobal}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center font-medium animate-pulse"
                    >
                        <Square className="w-4 h-4 mr-2" /> Detener Grabación
                    </button>
                )}
                <button
                    onClick={() => onComplete(generateReport())}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg flex items-center font-bold"
                >
                    <Check className="w-5 h-5 mr-2" />
                    Finalizar Informe
                </button>
            </div>
        </div>
    );
}
