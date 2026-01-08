/**
 * Silent Error Detector
 * Detects and corrects medical terms that are incorrectly spaced or formatted
 */

export interface SilentError {
    pattern: string;
    correction: string;
    type: 'spacing' | 'compound' | 'accent';
}

// Common silent errors in medical transcription
const SILENT_ERRORS: SilentError[] = [
    // Spacing errors
    { pattern: 'intra ductal', correction: 'intraductal', type: 'spacing' },
    { pattern: 'intra mamario', correction: 'intramamario', type: 'spacing' },
    { pattern: 'extra capsular', correction: 'extracapsular', type: 'spacing' },
    { pattern: 'peri ductal', correction: 'periductal', type: 'spacing' },
    { pattern: 'hipo ecogénico', correction: 'hipoecogénico', type: 'spacing' },
    { pattern: 'hipo ecoico', correction: 'hipoecoico', type: 'spacing' },
    { pattern: 'hiper ecogénico', correction: 'hiperecogénico', type: 'spacing' },
    { pattern: 'hiper ecoico', correction: 'hiperecoico', type: 'spacing' },
    { pattern: 'iso ecogénico', correction: 'isoecogénico', type: 'spacing' },
    { pattern: 'iso ecoico', correction: 'isoecoico', type: 'spacing' },
    { pattern: 'hetero géneo', correction: 'heterogéneo', type: 'spacing' },
    { pattern: 'homo géneo', correction: 'homogéneo', type: 'spacing' },
    { pattern: 'eco genético', correction: 'ecogénico', type: 'spacing' },
    { pattern: 'eco génico', correction: 'ecogénico', type: 'spacing' },

    // Compound word errors
    { pattern: 'bi rads', correction: 'BI-RADS', type: 'compound' },
    { pattern: 'vi rads', correction: 'VI-RADS', type: 'compound' },
    { pattern: 'post operatorio', correction: 'postoperatorio', type: 'compound' },
    { pattern: 'pre operatorio', correction: 'preoperatorio', type: 'compound' },
    { pattern: 'post quirúrgico', correction: 'postquirúrgico', type: 'compound' },
    { pattern: 'pre quirúrgico', correction: 'prequirúrgico', type: 'compound' },

    // Common phonetic errors
    { pattern: 'eco genito', correction: 'ecogénico', type: 'spacing' },
    { pattern: 'ipoecoico', correction: 'hipoecogénico', type: 'accent' },
    { pattern: 'iperecoico', correction: 'hiperecogénico', type: 'accent' }
];

/**
 * Detect silent errors in text
 */
export function detectSilentErrors(text: string): Array<{
    original: string;
    suggestion: string;
    position: number;
    type: string;
}> {
    const errors: Array<{
        original: string;
        suggestion: string;
        position: number;
        type: string;
    }> = [];

    SILENT_ERRORS.forEach(({ pattern, correction, type }) => {
        const regex = new RegExp(pattern, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
            errors.push({
                original: match[0],
                suggestion: correction,
                position: match.index,
                type
            });
        }
    });

    return errors.sort((a, b) => a.position - b.position);
}

/**
 * Auto-correct silent errors in text
 */
export function correctSilentErrors(text: string): {
    correctedText: string;
    corrections: Array<{ from: string; to: string }>;
} {
    let correctedText = text;
    const corrections: Array<{ from: string; to: string }> = [];

    // Sort by length (longest first) to avoid partial replacements
    const sortedErrors = [...SILENT_ERRORS].sort((a, b) =>
        b.pattern.length - a.pattern.length
    );

    sortedErrors.forEach(({ pattern, correction }) => {
        const regex = new RegExp(
            `(?<![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])${pattern}(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])`,
            'gi'
        );

        const matches = correctedText.match(regex);
        if (matches) {
            matches.forEach(match => {
                corrections.push({ from: match, to: correction });
            });
            correctedText = correctedText.replace(regex, correction);
        }
    });

    return { correctedText, corrections };
}

/**
 * Check if a specific word/phrase has a known silent error
 */
export function hasSilentError(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return SILENT_ERRORS.some(({ pattern }) =>
        normalized === pattern.toLowerCase()
    );
}

/**
 * Get suggestion for a specific text if it has a silent error
 */
export function getSilentErrorSuggestion(text: string): string | null {
    const normalized = text.toLowerCase().trim();
    const error = SILENT_ERRORS.find(({ pattern }) =>
        normalized === pattern.toLowerCase()
    );
    return error?.correction || null;
}

/**
 * Add a new silent error pattern (for user customization)
 */
export function addSilentErrorPattern(pattern: string, correction: string, type: SilentError['type'] = 'spacing'): void {
    // Check if pattern already exists
    const exists = SILENT_ERRORS.some(e => e.pattern.toLowerCase() === pattern.toLowerCase());
    if (!exists) {
        SILENT_ERRORS.push({ pattern, correction, type });
    }
}

export { SILENT_ERRORS };
