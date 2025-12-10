"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface WindowsWithSpeech extends Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

export interface TranscriptionEvent {
    text: string;
    isFinal: boolean;
    timestamp: number;
}

export const useTranscription = () => {
    const [isListening, setIsListening] = useState(false);
    const [interimResult, setInterimResult] = useState('');
    const [lastEvent, setLastEvent] = useState<TranscriptionEvent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const windowWithSpeech = window as unknown as WindowsWithSpeech;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Web Speech API no está soportado en este navegador.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            // Auto-restart if it stops unexpectedly while listening state is true?
            // For now, we trust the state sync, or we flip isListening to false.
            // Web Speech API stops automatically on silence sometimes.
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            setError(`Error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            let final = '';
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (final) {
                setLastEvent({
                    text: final,
                    isFinal: true,
                    timestamp: Date.now()
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
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [isListening]);

    return {
        isListening,
        interimResult,
        lastEvent,
        error,
        startListening,
        stopListening
    };
};
