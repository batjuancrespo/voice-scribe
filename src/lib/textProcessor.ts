
export const PUNCTUATION_MAP: Record<string, string> = {
    " punto y aparte": ".\n\n",
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

    // 0. User Vocabulary Replacements (Pre-punctuation)
    Object.entries(userReplacements).forEach(([original, replacement]) => {
        const regex = new RegExp(`\\b${original}\\b`, "gi");
        processed = processed.replace(regex, replacement);
    });

    // 1. Basic Punctuation Replacement
    Object.entries(PUNCTUATION_MAP).forEach(([key, value]) => {
        const regex = new RegExp(key, "gi");
        processed = processed.replace(regex, value);
    });

    // 2. Formatting Rules
    processed = processed.replace(/([.,:;?!])([^\s\n])/g, '$1 $2');
    processed = processed.replace(/\s+([.,:;?!])/g, '$1');

    // 3. Context-aware Capitalization
    // A. Capitalize start if context requires it (based on previous text)
    if (needsCapitalization(previousText)) {
        processed = processed.replace(/^\s*[a-zñáéíóú]/, (match) => match.toUpperCase());
    } else {
        if (previousText.trim().endsWith(',')) {
            processed = processed.replace(/^\s*[A-ZÑÁÉÍÓÚ]/, (match) => match.toLowerCase());
        }
    }

    // B. Capitalize sentences *within* the new segment (e.g. "punto y aparte la casa" -> ".\n\n La casa")
    // Match: Punctuation/Newline + whitespace + lowercase letter
    processed = processed.replace(/([.!?]\s+|\n\s*)([a-zñáéíóú])/g, (fullMatch, separator, letter) => {
        // If separator contains newline, remove *trailing* spaces (indentation) so letter starts at margin
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
