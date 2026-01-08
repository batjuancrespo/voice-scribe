"use client";

import { useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface WeeklyProgress {
    date: string;
    corrections: number;
    autoCorrections: number;
}

export interface GlobalStats {
    totalCorrections: number;
    autoLearnedCount: number;
    mostFrequentError: string | null;
    termsLearned: number;
}

export function useLearningStats() {
    /**
     * Get weekly progress (last 7 days)
     */
    const getWeeklyProgress = useCallback(async (): Promise<WeeklyProgress[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('correction_history')
            .select('created_at, auto_applied')
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo.toISOString());

        if (error || !data) return [];

        // Initialize last 7 days map
        const statsMap = new Map<string, { corrections: number; auto: number }>();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            statsMap.set(dateStr, { corrections: 0, auto: 0 });
        }

        // Aggregate data
        data.forEach(item => {
            const dateStr = item.created_at.split('T')[0];
            if (statsMap.has(dateStr)) {
                const stat = statsMap.get(dateStr)!;
                stat.corrections++;
                if (item.auto_applied) {
                    stat.auto++;
                }
            }
        });

        // Convert to array and reverse (chronological order)
        return Array.from(statsMap.entries())
            .map(([date, stats]) => ({
                date,
                corrections: stats.corrections,
                autoCorrections: stats.auto
            }))
            .reverse();
    }, []);

    /**
     * Get global statistics
     */
    const getGlobalStats = useCallback(async (): Promise<GlobalStats> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {
            totalCorrections: 0,
            autoLearnedCount: 0,
            mostFrequentError: null,
            termsLearned: 0
        };

        // Get total corrections
        const { count: totalCorrections } = await supabase
            .from('correction_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Get frequency stats
        const { data: learningData } = await supabase
            .from('learning_stats')
            .select('*')
            .eq('user_id', user.id)
            .order('frequency', { ascending: false });

        const termsLearned = learningData?.length || 0;
        const autoLearnedCount = learningData?.filter(d => d.auto_learned).length || 0;
        const mostFrequentError = learningData?.[0]?.error_pattern || null;

        return {
            totalCorrections: totalCorrections || 0,
            autoLearnedCount,
            mostFrequentError,
            termsLearned
        };
    }, []);

    /**
     * Get most used terms (top replacements)
     */
    const getMostUsedTerms = useCallback(async (limit: number = 10) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // In a real scenario we might want a separate 'term_usage' table
        // For now, we reuse learning_stats as a proxy for "terms we correct often"
        const { data, error } = await supabase
            .from('learning_stats')
            .select('correction, frequency')
            .eq('user_id', user.id)
            .order('frequency', { ascending: false })
            .limit(limit);

        if (error || !data) return [];

        return data.map(item => ({
            term: item.correction,
            count: item.frequency
        }));
    }, []);

    return {
        getWeeklyProgress,
        getGlobalStats,
        getMostUsedTerms
    };
}
