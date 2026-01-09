import { diffWordsWithSpace } from 'diff';

export interface DiffChunk {
    value: string;
    added?: boolean;
    removed?: boolean;
}

/**
 * Computes the difference between two strings using word-based diffing.
 * Returns an array of chunks indicating added, removed, or unchanged text.
 */
export function computeDiff(original: string, modified: string): DiffChunk[] {
    return diffWordsWithSpace(original, modified);
}/**
 * Extracts specific correction pairs (removed followed by added) from a diff.
 * This avoids capturing surrounding correct text.
 */
export function extractCorrectionPairs(chunks: DiffChunk[]): { original: string; replacement: string }[] {
    const pairs: { original: string; replacement: string }[] = [];

    for (let i = 0; i < chunks.length - 1; i++) {
        const current = chunks[i];
        const next = chunks[i + 1];

        // Case: Removed followed immediately by Added (Standard replacement)
        if (current.removed && next.added) {
            const orig = current.value.trim();
            const repl = next.value.trim();
            if (orig && repl && orig.toLowerCase() !== repl.toLowerCase()) {
                pairs.push({ original: orig, replacement: repl });
            }
        }
        // Case: Added followed by Removed (Sometimes happens depending on diff engine)
        else if (current.added && next.removed) {
            const orig = next.value.trim();
            const repl = current.value.trim();
            if (orig && repl && orig.toLowerCase() !== repl.toLowerCase()) {
                pairs.push({ original: orig, replacement: repl });
            }
        }
    }

    return pairs;
}
