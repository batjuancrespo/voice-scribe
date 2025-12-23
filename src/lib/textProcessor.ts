import { RADIOLOGY_DICTIONARY } from './radiologyDictionary';
import { convertTextNumbersToDigits, processMedicalMeasurements } from './numberConverter';

export const PUNCTUATION_MAP: Record<string, string> = {
    " punto y aparte": ".\n",
    " punto y seguido": ". ",
    " punto": ".",
    " coma": ",",
    " dos puntos": ":",
    " punto y coma": ";",
    " abrir interrogación": "¿",
    " cerrar interrogación": "?",
    " signo de interrogación": "?",
    " abrir exclamación": "¡",
    " cerrar exclamación": "!",
    " signo de exclamación": "!",
    " guion": "-",
    " comillas": '"',
    " nueva línea": "\n",
    " salto de línea": "\n",
};

// Helper to check if text ends in a sentence terminator
function needsCapitalization(text: string): boolean {
    if (!text) return true; // Start of document
    if (/\n\s*$/.test(text)) return true; // Ends with newline (and optional spaces)
    const trimmed = text.trim();
    if (!trimmed) return true; // Empty or whitespace only
    const lastChar = trimmed.slice(-1);
    return ['.', '!', '?'].includes(lastChar);
}

// Helper for fuzzy matching (Levenshtein distance)
function getLevenshteinDistance(a: string, b: string): number {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}

export function processTranscriptSegment(text: string, userReplacements: Record<string, string> = {}, previousText: string = ''): string {
    let processed = text;

    // 0. Quick Acronym Booster (TC, RM, BI-RADS, etc.)
    // Matches patterns like "tece", "erre eme", "birads"
    const acronyms: Record<string, string> = {
        'tece': 'TC',
        'erre eme': 'RM',
        'birads': 'BI-RADS',
        'virads': 'VI-RADS',
        'ecografía': 'eco',
    };

    const boundaryStart = '(?<![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';
    const boundaryEnd = '(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';

    Object.entries(acronyms).forEach(([orig, repl]) => {
        const regex = new RegExp(`${boundaryStart}${orig}${boundaryEnd}`, 'gi');
        processed = processed.replace(regex, repl);
    });

    // 1. Convert text numbers to digits
    processed = convertTextNumbersToDigits(processed);

    // 2. Apply Radiology Dictionary
    const radiologyReplacements = Object.entries(RADIOLOGY_DICTIONARY).sort((a, b) => b[0].length - a[0].length);
    radiologyReplacements.forEach(([original, replacement]) => {
        const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, "gi");
        processed = processed.replace(regex, replacement);
    });

    // 3. User Vocabulary Replacements + Fuzzy Matching
    const sortedReplacements = Object.entries(userReplacements).sort((a, b) => b[0].length - a[0].length);
    const words = processed.split(/(\s+)/);

    const processedWords = words.map(word => {
        if (!word.trim()) return word;

        const cleanWord = word.trim().toLowerCase().replace(/[.,:;?!]/g, '');

        // Exact Match
        for (const [original, replacement] of sortedReplacements) {
            if (cleanWord === original.toLowerCase()) {
                return word.toLowerCase().replace(cleanWord, replacement);
            }
        }

        // Fuzzy Match (only for longer words > 4 chars)
        if (cleanWord.length > 4) {
            for (const [original, replacement] of sortedReplacements) {
                // If the error term is also long enough
                if (original.length > 4) {
                    const distance = getLevenshteinDistance(cleanWord, original.toLowerCase());
                    // Threshold: 20% of length or max 2
                    const threshold = Math.min(2, Math.floor(original.length * 0.25));

                    if (distance <= threshold && distance > 0) {
                        console.log(`[Fuzzy Match] "${cleanWord}" matches learned error "${original}". Correcting to "${replacement}"`);
                        return word.toLowerCase().replace(cleanWord, replacement);
                    }
                }
            }
        }

        return word;
    });

    processed = processedWords.join('');

    // 3. Process medical measurement patterns
    processed = processMedicalMeasurements(processed);

    // 4. Basic Punctuation Replacement
    Object.entries(PUNCTUATION_MAP).forEach(([key, value]) => {
        let regex;

        if (key.startsWith(' ')) {
            const word = key.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match start of line or space + word + boundaryEnd
            regex = new RegExp(`(?:^|\\s)${word}${boundaryEnd}`, "gi");
        } else {
            const word = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(`${boundaryStart}${word}${boundaryEnd}`, "gi");
        }

        processed = processed.replace(regex, value);
    });

    // 5. Formatting Rules
    processed = processed.replace(/([.,:;?!])([^\s\n])/g, '$1 $2');
    processed = processed.replace(/\s+([.,:;?!])/g, '$1');

    // 6. Context-aware Capitalization
    // A. Capitalize start if context requires it (based on previous text)
    if (needsCapitalization(previousText)) {
        processed = processed.replace(/^\s*[a-zñáéíóú]/, (match) => match.toUpperCase());
    } else {
        if (previousText.trim().endsWith(',')) {
            processed = processed.replace(/^\s*[A-ZÑÁÉÍÓÚ]/, (match) => match.toLowerCase());
        }
    }

    // B. Capitalize sentences *within* the new segment
    processed = processed.replace(/([.!?]\s+|\n\s*)([a-zñáéíóú])/g, (fullMatch, separator, letter) => {
        if (separator.includes('\n')) {
            separator = separator.replace(/[ \t]+$/, '');
        }
        return separator + letter.toUpperCase();
    });

    return processed;
}

export function capitalizeIdeally(fullText: string): string {
    return fullText.replace(/(^|[.!?]\s+)([a-zñáéíóú])/g, (match) => match.toUpperCase());
}

export interface TextToken {
    type: 'text' | 'variable';
    content: string; // The literal text or the group content
    options?: string[];
}

export function parseTemplateText(text: string): TextToken[] {
    const regex = /\(([^)]+\/[^)]+)\)/g;
    const tokens: TextToken[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }

        const options = match[1].split('/').map(s => s.trim());
        tokens.push({
            type: 'variable',
            content: match[0],
            options
        });

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        tokens.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return tokens;
}
