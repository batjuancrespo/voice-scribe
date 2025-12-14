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

export function processTranscriptSegment(text: string, userReplacements: Record<string, string> = {}, previousText: string = ''): string {
    let processed = text;

    // 0. Convert text numbers to digits FIRST (before any other processing)
    processed = convertTextNumbersToDigits(processed);

    // 1. Apply Radiology Dictionary (pre-loaded medical terms)
    const radiologyReplacements = Object.entries(RADIOLOGY_DICTIONARY).sort((a, b) => b[0].length - a[0].length);

    radiologyReplacements.forEach(([original, replacement]) => {
        const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, "gi");
        processed = processed.replace(regex, replacement);
    });

    // 2. User Vocabulary Replacements (override radiology dictionary if needed)
    const sortedReplacements = Object.entries(userReplacements).sort((a, b) => b[0].length - a[0].length);

    // DEBUG: Log user replacements
    if (sortedReplacements.length > 0) {
        console.log('[Dictionary] User replacements:', sortedReplacements);
        console.log('[Dictionary] Processing text:', processed);
    }

    sortedReplacements.forEach(([original, replacement]) => {
        const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, "gi");
        const beforeReplace = processed;
        processed = processed.replace(regex, replacement);

        if (beforeReplace !== processed) {
            console.log(`[Dictionary] Applied: "${original}" → "${replacement}"`);
            console.log(`[Dictionary] Before: "${beforeReplace}"`);
            console.log(`[Dictionary] After: "${processed}"`);
        }
    });

    // 3. Process medical measurement patterns
    processed = processMedicalMeasurements(processed);

    // 4. Basic Punctuation Replacement
    Object.entries(PUNCTUATION_MAP).forEach(([key, value]) => {
        let pattern = key;
        // If key starts with space, allow matching start of line too
        if (pattern.startsWith(' ')) {
            const word = pattern.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
            pattern = `(?:^|\\s)${word}`;
        } else {
            pattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        const regex = new RegExp(pattern, "gi");
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
