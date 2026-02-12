"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

    // Rebuild Grammar List when replacements change
    useEffect(() => {
        if (!recognitionRef.current) return;

        const windowWithSpeech = window as unknown as WindowsWithSpeech;
        const GrammarList = windowWithSpeech.SpeechGrammarList || windowWithSpeech.webkitSpeechGrammarList;

        if (GrammarList) {
            try {
                const dictionaryTerms = Object.keys(userReplacements);
                const allHints = [...RADIOLOGY_HINTS, ...dictionaryTerms];

                const grammarList = new GrammarList();
                const grammar = `#JSGF V1.0; grammar radiology; public <term> = ${allHints.join(' | ')};`;
                grammarList.addFromString(grammar, 1);

                if (boostedTerms.length > 0) {
                    const boostedGrammar = `#JSGF V1.0; grammar boosted; public <term> = ${boostedTerms.join(' | ')};`;
                    grammarList.addFromString(boostedGrammar, 2);
                }

                recognitionRef.current.grammars = grammarList;
            } catch {
                console.warn('Failed to update grammar');
            }
        }
    }, [userReplacements, boostedTerms]);

    useEffect(() => {
        const windowWithSpeech = window as unknown as WindowsWithSpeech;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        const GrammarList = windowWithSpeech.SpeechGrammarList || windowWithSpeech.webkitSpeechGrammarList;

        if (!SpeechRecognition) {
            setError('Web Speech API no está soportado en este navegador.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        recognition.maxAlternatives = 3;

        if (GrammarList) {
            try {
                const dictionaryTerms = Object.keys(userReplacements);
                const allHints = [...RADIOLOGY_HINTS, ...dictionaryTerms];
                const grammarList = new GrammarList();
                const grammar = `#JSGF V1.0; grammar radiology; public <term> = ${allHints.join(' | ')};`;
                grammarList.addFromString(grammar, 1);
                recognition.grammars = grammarList;
            } catch {
                console.warn('Grammar setup failed');
            }
        }

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            if (shouldBeListeningRef.current && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e: any) {
                    // If it's already started (InvalidStateError), that's fine, we wanted it started.
                    // Only stop if it's a real error we can't recover from.
                    console.log("Auto-restart caught error (likely safe):", e);
                }
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                console.log('Silence detected');
            } else if (['audio-capture', 'not-allowed', 'network'].includes(event.error)) {
                setError(`Error de voz: ${event.error}`);
                shouldBeListeningRef.current = false;
            }

            if (!shouldBeListeningRef.current) setIsListening(false);
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
                                foundMatch = true;
                                break;
                            }
                        }
                    }

                    if (!foundMatch) {
                        for (let j = 1; j < Math.min(result.length, 3); j++) {
                            if (result[j].confidence > bestConfidence) {
                                bestTranscript = result[j].transcript;
                                bestConfidence = result[j].confidence;
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

        recognitionRef.current = recognition;

        return () => {
            if (recognition) {
                // Remove listeners to prevent zombie callbacks
                recognition.onresult = null;
                recognition.onend = null;
                recognition.onerror = null;
                recognition.onstart = null;
                recognition.abort();
            }
        };
    }, [userReplacements]);

    const startListening = useCallback(async () => {
        if (recognitionRef.current && !isListening) {
            try {
                // Abort any existing session and wait for cleanup
                recognitionRef.current.abort();

                // Small delay to allow the browser's speech service to fully reset
                await new Promise(resolve => setTimeout(resolve, 150));

                shouldBeListeningRef.current = true;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Start listening error:", e);
                shouldBeListeningRef.current = false;
                setError('Error al iniciar: Intenta esperar un segundo');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            shouldBeListeningRef.current = false;
            // .stop() attempts to return a final result, which might trigger 'onend' loops if not careful.
            // .abort() is more definitive for a hard stop.
            recognitionRef.current.abort();
            setIsListening(false);
        }
    }, []);

    return { isListening, interimResult, lastEvent, error, startListening, stopListening };
};
