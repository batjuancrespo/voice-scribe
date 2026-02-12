"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { RADIOLOGY_HINTS } from '@/lib/radiologyDictionary';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface WindowsWithSpeech extends Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
}

export interface TranscriptionEvent {
    text: string;
    isFinal: boolean;
    timestamp: number;
    confidence?: number;
}

export const useTranscription = (userReplacements: Record<string, string> = {}, boostedTerms: string[] = []) => {
    const [isListening, setIsListening] = useState(false);
    const [interimResult, setInterimResult] = useState('');
    const [lastEvent, setLastEvent] = useState<TranscriptionEvent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const shouldBeListeningRef = useRef(false);

    // Explicit cleanup on unmount - ensures no zombie instances
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.onend = null;
                    recognitionRef.current.abort();
                } catch (e) {
                    console.warn("Cleanup error:", e);
                }
                recognitionRef.current = null;
            }
        };
    }, []);

    const startListening = useCallback(async () => {
        // 1. CLEANUP PREVIOUS SESSION
        if (recognitionRef.current) {
            try {
                recognitionRef.current.onend = null; // Prevent restart loop
                recognitionRef.current.abort();
            } catch (e) {
                console.warn("Pre-start abort error:", e);
            }
            recognitionRef.current = null;
            // Small buffer to let browser clear resources
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const windowWithSpeech = window as unknown as WindowsWithSpeech;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Web Speech API no está soportado en este navegador.');
            return;
        }

        try {
            // 2. CREATE FRESH INSTANCE
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-ES';
            recognition.maxAlternatives = 3;

            // 3. SETUP (Grammar list removed as it often causes 'network' errors in Chrome when complex/malformed)
            // The cloud speech service already has an excellent Spanish medical model.

            // 4. EVENT HANDLERS
            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                // If we should still be listening, restart (Continuous Mode)
                if (shouldBeListeningRef.current) {
                    try {
                        recognition.start();
                    } catch (e: any) {
                        console.log("Auto-restart log:", e);
                    }
                } else {
                    // Truly stopped
                    setIsListening(false);
                }
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    // Ignore
                } else if (['audio-capture', 'not-allowed', 'network'].includes(event.error)) {
                    console.warn("Speech Error:", event.error);
                    setError(`Error de voz: ${event.error}`);
                    // Critical errors should stop the loop
                    shouldBeListeningRef.current = false;
                }
            };

            recognition.onresult = (event: any) => {
                let final = '';
                let interim = '';
                let maxConfidence = 0;

                const medicalTermsSet = new Set([
                    ...RADIOLOGY_HINTS.map(t => t.toLowerCase()),
                    ...Object.keys(userReplacements).map(t => t.toLowerCase())
                ]);
                const protectedShortWords = new Set(['no', 'sí', 'si', 'con', 'sin', 'en', 'de', 'del', 'al', 'punto', 'coma', 'dos', 'guion', 'y', 'o', 'la', 'el']);

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        let bestTranscript = result[0].transcript;
                        let bestConfidence = result[0].confidence || 0;

                        // Basic post-processing
                        let foundMatch = false;
                        const primaryWords = bestTranscript.toLowerCase().trim().split(/\s+/);
                        if (primaryWords.length === 1 && protectedShortWords.has(primaryWords[0])) {
                            foundMatch = true;
                        } else if (primaryWords.some((w: string) => medicalTermsSet.has(w))) {
                            foundMatch = true;
                        }

                        if (!foundMatch) {
                            for (let j = 1; j < Math.min(result.length, 3); j++) {
                                const altWords = result[j].transcript.toLowerCase().split(/\s+/);
                                if (altWords.some((w: string) => medicalTermsSet.has(w)) && result[j].confidence > 0.5) {
                                    bestTranscript = result[j].transcript;
                                    bestConfidence = result[j].confidence;
                                    break;
                                }
                            }
                        }

                        final += bestTranscript;
                        maxConfidence = Math.max(maxConfidence, bestConfidence);
                    } else {
                        interim += result[0].transcript;
                    }
                }

                if (final) {
                    setLastEvent({ text: final, isFinal: true, timestamp: Date.now(), confidence: maxConfidence });
                    setInterimResult('');
                } else {
                    setInterimResult(interim);
                }
            };

            // 5. START
            shouldBeListeningRef.current = true;
            recognitionRef.current = recognition;
            recognition.start();

        } catch (e) {
            console.error("Start failed:", e);
            shouldBeListeningRef.current = false;
            setError('Error al iniciar servicio de voz');
        }
    }, [userReplacements, boostedTerms]);

    const stopListening = useCallback(() => {
        shouldBeListeningRef.current = false;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                console.warn("Stop error:", e);
            }
        }
    }, []);

    return { isListening, interimResult, lastEvent, error, startListening, stopListening };
};
