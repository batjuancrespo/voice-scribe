"use client";

import { useState, useEffect, useRef } from 'react';

interface AudioLevelHook {
    audioLevel: number; // 0-100
    isLow: boolean; // true if audio is too low
    isMuted: boolean; // true if no audio detected
    initialize: () => Promise<void>;
    cleanup: () => void;
}

export const useAudioLevel = (): AudioLevelHook => {
    const [audioLevel, setAudioLevel] = useState(0);
    const [isLow, setIsLow] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const initialize = async () => {
        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create audio context
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 1024;

            microphone.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            microphoneRef.current = microphone;

            // Start monitoring
            monitorAudioLevel();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkLevel = () => {
            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            // Convert to 0-100 scale
            const level = Math.min(100, (average / 128) * 100);
            setAudioLevel(level);

            // Check if audio is too low
            setIsLow(level > 0 && level < 15);
            setIsMuted(level < 2);

            animationFrameRef.current = requestAnimationFrame(checkLevel);
        };

        checkLevel();
    };

    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (microphoneRef.current) {
            microphoneRef.current.disconnect();
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        setAudioLevel(0);
        setIsLow(false);
        setIsMuted(false);
    };

    return {
        audioLevel,
        isLow,
        isMuted,
        initialize,
        cleanup
    };
};
