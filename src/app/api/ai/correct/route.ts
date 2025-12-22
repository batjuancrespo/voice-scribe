import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        let { text, apiKey, userDictionary, model = 'gemini-1.5-flash' } = body;

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

        // Construct the system prompt with user vocabulary context
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

        const prompt = `
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
3. **LINE BREAKS**: STRICTLY PRESERVE all existing line breaks (\n). Do NOT merge paragraphs. Only add new breaks if explicitly dictated ("punto y aparte").
4. Capitalization: Sentence case. Capitalize proper nouns and start of sentences.

${vocabularyContext}

CRITICAL VOCABULARY INSTRUCTION:
- Give HIGHEST PRIORITY to terms in the "USER SPECIFIC CORRECTIONS" or "BASE RADIOLOGY GLOSSARY".
- If a word in the input sounds like it could be one of these terms (even if the browser typed something else), assume it is the technical term.

INPUT TEXT:
"${text}"

OUTPUT:
Return ONLY the corrected text. Do not add explanations or markdown quotes.
`;

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
