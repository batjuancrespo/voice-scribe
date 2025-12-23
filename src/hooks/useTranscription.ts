"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { RADIOLOGY_HINTS } from '@/lib/radiologyDictionary';

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

export const useTranscription = () => {
    const [isListening, setIsListening] = useState(false);
    const [interimResult, setInterimResult] = useState('');
    const [lastEvent, setLastEvent] = useState<TranscriptionEvent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const shouldBeListeningRef = useRef(false);

    useEffect(() => {
        const windowWithSpeech = window as unknown as WindowsWithSpeech;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        const SpeechGrammarList = windowWithSpeech.SpeechGrammarList || windowWithSpeech.webkitSpeechGrammarList;

        if (!SpeechRecognition) {
            setError('Web Speech API no está soportado en este navegador. Usa Google Chrome para mejor rendimiento.');
            return;
        }

        const recognition = new SpeechRecognition();

        // OPTIMIZED CONFIGURATION FOR MEDICAL DICTATION
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES'; // Spanish (Spain) - best for medical terminology
        recognition.maxAlternatives = 3; // Get multiple alternatives to choose best one

        // Add medical vocabulary hints (if supported)
        if (SpeechGrammarList) {
            try {
                const grammarList = new SpeechGrammarList();
                const grammar = `#JSGF V1.0; grammar radiology; public <term> = ${RADIOLOGY_HINTS.join(' | ')};`;
                grammarList.addFromString(grammar, 1);
                recognition.grammars = grammarList;
            } catch (e) {
                console.warn('Speech grammar not supported, continuing without hints');
            }
        }

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            // KEEP-ALIVE LOGIC: If the user intended to be listening but the browser stopped, restart.
            if (shouldBeListeningRef.current && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error('Failed to restart recognition:', e);
                    setIsListening(false);
                }
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // If it's just silence, we don't treat it as a hard error that stops the ref
                // The onend event will trigger and restart if shouldBeListeningRef is true
                console.log('Silence detected, keep-alive will restart.');
            } else if (event.error === 'audio-capture') {
                setError('No se pudo acceder al micrófono. Verifica los permisos.');
                shouldBeListeningRef.current = false;
            } else if (event.error === 'not-allowed') {
                setError('Permisos de micrófono denegados. Ve a configuración del navegador.');
                shouldBeListeningRef.current = false;
            } else if (event.error === 'network') {
                setError('Error de red. Verifica tu conexión.');
                shouldBeListeningRef.current = false;
            } else if (event.error === 'aborted') {
                // Usually triggered by recognition.stop()
            } else {
                setError(`Error: ${event.error}`);
                shouldBeListeningRef.current = false;
            }

            if (!shouldBeListeningRef.current) {
                setIsListening(false);
            }
        };

        recognition.onresult = (event: any) => {
            let final = '';
            let interim = '';
            let maxConfidence = 0;

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const result = event.results[i];

                if (result.isFinal) {
                    // Get best alternative (highest confidence)
                    let bestTranscript = result[0].transcript;
                    let bestConfidence = result[0].confidence || 0;

                    // Check alternatives if available
                    for (let j = 1; j < Math.min(result.length, 3); j++) {
                        if (result[j].confidence > bestConfidence) {
                            bestTranscript = result[j].transcript;
                            bestConfidence = result[j].confidence;
                        }
                    }

                    final += bestTranscript;
                    maxConfidence = Math.max(maxConfidence, bestConfidence);
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                setLastEvent({
                    text: final,
                    isFinal: true,
                    timestamp: Date.now(),
                    confidence: maxConfidence
                });
                setInterimResult('');
            } else {
                setInterimResult(interim);
            }
        };

        recognitionRef.current = recognition;
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                shouldBeListeningRef.current = true;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
                shouldBeListeningRef.current = false;
                setError('Error al iniciar el reconocimiento de voz');
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            shouldBeListeningRef.current = false;
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    return {
        isListening,
        interimResult,
        lastEvent,
        error,
        startListening,
        stopListening
    };
};
