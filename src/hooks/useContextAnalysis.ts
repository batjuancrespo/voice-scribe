"use client";

/**
 * Context Analysis Hook
 * Analyzes medical context to predict and validate terms
 */

export interface ContextPattern {
    word: string;
    next?: string[];  // Common words that follow
    before?: string[]; // Common words that precede
    context?: string[]; // General context words
}

// Common medical patterns in radiology
const MEDICAL_PATTERNS: ContextPattern[] = [
    {
        word: 'bi-rads',
        next: ['1', '2', '3', '4', '4a', '4b', '4c', '5', '6', 'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis']
    },
    {
        word: 'vi-rads',
        next: ['1', '2', '3', '4', '5']
    },
    {
        word: 'mama',
        next: ['derecha', 'izquierda', 'bilateral'],
        before: ['en', 'la']
    },
    {
        word: 'nódulo',
        next: ['sólido', 'quístico', 'mixto', 'hipoecogénico', 'hiperecogénico', 'isoecogénico'],
        before: ['se', 'observa', 'identifica', 'visualiza']
    },
    {
        word: 'mide',
        next: ['aproximadamente', 'alrededor'],
        before: ['nódulo', 'masa', 'lesión']
    },
    {
        word: 'tamaño',
        before: ['de', 'con', 'en'],
        next: ['aproximado', 'de']
    },
    {
        word: 'lesión',
        next: ['focal', 'difusa', 'sólida', 'quística'],
        before: ['se', 'observa', 'identifica']
    },
    {
        word: 'eco',
        next: ['mamario', 'abdominal', 'pélvico', 'tiroidea', 'renal']
    },
    {
        word: 'tc',
        next: ['de', 'abdominal', 'torácico', 'pélvico', 'craneal']
    },
    {
        word: 'rm',
        next: ['de', 'abdominal', 'cerebral', 'pélvica', 'mamaria']
    }
];

export function useContextAnalysis() {
    /**
     * Predict the next word based on the current word and medical patterns
     */
    const predictNextWord = (currentWord: string): string[] => {
        const normalized = currentWord.toLowerCase().trim();
        const pattern = MEDICAL_PATTERNS.find(p => p.word === normalized);
        return pattern?.next || [];
    };

    /**
     * Get words that commonly precede the current word
     */
    const getPrecedingWords = (currentWord: string): string[] => {
        const normalized = currentWord.toLowerCase().trim();
        const pattern = MEDICAL_PATTERNS.find(p => p.word === normalized);
        return pattern?.before || [];
    };

    /**
     * Validate if a word makes sense in the given context
     */
    const validateContext = (word: string, before: string, after: string): {
        isValid: boolean;
        confidence: number;
        suggestion?: string;
    } => {
        const normalized = word.toLowerCase().trim();
        const pattern = MEDICAL_PATTERNS.find(p => p.word === normalized);

        if (!pattern) {
            return { isValid: true, confidence: 0.5 }; // Unknown word, neutral
        }

        let confidence = 0.5; // Base confidence
        const beforeWords = before.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const afterWords = after.toLowerCase().split(/\s+/).filter(w => w.length > 0);

        // Check if the words before match expected patterns
        if (pattern.before && beforeWords.length > 0) {
            const lastBefore = beforeWords[beforeWords.length - 1];
            if (pattern.before.some(expected => lastBefore.includes(expected))) {
                confidence += 0.3;
            }
        }

        // Check if the words after match expected patterns
        if (pattern.next && afterWords.length > 0) {
            const firstAfter = afterWords[0];
            if (pattern.next.some(expected => firstAfter.includes(expected))) {
                confidence += 0.3;
            }
        }

        return {
            isValid: confidence > 0.5,
            confidence: Math.min(1.0, confidence)
        };
    };

    /**
     * Suggest correction based on context
     */
    const suggestCorrection = (word: string, context: { before: string; after: string }): string | null => {
        const normalized = word.toLowerCase().trim();

        // Check for common misheard medical terms
        const commonMistakes: Record<string, string> = {
            'bayrads': 'bi-rads',
            'birads': 'bi-rads',
            'bi rads': 'bi-rads',
            'virrads': 'vi-rads',
            'vi rads': 'vi-rads',
            'tece': 'tc',
            'te ce': 'tc',
            'erre eme': 'rm',
            'erreeme': 'rm'
        };

        if (commonMistakes[normalized]) {
            return commonMistakes[normalized];
        }

        // Check if it's a number following BI-RADS
        if (context.before.toLowerCase().includes('bi-rads') ||
            context.before.toLowerCase().includes('birads')) {
            // Validate it's a valid BI-RADS score
            const validScores = ['0', '1', '2', '3', '4', '4a', '4b', '4c', '5', '6'];
            if (validScores.includes(normalized)) {
                return null; // Already valid
            }

            // Try to convert text numbers
            const textToNum: Record<string, string> = {
                'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3',
                'cuatro': '4', 'cinco': '5', 'seis': '6'
            };
            if (textToNum[normalized]) {
                return textToNum[normalized];
            }
        }

        return null;
    };

    /**
     * Get all context hints for a word
     */
    const getContextHints = (word: string): {
        expectedBefore: string[];
        expectedAfter: string[];
    } => {
        const normalized = word.toLowerCase().trim();
        const pattern = MEDICAL_PATTERNS.find(p => p.word === normalized);

        return {
            expectedBefore: pattern?.before || [],
            expectedAfter: pattern?.next || []
        };
    };

    return {
        predictNextWord,
        getPrecedingWords,
        validateContext,
        suggestCorrection,
        getContextHints,
        MEDICAL_PATTERNS
    };
}
