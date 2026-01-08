"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { CONTEXT_DEFINITIONS } from '@/lib/contextKeywords';

interface ProposedContext {
    id: string;
    description: string;
    confidence: number;
    terms: string[];
}

export const useAutomaticContext = (transcript: string) => {
    const [activeContexts, setActiveContexts] = useState<ProposedContext[]>([]);
    const lastAnalyzedIndex = useRef(0);
    const DEBOUNCE_MS = 1000; // Analyze every 1 second of silence or typing

    const analyzeContext = useCallback((text: string) => {
        const normalizedText = text.toLowerCase();

        const newContexts: ProposedContext[] = [];

        // Analyze matches for each context
        Object.values(CONTEXT_DEFINITIONS).forEach(ctx => {
            let score = 0;
            ctx.keywords.forEach(keyword => {
                // Count occurrences
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = normalizedText.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });

            // Threshold: simple scoring. 
            // If score >= 1, we consider it active.
            if (score >= 1) {
                newContexts.push({
                    id: ctx.id,
                    description: ctx.name,
                    confidence: Math.min(1, score / 3),
                    terms: ctx.boostTerms
                });
            }
        });

        // Update state if different
        // We sort by ID to ensure stability comparison
        newContexts.sort((a, b) => a.id.localeCompare(b.id));

        setActiveContexts(prev => {
            const prevIds = prev.map(c => c.id).join(',');
            const newIds = newContexts.map(c => c.id).join(',');

            if (prevIds !== newIds) {
                console.log(`[AutoContext] Active Contexts: ${newIds || 'None'}`);
                return newContexts;
            }
            return prev;
        });

    }, []);

    // Effect to trigger analysis
    useEffect(() => {
        const timer = setTimeout(() => {
            if (transcript && transcript.length > lastAnalyzedIndex.current) {
                // Analyze the last 200 characters or the whole text if short
                const sliceToAnalyze = transcript.slice(-500);
                analyzeContext(sliceToAnalyze);
                lastAnalyzedIndex.current = transcript.length;
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [transcript, analyzeContext]);

    // Force manual reset
    const resetContext = () => setActiveContexts([]);

    return {
        activeContexts,
        resetContext
    };
};
