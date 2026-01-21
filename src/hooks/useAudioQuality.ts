"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

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
        noiseFloor: -60,
        signalLevel: -60,
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

    const calculateRMS = useCallback((data: Uint8Array) => {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    }, []);

    const analyze = useCallback(() => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate approximate dB
        const rms = calculateRMS(dataArray);
        const db = 20 * Math.log10(rms / 255 || 0.0001);

        if (db > -50) {
            if (db > -20) {
                signalHistory.current.push(db);
                if (signalHistory.current.length > HISTORY_SIZE) signalHistory.current.shift();
            } else {
                noiseHistory.current.push(db);
                if (noiseHistory.current.length > HISTORY_SIZE) noiseHistory.current.shift();
            }
        }

        const avgSignal = signalHistory.current.length > 0
            ? signalHistory.current.reduce((a, b) => a + b, 0) / signalHistory.current.length
            : -20;

        const avgNoise = noiseHistory.current.length > 0
            ? noiseHistory.current.reduce((a, b) => a + b, 0) / noiseHistory.current.length
            : -60;

        const currentSNR = avgSignal - avgNoise;

        let quality: AudioQualityState['quality'] = 'good';
        let recommendation: string | null = null;

        const UP_THRESHOLD_EXCELLENT = 32;
        const UP_THRESHOLD_GOOD = 17;
        const UP_THRESHOLD_FAIR = 7;

        if (currentSNR > UP_THRESHOLD_EXCELLENT) quality = 'excellent';
        else if (currentSNR > UP_THRESHOLD_GOOD) quality = 'good';
        else if (currentSNR > UP_THRESHOLD_FAIR) quality = 'fair';
        else quality = 'poor';

        // Custom hysteresis or logic can be added here if needed

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
    }, [calculateRMS]); // Removed stats.quality dependency to avoid infinite loop or flickering

    const cleanupAudio = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        microphoneRef.current?.disconnect();
        audioContextRef.current?.close();
        audioContextRef.current = null;
    }, []);

    const initializeAudio = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.smoothingTimeConstant = 0.3;
            analyser.fftSize = 256;

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
    }, [analyze]);

    useEffect(() => {
        if (isListening) {
            initializeAudio();
        } else {
            cleanupAudio();
        }
        return () => cleanupAudio();
    }, [isListening, initializeAudio, cleanupAudio]);

    return stats;
};
