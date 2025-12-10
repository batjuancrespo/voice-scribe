"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Template {
    id: string;
    name: string;
    content: string;
}

export const useTemplates = () => {
    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('templates')
                .select('*');

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

    const addTemplate = async (name: string, content: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Optimistic update handled after DB return to get real ID, 
        // OR generate checking ID client side. Let's wait for DB for stronger consistency.

        const { data, error } = await supabase
            .from('templates')
            .insert({
                user_id: session.user.id,
                name,
                content
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

    return {
        templates,
        addTemplate,
        removeTemplate
    };
};
