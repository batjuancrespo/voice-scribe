/**
 * Spanish Phonetic Matcher (Simplified)
 * Goal: Convert Spanish words to a phonetic representation to compare how they sound.
 * Handles common Spanish variations: b/v, h-dropping, ll/y, s/c/z, etc.
 */

export function getSpanishPhoneticCode(word: string): string {
    if (!word) return "";

    let result = word.toLowerCase().trim();

    // 1. Remove accents (normalize)
    result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 2. Remove silent 'h' (except ch)
    // We handle 'ch' specifically later, so let's mark it
    result = result.replace(/ch/g, "X"); // Temporary 'X' for 'ch'
    result = result.replace(/h/g, "");
    result = result.replace(/X/g, "ch");

    // 3. Normalize b/v
    result = result.replace(/v/g, "b");

    // 4. Normalize ll/y
    result = result.replace(/ll/g, "y");

    // 5. Normalize s/z/c (before e, i) -> 's'
    result = result.replace(/z/g, "s");
    result = result.replace(/ce/g, "se");
    result = result.replace(/ci/g, "si");

    // 6. Normalize hard 'c', 'k', 'que', 'qui' -> 'k'
    result = result.replace(/que/g, "ke");
    result = result.replace(/qui/g, "ki");
    result = result.replace(/c/g, "k"); // Remaining 'c' are hard (ca, co, cu)

    // 7. Normalize g/j
    // ge, gi, j -> 'j' (phonetically /x/)
    result = result.replace(/ge/g, "je");
    result = result.replace(/gi/g, "ji");
    // g (ga, go, gu) remains 'g'

    // 8. Normalize x -> 'ks'
    result = result.replace(/x/g, "ks");

    // 9. Remove duplicate letters
    let deduplicated = "";
    for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i] !== result[i - 1]) {
            deduplicated += result[i];
        }
    }

    return deduplicated;
}

export function arePhoneticallySimilar(word1: string, word2: string): boolean {
    const code1 = getSpanishPhoneticCode(word1);
    const code2 = getSpanishPhoneticCode(word2);

    if (code1 === code2) return true;

    // Optional: Add Jaro-Winkler or similar on the phonetic codes if they aren't exact
    // For now, exact phonetic code match is a very strong signal.
    return false;
}
