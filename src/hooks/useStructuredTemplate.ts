"use client";

import { useState, useCallback } from 'react';
import { parseTemplateText } from '@/lib/textProcessor';

export interface TemplateField {
    id: string;
    fieldName: string;
    defaultText: string;
    currentText: string;
    section: string;
    displayOrder: number;
    isRequired: boolean;
    isEdited: boolean;
    isRecording: boolean;
    variants?: string[];
}

interface UseStructuredTemplateReturn {
    fields: TemplateField[];
    activeFieldId: string | null;
    startRecording: (fieldId: string) => void;
    stopRecording: (fieldId: string, text: string) => void;
    resetField: (fieldId: string) => void;
    updateField: (fieldId: string, text: string) => void;

    updateSelection: (fieldId: string, variableIndex: number, optionValue: string) => void;
    selections: Record<string, Record<number, string>>;
    generateReport: () => string;
    stats: {
        total: number;
        edited: number;
        normal: number;
    };
}

export const useStructuredTemplate = (
    initialFields: Omit<TemplateField, 'currentText' | 'isEdited' | 'isRecording'>[]
): UseStructuredTemplateReturn => {
    const [fields, setFields] = useState<TemplateField[]>(() =>
        initialFields.map(field => ({
            ...field,
            currentText: field.defaultText,
            isEdited: false,
            isRecording: false
        }))
    );
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [selections, setSelections] = useState<Record<string, Record<number, string>>>({});

    const updateSelection = useCallback((fieldId: string, variableIndex: number, optionValue: string) => {
        setSelections(prev => {
            const fieldSels = prev[fieldId] || {};
            return {
                ...prev,
                [fieldId]: {
                    ...fieldSels,
                    [variableIndex]: optionValue
                }
            };
        });
    }, []);

    const startRecording = useCallback((fieldId: string) => {
        setFields(prev => prev.map(field =>
            field.id === fieldId
                ? { ...field, isRecording: true }
                : { ...field, isRecording: false }
        ));
        setActiveFieldId(fieldId);
    }, []);

    const stopRecording = useCallback((fieldId: string, text: string) => {
        setFields(prev => prev.map(field =>
            field.id === fieldId
                ? {
                    ...field,
                    currentText: text.trim(),
                    isRecording: false,
                    isEdited: text.trim() !== field.defaultText
                }
                : field
        ));
        setActiveFieldId(null);
    }, []);

    const resetField = useCallback((fieldId: string) => {
        setFields(prev => prev.map(field =>
            field.id === fieldId
                ? {
                    ...field,
                    currentText: field.defaultText,
                    isEdited: false,
                    isRecording: false
                }
                : field
        ));
    }, []);

    const updateField = useCallback((fieldId: string, text: string) => {
        setFields(prev => prev.map(field =>
            field.id === fieldId
                ? {
                    ...field,
                    currentText: text,
                    isEdited: text !== field.defaultText
                }
                : field
        ));
    }, []);

    const generateReport = useCallback(() => {
        // Group fields by section
        const sections: Record<string, TemplateField[]> = {};

        fields.forEach(field => {
            if (!sections[field.section]) {
                sections[field.section] = [];
            }
            sections[field.section].push(field);
        });

        // Build report text
        let report = '';

        Object.entries(sections).forEach(([, sectionFields]) => {
            // report += `${sectionName}:\n`; // Remove section header as requested

            sectionFields
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .forEach(field => {

                    // Normalize text and ensure period at end
                    let text = '';

                    if (field.isEdited) {
                        text = field.currentText.trim();
                    } else {
                        // Construct text from defaultText and selections
                        const tokens = parseTemplateText(field.defaultText);
                        const fieldSels = selections[field.id] || {};
                        text = tokens.map((token, index) => {
                            if (token.type === 'text') return token.content;
                            if (token.options && token.options.length > 0) {
                                return fieldSels[index] || token.options[0];
                            }
                            return token.content;
                        }).join('').trim();
                    }

                    if (text && !/[.!?]$/.test(text)) {
                        text += '.';
                    }

                    // Logic: If edited, omit field name (user replaces everything).
                    // If normal, keep field name context.
                    if (field.isEdited) {
                        report += `${text}\n`;
                    } else {
                        report += `${field.fieldName} ${text}\n`;
                    }
                });

            report += '\n';
        });

        return report.trim();
    }, [fields, selections]);

    const stats = {
        total: fields.length,
        edited: fields.filter(f => f.isEdited).length,
        normal: fields.filter(f => !f.isEdited).length
    };

    return {
        fields,
        activeFieldId,
        startRecording,
        stopRecording,
        resetField,
        updateField,

        updateSelection,
        selections,
        generateReport,
        stats
    };
};
