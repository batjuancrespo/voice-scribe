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
}
