"use client";

import { useState, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';

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
}

interface UseStructuredTemplateReturn {
    fields: TemplateField[];
    activeFieldId: string | null;
    startRecording: (fieldId: string) => void;
    stopRecording: (fieldId: string, text: string) => void;
    resetField: (fieldId: string) => void;
    updateField: (fieldId: string, text: string) => void;
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

        Object.entries(sections).forEach(([sectionName, sectionFields]) => {
            report += `${sectionName}:\n`;

            sectionFields
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .forEach(field => {
                    report += `${field.currentText}\n`;
                });

            report += '\n';
        });

        return report.trim();
    }, [fields]);

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
        generateReport,
        stats
    };
};
