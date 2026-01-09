
interface MedicalTerm {
    term: string;
    gender: 'M' | 'F';
    isPaired: boolean; // true = r/l applies; false = usually midline or specific side
    defaultSide?: 'right' | 'left' | 'midline';
}

const MEDICAL_NOUNS: Record<string, MedicalTerm> = {
    // Órganos impares (línea media o lado único)
    "hígado": { term: "hígado", gender: "M", isPaired: false, defaultSide: "right" },
    "bazo": { term: "bazo", gender: "M", isPaired: false, defaultSide: "left" },
    "páncreas": { term: "páncreas", gender: "M", isPaired: false, defaultSide: "midline" },
    "vesícula": { term: "vesícula", gender: "F", isPaired: false, defaultSide: "right" },
    "útero": { term: "útero", gender: "M", isPaired: false, defaultSide: "midline" },
    "próstata": { term: "próstata", gender: "F", isPaired: false, defaultSide: "midline" },
    "vejiga": { term: "vejiga", gender: "F", isPaired: false, defaultSide: "midline" },
    "aorta": { term: "aorta", gender: "F", isPaired: false, defaultSide: "midline" },
    "apéndice": { term: "apéndice", gender: "M", isPaired: false, defaultSide: "right" },

    // Órganos pares (deben tener lateralidad o "bilateral")
    "riñón": { term: "riñón", gender: "M", isPaired: true },
    "pulmón": { term: "pulmón", gender: "M", isPaired: true },
    "ovario": { term: "ovario", gender: "M", isPaired: true },
    "testículo": { term: "testículo", gender: "M", isPaired: true },
    "adrenal": { term: "adrenal", gender: "F", isPaired: true }, // Glándula
    "glandula suprarrenal": { term: "glándula suprarrenal", gender: "F", isPaired: true },
    "mama": { term: "mama", gender: "F", isPaired: true },
    "lóbulo temporal": { term: "lóbulo temporal", gender: "M", isPaired: true },
    // ... expand as needed
};

// Common gender errors to check (Adjective endings)
// This is simplistic; a full NLP parser would be better but this covers 80% of typos.
const GENDER_MISMATCHES = [
    { noun: "útero", wrongAdj: "a", rightAdj: "o" }, // útero distendida -> distendido
    { noun: "hígado", wrongAdj: "a", rightAdj: "o" },
    { noun: "bazo", wrongAdj: "a", rightAdj: "o" },
    { noun: "páncreas", wrongAdj: "a", rightAdj: "o" },
    { noun: "riñón", wrongAdj: "a", rightAdj: "o" },

    { noun: "vesícula", wrongAdj: "o", rightAdj: "a" },
    { noun: "próstata", wrongAdj: "o", rightAdj: "a" },
    { noun: "vejiga", wrongAdj: "o", rightAdj: "a" },
    { noun: "mama", wrongAdj: "o", rightAdj: "a" },
    { noun: "aorta", wrongAdj: "o", rightAdj: "a" },
];

export interface MedicalConsistencyIssue {
    id: string;
    type: 'laterality' | 'gender';
    text: string;
    message: string;
    suggestion?: string;
    index: number;
}

