"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface TemplateField {
    id: string;
    template_id: string;
    field_name: string;
    default_text: string;
    section: string;
    display_order: number;
    is_required: boolean;
    variants?: string[];
}

export interface Template {
    id: string;
    name: string;
    content: string;
    category?: string;
    template_type?: 'simple' | 'structured';
    display_order?: number;
    fields?: TemplateField[];
}

export const useTemplates = () => {
    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: templatesData, error: templatesError } = await supabase
                .from('templates')
                .select('*')
                .order('category', { ascending: true })
                .order('display_order', { ascending: true })
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (templatesError) {
                console.error("Error fetching templates:", templatesError);
                return;
            }

            if (templatesData) {
                // For structured templates, fetch their fields
                const templatesWithFields = await Promise.all(
                    templatesData.map(async (template) => {
                        if (template.template_type === 'structured') {
                            const { data: fieldsData } = await supabase
                                .from('template_fields')
                                .select('*')
                                .eq('template_id', template.id)
                                .order('display_order', { ascending: true });

                            return {
                                ...template,
                                fields: fieldsData || []
                            } as Template;
                        }
                        return template as Template;
                    })
                );

                setTemplates(templatesWithFields);
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

    const updateTemplateOrder = async (id: string, newOrder: number) => {
        // Optimistic update
        setTemplates((prev) => prev.map(t =>
            t.id === id ? { ...t, display_order: newOrder } : t
        ));

        const { error } = await supabase
            .from('templates')
            .update({ display_order: newOrder })
            .eq('id', id);

        if (error) {
            console.error("Error updating template order:", error);
        }
    };

    return {
        templates,
        addTemplate,
        removeTemplate,
        updateTemplate,
        updateTemplateOrder
    };
};
