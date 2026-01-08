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
    const [activeContext, setActiveContext] = useState<ProposedContext | null>(null);
    const lastAnalyzedIndex = useRef(0);
    const DEBOUNCE_MS = 1000; // Analyze every 1 second of silence or typing

    const analyzeContext = useCallback((text: string) => {
        const normalizedText = text.toLowerCase();
        const scores: Record<string, number> = {};

        // Analyze matches for each context
        Object.values(CONTEXT_DEFINITIONS).forEach(ctx => {
            let score = 0;
            ctx.keywords.forEach(keyword => {
                // Simple regex to count occurrences
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = normalizedText.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });
            scores[ctx.id] = score;
        });

        // Find winner
        let maxScore = 0;
        let winnerId = null;

        Object.entries(scores).forEach(([id, score]) => {
            if (score > maxScore) {
                maxScore = score;
                winnerId = id;
            }
        });

        // Threshold logic (needs at least 2 keyword matches to switch context?)
        // Or maybe just 1 strong one. Let's say 2 to be safe or 1 very specific.
        if (winnerId && maxScore >= 1) {
            const def = CONTEXT_DEFINITIONS[winnerId];

            // Only update if it's different or confidence increased
            if (activeContext?.id !== winnerId) {
                console.log(`[AutoContext] Switching to: ${def.name} (Score: ${maxScore})`);
                setActiveContext({
                    id: def.id,
                    description: def.name,
                    confidence: Math.min(1, maxScore / 5), // Normalize 0-1 roughly
                    terms: def.boostTerms
                });
            }
        }
    }, [activeContext]);

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
    const resetContext = () => setActiveContext(null);

    return {
        activeContext,
        resetContext
    };
};
