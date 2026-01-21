"use client";

import { useState, useRef } from 'react';

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
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass();
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

            // Calculate peak volume instead of average
            // This ignores silence between words and focuses on the actual voice energy
            let peak = 0;
            for (let i = 0; i < bufferLength; i++) {
                if (dataArray[i] > peak) peak = dataArray[i];
            }

            // Convert to 0-100 scale (160 is a safe mid-range peak for most mics)
            const rawLevel = Math.min(100, (peak / 160) * 100);

            // Smoothing to avoid flickering
            setAudioLevel(prev => (prev * 0.7) + (rawLevel * 0.3));

            // Check if audio is too low (Reduced thresholds)
            setIsLow(rawLevel > 1 && rawLevel < 8);
            setIsMuted(rawLevel <= 1);

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