export function validateMedicalLogic(text: string): MedicalConsistencyIssue[] {
    const issues: MedicalConsistencyIssue[] = [];
    const lowerText = text.toLowerCase();
    const sentences = text.split(/(?<=[.!?])\s+|\n/);

    let currentContextSide: 'right' | 'left' | null = null;

    // 1. Check for IMPOSSIBLE LATERALITY (e.g., "Bazo derecho")
    // We scan for Noun + (words) + Side
    const sidePatterns = [
        { regex: /\bderech[oa]s?\b/, side: 'right' },
        { regex: /\bizquierd[oa]s?\b/, side: 'left' }
    ];

    Object.values(MEDICAL_NOUNS).forEach(organ => {
        if (organ.isPaired) return;
        if (!organ.defaultSide || organ.defaultSide === 'midline') return; // Midline organs can technically have sided pathology

        if (lowerText.includes(organ.term)) {
            // Find the organ index
            const organIndices = [...lowerText.matchAll(new RegExp(`\\b${organ.term}\\b`, 'gi'))].map(m => m.index!);

            organIndices.forEach(idx => {
                // Look ahead 5 words
                const window = lowerText.slice(idx, idx + 50);

                // If organ is naturally RIGHT (Liver), check for LEFT mention
                if (organ.defaultSide === 'right') {
                    if (/\bizquierd[oa]\b/.test(window)) {
                        issues.push({
                            id: `lat-${idx}`,
                            type: 'laterality',
                            text: `${organ.term} ... izquierdo`,
                            message: `El ${organ.term} anatómicamente está a la derecha.`,
                            index: idx
                        });
                    }
                }
                // If organ is naturally LEFT (Spleen), check for RIGHT mention
                if (organ.defaultSide === 'left') {
                    if (/\bderech[oa]\b/.test(window)) {
                        issues.push({
                            id: `lat-${idx}`,
                            type: 'laterality',
                            text: `${organ.term} ... derecho`,
                            message: `El ${organ.term} anatómicamente está a la izquierda.`,
                            index: idx
                        });
                    }
                }
            });
        }
    });

    // 2. Check for GENDER AGREEMENT
    // noun (M) + ... + adjective (F) ending in 'a'
    // Very naive implementation using specific common pairings to avoid false positives
    GENDER_MISMATCHES.forEach(rule => {
        // Regex: Noun + (up to 3 words) + word ending in invalid suffix
        // e.g. "Útero" + "es" + "pequeña"

        const suffix = rule.wrongAdj;
        // Looking for adjectives like: aumentado/a, distendido/a, ecogénico/a, heterogéneo/a
        // We only check for specific common radiological adjectives to be safe
        const adjectives = [
            'aumentad', 'distendid', 'ecogénic', 'heterogéne', 'homogéne',
            'dens', 'intens', 'lobulad', 'calcificad', 'vascularizad'
        ];

        const adjPattern = adjectives.join('|');
        const pattern = new RegExp(`\\b${rule.noun}\\b\\s+(?:\\w+\\s+){0,2}(${adjPattern})(${rule.wrongAdj})\\b`, 'gi');

        let match;
        while ((match = pattern.exec(lowerText)) !== null) {
            issues.push({
                id: `gen-${match.index}`,
                type: 'gender',
                text: match[0],
                message: `Posible discordancia de género: "${rule.noun}" parece masculino/femenino incorrecto.`,
                suggestion: match[0].replace(match[2], rule.rightAdj), // Replace 'a' with 'o' or vice versa
                index: match.index
            });
        }
    });

    // 4. Contextual Laterality Check (Smart Context)
    // Scan sentences and track moving side context
    let globalPos = 0;
    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();

        // Update context if a side is mentioned clearly
        if (/\bderech[oa]\b/.test(lowerSentence)) currentContextSide = 'right';
        else if (/\bizquierd[oa]\b/.test(lowerSentence)) currentContextSide = 'left';

        // Check paired organs in this sentence
        Object.values(MEDICAL_NOUNS).forEach(organ => {
            if (!organ.isPaired) return;

            const organMatch = new RegExp(`\\b${organ.term}\\b`, 'gi').exec(lowerSentence);
            if (organMatch) {
                const hasSide = /\bderech[oa]\b|\bizquierd[oa]\b|\bbilateral\b/.test(lowerSentence);

                if (!hasSide && currentContextSide) {
                    issues.push({
                        id: `ctxlat-${globalPos + organMatch.index}`,
                        type: 'laterality',
                        text: organ.term,
                        message: `¿Te refieres al ${organ.term} ${currentContextSide === 'right' ? 'derecho' : 'izquierdo'}?`,
                        suggestion: `${organ.term} ${currentContextSide === 'right' ? 'derecho' : 'izquierdo'}`,
                        index: globalPos + organMatch.index
                    });
                }
            }
        });

        globalPos += sentence.length + 1; // +1 for the separator
    });

    // 3. Check for CLINICAL CONTRADICTIONS (Sprint 3)
    // Case A: Existence (Negation -> Positive)
    // "No se observa el bazo" ... later "Bazo de tamaño normal"
    Object.values(MEDICAL_NOUNS).forEach(organ => {
        const negationPattern = new RegExp(`(?:no\\s+se\\s+(?:observa|visualiza|identifica|aprecia))\\s+(?:el|la)?\\s*\\b${organ.term}\\b`, 'gi');
        const existencePattern = new RegExp(`\\b${organ.term}\\b`, 'gi');

        if (negationPattern.test(lowerText)) {
            // Find where it was negated
            negationPattern.lastIndex = 0;
            const negationMatch = negationPattern.exec(lowerText);
            if (!negationMatch) return;

            const negationIdx = negationMatch.index;

            // Look for subsequent positive mentions that list a state/size
            // e.g. "bazo de tamaño normal", "bazo aumentado", "bazo con lesión"
            const stateKeywords = ['tamaño', 'forma', 'ecogenicidad', 'lesión', 'masa', 'nódulo', 'normal', 'aumentad', 'disminuid'];
            const statePattern = new RegExp(`\\b${organ.term}\\b\\s+(?:\\w+\\s+){0,3}(?:${stateKeywords.join('|')})`, 'gi');

            statePattern.lastIndex = negationIdx + negationMatch[0].length;
            const stateMatch = statePattern.exec(lowerText);

            if (stateMatch) {
                issues.push({
                    id: `cont-${stateMatch.index}`,
                    type: 'laterality', // Reusing laterality for now as it triggers relevant UI alerts
                    text: stateMatch[0],
                    message: `Contradicción: Previamente indicaste que no se observa el ${organ.term}.`,
                    index: stateMatch.index
                });
            }
        }
    });

    return issues;
}

// Helper to format measures properly
export function normalizeMeasurements(text: string): string {
    // "3 por 4 centímetros" -> "3 x 4 cm"
    return text
        .replace(/(\d+)\s+por\s+(\d+)/gi, '$1 x $2')
        .replace(/\bcentímetros\b/gi, 'cm')
        .replace(/\bmilímetros\b/gi, 'mm')
        .replace(/\bunidades\s+hounsfield\b/gi, 'UH')
        .replace(/\bcentímetros\s+cúbicos\b/gi, 'cc');
}
