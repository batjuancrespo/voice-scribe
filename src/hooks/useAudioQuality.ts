"use client";

import { useState, useEffect, useRef } from 'react';

export interface AudioQualityState {
    snr: number; // Signal-to-Noise Ratio in dB
    noiseFloor: number; // Estimated noise floor in dB
    signalLevel: number; // Current signal level in dB
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendation: string | null;
}

const HISTORY_SIZE = 50; // Keep track of last 50 samples for smoothing

export const useAudioQuality = (isListening: boolean) => {
    const [stats, setStats] = useState<AudioQualityState>({
        snr: 0,
        noiseFloor: -Infinity,
        signalLevel: -Infinity,
        quality: 'good',
        recommendation: null
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // History buffers for dynamic calculation
    const signalHistory = useRef<number[]>([]);
    const noiseHistory = useRef<number[]>([]);

    useEffect(() => {
        if (isListening) {
            initializeAudio();
        } else {
            cleanupAudio();
        }
        return () => cleanupAudio();
    }, [isListening]);

    const initializeAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.smoothingTimeConstant = 0.3; // Fast response
            analyser.fftSize = 256;

            // Apply a high-pass filter to remove rumble (< 85Hz)
            const filter = audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 85;

            microphone.connect(filter);
            filter.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            microphoneRef.current = microphone;

            analyze();
        } catch (error) {
            console.error('Error initializing audio quality monitor:', error);
        }
    };

    const cleanupAudio = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        microphoneRef.current?.disconnect();
        audioContextRef.current?.close();
        audioContextRef.current = null;
    };

    const calculateRMS = (data: Uint8Array) => {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    };

    const analyze = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate approximate dB
        // Note: 0-255 scale is arbitrary, mapping roughly to dB
        const rms = calculateRMS(dataArray);
        const db = 20 * Math.log10(rms / 255); // Relative dB, will be negative

        // Dynamic Signal/Noise separation
        // If signal is very low, assume it's noise
        // If variation is high, assume speech

        if (db > -50) { // Rough threshold for "sound present"
            if (db > -20) {
                // Likely speech
                signalHistory.current.push(db);
                if (signalHistory.current.length > HISTORY_SIZE) signalHistory.current.shift();
            } else {
                // Likely noise
                noiseHistory.current.push(db);
                if (noiseHistory.current.length > HISTORY_SIZE) noiseHistory.current.shift();
            }
        }

        const avgSignal = signalHistory.current.length > 0
            ? signalHistory.current.reduce((a, b) => a + b, 0) / signalHistory.current.length
            : -20; // Default estimate

        const avgNoise = noiseHistory.current.length > 0
            ? noiseHistory.current.reduce((a, b) => a + b, 0) / noiseHistory.current.length
            : -60; // Default quiet room

        const currentSNR = avgSignal - avgNoise;

        // Determine quality with Hysteresis to avoid flickering
        let quality: AudioQualityState['quality'] = stats.quality;
        let recommendation: string | null = null;

        const UP_THRESHOLD_EXCELLENT = 32;
        const DOWN_THRESHOLD_EXCELLENT = 28;
        const UP_THRESHOLD_GOOD = 17;
        const DOWN_THRESHOLD_GOOD = 13;
        const UP_THRESHOLD_FAIR = 7;
        const DOWN_THRESHOLD_FAIR = 3;

        if (currentSNR > UP_THRESHOLD_EXCELLENT) quality = 'excellent';
        else if (currentSNR < DOWN_THRESHOLD_EXCELLENT && currentSNR > UP_THRESHOLD_GOOD) quality = 'good';
        else if (currentSNR < DOWN_THRESHOLD_GOOD && currentSNR > UP_THRESHOLD_FAIR) quality = 'fair';
        else if (currentSNR < DOWN_THRESHOLD_FAIR) quality = 'poor';

        if (quality === 'fair') recommendation = 'Acércate al micrófono';
        else if (quality === 'poor') recommendation = 'Demasiado ruido de fondo';

        setStats({
            snr: Math.round(currentSNR),
            noiseFloor: Math.round(avgNoise),
            signalLevel: Math.round(avgSignal),
            quality,
            recommendation
        });

        animationFrameRef.current = requestAnimationFrame(analyze);
    };

    return stats;
};
