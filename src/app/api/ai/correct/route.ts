import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let { text, apiKey, userDictionary, model = 'gemini-1.5-flash', mode = 'standard' } = body;

        // Fallback to server-side API Key if not provided by client
        if (!apiKey) {
            apiKey = process.env.GEMINI_API_KEY;
        }

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required (Configurar en ajustes o servidor)' }, { status: 401 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const aiModel = genAI.getGenerativeModel({ model: model });

        // Construct the system prompt
        let prompt = "";

        if (mode === 'sentinel') {
            prompt = `
ROLE: Highly Precise Medical Grammar Sentinel.

TASK: Refine the grammar of this short portion of a medical report.
STRICT RULES:
1. ONLY fix obvious grammar, gender/number agreement, or spelling errors.
2. DO NOT change ANY medical terms or clinical meaning.
3. DO NOT add or remove information.
4. If the text is already correct, return it EXACTLY as is.
5. Standardize "3 por 4 cm" to "3x4 cm" and similar measurement formats.

INPUT: "${text}"
OUTPUT: `;
        } else {
            // Standard full correction prompt
            let vocabularyContext = "";
            if (userDictionary && Object.keys(userDictionary).length > 0) {
                const dictionaryString = Object.entries(userDictionary)
                    .map(([error, correction]) => `"${error}" -> "${correction}"`)
                    .join("\n");

                vocabularyContext = `
IMPORTANT - USER SPECIFIC CORRECTIONS:
The user frequently encounters specific transcription errors. 
Here is the list of known errors and their correct terms:
${dictionaryString}

INSTRUCTION FOR VOCABULARY:
1. If you see a term exactly matching a "known error", replace it with the "correct term".
2. **PHONETIC MATCHING**: If you see a term that SOUNDS PHONETICALLY SIMILAR to a "known error" (e.g. "ameromatosis" vs "ateromatosis") or looks like a typo of it, apply the correction.
3. Use the medical context to confirm if the correction makes sense.
`;
            }

            prompt = `
ROLE: Expert Radiologist & Medical Editor.

TASK: 
Refine the following medical transcription text. 
Fix grammar, spelling, punctuation, and standardized formats without changing the clinical meaning.

BASE RADIOLOGY GLOSSARY:
- BIRADS (I, II, III, IVa, IVb, IVc, V, VI)
- ateromatosis, ateromatosa, placas de ateroma
- hipoecogénico, isoecogénico, hiperecogénico, anecoico
- esteatosis, parénquima, hepato-esplenomegalia
- osteofitos, discopatía, espondilolistesis
- adenopatía, linfadenopatía, axilar, inguinal
- nódulo, quiste, lesión ocupante de espacio (LOE)
- ecogenicidad, ecosonografía, doppler

FORMATTING RULES:
1. Standardize measurements: "3 por 4 centímetros" -> "3x4 cm", "15 mm" (space between number and unit).
2. Numbers: Use digits for measurements ("3 cm") but words for general counting if appropriate ("tres lesiones").
3. **STAGING (TNM)**: Convert phonetic dictation of stages to standard shorthand (e.g., "te uno a" -> "T1a", "ene cero" -> "N0").
4. **ABBREVIATIONS**: Use medical standard abbreviations (e.g., "TC", "RM", "mm", "cm", "T1", "T2").

${vocabularyContext}

CRITICAL INSTRUCTIONS:
- Always prioritize terms from the USER DICTIONARY or BASE RADIOLOGY GLOSSARY.
- If the dictated text sounds like a medical term or acronym (e.g., "ene dos" or "t uno"), format it correctly as "N2" or "T1".
- STRICTLY PRESERVE all line breaks (\n).
- Return ONLY the corrected text. DO NOT add explanations, markdown quotes, or any other commentary.

INPUT TEXT TO CORRECT:
"${text}"

CORRECTED OUTPUT:
`;
        }

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        const correctedText = response.text();

        return NextResponse.json({ correctedText });

    } catch (error: any) {
        console.error('AI Correction Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to correct text' },
            { status: 500 }
        );
    }
}
