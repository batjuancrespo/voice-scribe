"use client";

import { useState, useEffect, useCallback } from 'react';
import { validateMedicalLogic, normalizeMeasurements, MedicalConsistencyIssue } from '@/lib/medicalLogic';

export const useMedicalLogic = (transcript: string) => {
    const [issues, setIssues] = useState<MedicalConsistencyIssue[]>([]);

    useEffect(() => {
        if (!transcript) {
            setIssues([]);
            return;
        }

        const timer = setTimeout(() => {
            const detectedIssues = validateMedicalLogic(transcript);
            setIssues(detectedIssues);
        }, 1000); // Debounce check 1s after typing stops

        return () => clearTimeout(timer);
    }, [transcript]);

    const performAutoFixes = useCallback((text: string) => {
        // Apply safe consistent normalizations (measurements)
        return normalizeMeasurements(text);
    }, []);

    return {
        issues,
        performAutoFixes
    };
};
