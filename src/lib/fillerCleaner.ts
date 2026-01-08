
/**
 * Filler Word Cleaner (Muletillas)
 * Detects and optionally removes common Spanish filler words.
 */

export const MEDICAL_FILLER_WORDS = [
    "eh",
    "estee",
    "mmm",
    "digamos",
    "o sea",
    "bueno",
    "pues",
    "entonces",
    "a ver",
    "este...",
    "ya que",
    "nada",
    "verdad",
];

export interface CleaningResult {
    cleanedText: string;
    removedCount: number;
    removedWords: string[];
}

/**
 * Removes filler words if they appear as standalone tokens or at start/end of phrases.
 * Uses word boundaries to avoid partial word matches.
 */
export function cleanFillerWords(text: string): CleaningResult {
    let cleanedText = text;
    let removedCount = 0;
    const removedWords: string[] = [];

    // Pattern: Match as a whole word, possibly with trailing dots or spaces
    // We favor specific phrases first
    const sortedFillers = [...MEDICAL_FILLER_WORDS].sort((a, b) => b.length - a.length);

    sortedFillers.forEach(filler => {
        // Escape dots for regex
        const escaped = filler.replace(/\./g, '\\.');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

        const matches = cleanedText.match(regex);
        if (matches) {
            removedCount += matches.length;
            matches.forEach(m => {
                if (!removedWords.includes(m.toLowerCase())) {
                    removedWords.push(m.toLowerCase());
                }
            });
            // Replace with nothing, then clean up double spaces
            cleanedText = cleanedText.replace(regex, '');
        }
    });

    // Clean up resulting whitespace mess
    cleanedText = cleanedText
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+([.,:;?!])/g, '$1');

    return {
        cleanedText,
        removedCount,
        removedWords
    };
}
