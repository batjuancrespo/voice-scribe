import { RADIOLOGY_DICTIONARY } from './radiologyDictionary';
import { convertTextNumbersToDigits, processMedicalMeasurements } from './numberConverter';
import { correctSilentErrors } from './silentErrorDetector';
import { cleanFillerWords } from './fillerCleaner';
import { getSpanishPhoneticCode } from './phoneticMatcher';

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

    // 0. Filler Word Removal (Muletillas)
    const { cleanedText } = cleanFillerWords(processed);
    processed = cleanedText;

    // 0. Silent Error Detection and Correction
    // Fix common spacing/compound errors FIRST (e.g., "hipo ecogénico" -> "hipoecogénico")
    const { correctedText, corrections } = correctSilentErrors(processed);
    processed = correctedText;
    if (corrections.length > 0) {
        console.log('[Silent Errors Fixed]:', corrections);
    }

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

    // 3. User Vocabulary Replacements (Phrases first, then words)
    const sortedReplacements = Object.entries(userReplacements).sort((a, b) => b[0].length - a[0].length);

    // Separate phrases (contain spaces) from single words
    const phraseReplacements = sortedReplacements.filter(([orig]) => orig.includes(' '));
    const wordReplacements = sortedReplacements.filter(([orig]) => !orig.includes(' '));

    // Process phrases first (they're longer and more specific)
    phraseReplacements.forEach(([original, replacement]) => {
        const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, 'gi');
        processed = processed.replace(regex, replacement);
    });

    // Then process word-level replacements with fuzzy matching
    const words = processed.split(/(\s+)/);

    // Protected words (Punctuation keys)
    const protectedWords = new Set(Object.keys(PUNCTUATION_MAP).map(k => k.trim()));
    protectedWords.add('punto');
    protectedWords.add('coma');
    protectedWords.add('dos puntos');

    // Quality 7.1: Strict Medical Vocabulary for Fuzzy Matching
    // Filter RADIOLOGY_DICTIONARY for single words > 5 chars to avoid noise
    const medicalWordReplacements = Object.entries(RADIOLOGY_DICTIONARY)
        .filter(([orig]) => !orig.includes(' ') && orig.length > 5);

    // Create a set of "Valid Outcomes" to avoid correcting something that is already correct
    const validMedicalTerms = new Set<string>();
    Object.entries(RADIOLOGY_DICTIONARY).forEach(([k, v]) => {
        if (!k.includes(' ')) validMedicalTerms.add(k.toLowerCase());
        if (typeof v === 'string' && !v.includes(' ')) validMedicalTerms.add(v.toLowerCase());
    });

    // Combine user dictionary and medical dictionary
    const fuzzyTargets = [...wordReplacements, ...medicalWordReplacements];

    const processedWords = words.map(word => {
        if (!word.trim()) return word;

        const cleanWord = word.trim().toLowerCase().replace(/[.,:;?!]/g, '');

        // SKIP replacements for protected punctuation words
        if (protectedWords.has(cleanWord)) {
            return word;
        }

        // Quality 7.1 & 7.2: If the word is ALREADY a valid medical term or plural of one, SKIP FUZZY
        // This prevents "densidad" -> "isodensidad" or "normales" -> "normal"
        const isPlural = cleanWord.endsWith('s') && cleanWord.length > 4;
        const singularWord = isPlural ? cleanWord.slice(0, -1) : cleanWord;

        // Quality 7.2: Gender Neutral Validation (o/a)
        const masculineVersion = singularWord.endsWith('a') ? singularWord.slice(0, -1) + 'o' : singularWord;

        if (validMedicalTerms.has(cleanWord) || validMedicalTerms.has(singularWord) || validMedicalTerms.has(masculineVersion)) {
            return word;
        }

        // Exact Match (User dictates something exactly as in dictionary)
        for (const [original, replacement] of wordReplacements) {
            if (cleanWord === original.toLowerCase()) {
                const isUpper = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
                const result = word.toLowerCase().replace(cleanWord, replacement);
                return isUpper ? result.charAt(0).toUpperCase() + result.slice(1) : result;
            }
        }

        // Fuzzy Match (Quality 7.1: Calibrated thresholds)
        if (cleanWord.length > 5) {
            for (const [original, replacement] of fuzzyTargets) {
                if (original.length > 5) {
                    const distance = getLevenshteinDistance(cleanWord, original.toLowerCase());

                    // Quality 7.1: Stricter Thresholds
                    // - 1 error for words up to 8 chars
                    // - 2 errors for words up to 12 chars
                    // - 3 errors ONLY for very long terms (> 12 chars)
                    let threshold = 1;
                    if (original.length > 12) threshold = 3;
                    else if (original.length > 8) threshold = 2;

                    // Substring Protection: If one is a substring of another and dist > 1, reject
                    // This specifically fixes "densidad" (dist 3) matching "isodensidad"
                    const isSub = original.toLowerCase().includes(cleanWord) || cleanWord.includes(original.toLowerCase());
                    const finalThreshold = (isSub && distance > 1) ? 1 : threshold;

                    if (distance <= finalThreshold && distance > 0) {
                        console.log(`[Fuzzy Total Match] "${cleanWord}" matches "${original}". Correcting to "${replacement}"`);
                        const isUpper = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
                        const result = word.toLowerCase().replace(cleanWord, replacement);
                        return isUpper ? result.charAt(0).toUpperCase() + result.slice(1) : result;
                    }

                    // SECONDARY: Phonetic Match (Strict: only if length is similar)
                    if (getSpanishPhoneticCode(cleanWord) === getSpanishPhoneticCode(original)) {
                        const lenDiff = Math.abs(cleanWord.length - original.length);
                        if (lenDiff <= 2) {
                            console.log(`[Phonetic Match] "${cleanWord}" sounds like "${original}". Correcting to "${replacement}"`);
                            const isUpper = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
                            const result = word.toLowerCase().replace(cleanWord, replacement);
                            return isUpper ? result.charAt(0).toUpperCase() + result.slice(1) : result;
                        }
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
