/**
 * Variant Generator
 * Automatically generates common variations of learned terms
 */

export type VariantType = 'spacing' | 'accents' | 'case' | 'plurals';

export interface VariantOptions {
    generateSpacing?: boolean;
    generateAccents?: boolean;
    generateCase?: boolean;
    generatePlurals?: boolean;
}

const DEFAULT_OPTIONS: VariantOptions = {
    generateSpacing: true,
    generateAccents: true,
    generateCase: false, // Don't generate case variants by default
    generatePlurals: false // Plurals can be tricky in medical terms
};

/**
 * Generate spacing variants (e.g., "hipoecogénico" -> "hipo ecogénico", "hipo-ecogénico")
 */
function generateSpacingVariants(term: string): string[] {
    const variants: string[] = [];

    // Common medical prefixes
    const prefixes = ['hipo', 'hiper', 'iso', 'intra', 'extra', 'peri', 'endo', 'epi', 'pre', 'post'];

    for (const prefix of prefixes) {
        if (term.toLowerCase().startsWith(prefix)) {
            const rest = term.slice(prefix.length);
            if (rest.length > 0) {
                // Add spaced version
                variants.push(`${prefix} ${rest}`);
                // Add hyphenated version
                variants.push(`${prefix}-${rest}`);
            }
        }
    }

    return variants;
}

/**
 * Generate accent variants (e.g., "ecogenico" -> "ecogénico")
 */
function generateAccentVariants(term: string): string[] {
    const variants: string[] = [];

    // Common accent patterns in medical Spanish
    const accentMap: Record<string, string> = {
        'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú',
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'
    };

    // Generate versions with and without accents on vowels
    const chars = term.split('');
    for (let i = 0; i < chars.length; i++) {
        if (accentMap[chars[i]]) {
            const variant = [...chars];
            variant[i] = accentMap[chars[i]];
            variants.push(variant.join(''));
        }
    }

    return variants;
}

/**
 * Generate case variants
 */
function generateCaseVariants(term: string): string[] {
    return [
        term.toLowerCase(),
        term.toUpperCase(),
        term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
    ];
}

/**
 * Generate all variants for a term
 */
export function generateVariants(
    term: string,
    options: VariantOptions = DEFAULT_OPTIONS
): string[] {
    const allVariants = new Set<string>([term]); // Include original

    if (options.generateSpacing) {
        generateSpacingVariants(term).forEach(v => allVariants.add(v));
    }

    if (options.generateAccents) {
        generateAccentVariants(term).forEach(v => allVariants.add(v));
    }

    if (options.generateCase) {
        generateCaseVariants(term).forEach(v => allVariants.add(v));
    }

    // Remove the original term and return unique variants
    allVariants.delete(term);
    return Array.from(allVariants).filter(v => v.length > 0);
}

/**
 * Generate variant pairs for vocabulary learning
 * Returns array of [error, correction] pairs
 */
export function generateVariantPairs(
    errorTerm: string,
    correctTerm: string,
    options: VariantOptions = DEFAULT_OPTIONS
): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];

    // Generate variants of the error term, all mapping to the correct term
    const errorVariants = generateVariants(errorTerm, options);
    errorVariants.forEach(variant => {
        pairs.push([variant, correctTerm]);
    });

    // Also include the original error -> correct mapping
    pairs.push([errorTerm, correctTerm]);

    return pairs;
}

/**
 * Add variants to user vocabulary
 */
export async function addVariantsToVocabulary(
    errorTerm: string,
    correctTerm: string,
    addReplacementFn: (original: string, replacement: string) => Promise<void>,
    options: VariantOptions = DEFAULT_OPTIONS
): Promise<number> {
    const pairs = generateVariantPairs(errorTerm, correctTerm, options);
    let added = 0;

    for (const [error, correct] of pairs) {
        try {
            await addReplacementFn(error, correct);
            added++;
        } catch (e) {
            console.error(`Failed to add variant: ${error} -> ${correct}`, e);
        }
    }

    return added;
}
