"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Template {
    id: string;
    name: string;
    content: string;
    category?: string;
}

export const useTemplates = () => {
    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                console.error("Error fetching templates:", error);
                return;
            }

            if (data) {
                setTemplates(data as Template[]);
            }
        };

        fetchTemplates();
    }, []);

    const addTemplate = async (name: string, content: string, category: string = 'Técnica') => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('templates')
            .insert({
                user_id: session.user.id,
                name,
                content,
                category
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding template:", error);
            return;
        }

        if (data) {
            setTemplates((prev) => [...prev, data as Template]);
        }
    };

    const removeTemplate = async (id: string) => {
        // Optimistic
        setTemplates((prev) => prev.filter(t => t.id !== id));

        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting template:", error);
        }
    };

    const updateTemplate = async (id: string, name: string, content: string, category: string = 'Técnica') => {
        // Optimistic update
        setTemplates((prev) => prev.map(t =>
            t.id === id ? { ...t, name, content, category } : t
        ));

        const { error } = await supabase
            .from('templates')
            .update({ name, content, category })
            .eq('id', id);

        if (error) {
            console.error("Error updating template:", error);
            // Revert on error - refetch
            const { data } = await supabase.from('templates').select('*');
            if (data) setTemplates(data as Template[]);
        }
    };

    return {
        templates,
        addTemplate,
        removeTemplate,
        updateTemplate
    };
};
