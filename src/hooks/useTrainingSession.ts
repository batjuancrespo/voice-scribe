"use client";

import { useState, useCallback } from 'react';

export interface TrainingTerm {
    id: string;
    term: string;
    category: 'acronym' | 'descriptor' | 'anatomy' | 'measurement';
}

export interface TrainingResult {
    term: string;
    transcribed: string;
    correct: boolean;
    confidence: number;
}

export const DEFAULT_TRAINING_TERMS: TrainingTerm[] = [
    // Acronyms
    { id: '1', term: 'BI-RADS', category: 'acronym' },
    { id: '2', term: 'TC', category: 'acronym' },
    { id: '3', term: 'RM', category: 'acronym' },
    { id: '4', term: 'VI-RADS', category: 'acronym' },
    { id: '5', term: 'eco', category: 'acronym' },

    // Descriptors
    { id: '6', term: 'hipoecogénico', category: 'descriptor' },
    { id: '7', term: 'hiperecogénico', category: 'descriptor' },
    { id: '8', term: 'isoecogénico', category: 'descriptor' },
    { id: '9', term: 'heterogéneo', category: 'descriptor' },
    { id: '10', term: 'homogéneo', category: 'descriptor' },
    { id: '11', term: 'intraductal', category: 'descriptor' },
    { id: '12', term: 'extracapsular', category: 'descriptor' },

    // Anatomy
    { id: '13', term: 'mama derecha', category: 'anatomy' },
    { id: '14', term: 'mama izquierda', category: 'anatomy' },
    { id: '15', term: 'nódulo', category: 'anatomy' },
    { id: '16', term: 'quiste', category: 'anatomy' },
    { id: '17', term: 'masa', category: 'anatomy' },
    { id: '18', term: 'lesión', category: 'anatomy' },

    // Measurements
    { id: '19', term: 'milímetros', category: 'measurement' },
    { id: '20', term: 'centímetros', category: 'measurement' },
    { id: '21', term: 'aproximadamente', category: 'measurement' },
    { id: '22', term: 'mide', category: 'measurement' }
];

export function useTrainingSession() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<TrainingResult[]>([]);
    const [isActive, setIsActive] = useState(false);
    const [terms, setTerms] = useState<TrainingTerm[]>(DEFAULT_TRAINING_TERMS);

    const startSession = useCallback((customTerms?: TrainingTerm[]) => {
        if (customTerms) {
            setTerms(customTerms);
        }
        setCurrentIndex(0);
        setResults([]);
        setIsActive(true);
    }, []);

    const recordResult = useCallback((transcribed: string) => {
        if (currentIndex >= terms.length) return;

        const currentTerm = terms[currentIndex];
        const normalized = (text: string) => text.toLowerCase().trim().replace(/[^a-záéíóúüñ0-9\s-]/g, '');

        const isCorrect = normalized(transcribed) === normalized(currentTerm.term);

        // Calculate confidence based on string similarity
        const similarity = calculateSimilarity(
            normalized(transcribed),
            normalized(currentTerm.term)
        );

        setResults(prev => [...prev, {
            term: currentTerm.term,
            transcribed,
            correct: isCorrect,
            confidence: similarity
        }]);

        setCurrentIndex(prev => prev + 1);
    }, [currentIndex, terms]);

    const skipCurrent = useCallback(() => {
        if (currentIndex >= terms.length) return;

        setResults(prev => [...prev, {
            term: terms[currentIndex].term,
            transcribed: '(omitido)',
            correct: false,
            confidence: 0
        }]);

        setCurrentIndex(prev => prev + 1);
    }, [currentIndex, terms]);

    const endSession = useCallback(() => {
        setIsActive(false);
    }, []);

    const getProgress = useCallback(() => {
        return {
            current: currentIndex,
            total: terms.length,
            percentage: terms.length > 0 ? (currentIndex / terms.length) * 100 : 0
        };
    }, [currentIndex, terms.length]);

    const getStats = useCallback(() => {
        const correct = results.filter(r => r.correct).length;
        const total = results.length;
        const avgConfidence = total > 0
            ? results.reduce((sum, r) => sum + r.confidence, 0) / total
            : 0;

        return {
            correct,
            incorrect: total - correct,
            total,
            accuracy: total > 0 ? (correct / total) * 100 : 0,
            avgConfidence: avgConfidence * 100
        };
    }, [results]);

    const isComplete = currentIndex >= terms.length;
    const currentTerm = !isComplete ? terms[currentIndex] : null;

    return {
        isActive,
        currentTerm,
        currentIndex,
        results,
        terms,
        isComplete,
        startSession,
        recordResult,
        skipCurrent,
        endSession,
        getProgress,
        getStats
    };
}

// Helper: Calculate string similarity (0-1)
function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}
