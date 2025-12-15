"use client";

import React, { useState, useMemo } from 'react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { Plus, Trash, FileText, Copy, FolderOpen, Edit2, List } from 'lucide-react';
import { TemplateFieldEditor } from './TemplateFieldEditor';
import { supabase } from '@/lib/supabaseClient';

interface TemplateManagerProps {
    onInsert: (content: string) => void;
    onInsertStructured?: (template: Template) => void;
    onClose: () => void;
}

const DEFAULT_CATEGORIES = ['Técnica', 'TAC', 'RM', 'ECO', 'Otros'];

export function TemplateManager({ onInsert, onInsertStructured, onClose }: TemplateManagerProps) {
    const { templates, addTemplate, removeTemplate, updateTemplate } = useTemplates();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('Técnica');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'create-structured' | 'edit-structured'>('list');
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateType, setTemplateType] = useState<'simple' | 'structured'>('simple');
    const [filterType, setFilterType] = useState<'all' | 'structured'>('all');

    // Get unique categories from templates + default categories
    const allCategories = useMemo(() => {
        const cats = new Set<string>(['Todas', ...DEFAULT_CATEGORIES]);
        templates.forEach(t => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [templates]);

    // Filter templates by selected category and type
    const filteredTemplates = useMemo(() => {
        let result = templates;

        // Filter by type if requested
        if (filterType === 'structured') {
            result = result.filter(t => t.template_type === 'structured');
        }

        if (selectedCategory === 'Todas') return result;
        return result.filter(t => t.category === selectedCategory);
    }, [templates, selectedCategory, filterType]);

    // Group templates by category
    const templatesByCategory = useMemo(() => {
        const grouped: Record<string, Template[]> = {};
        filteredTemplates.forEach(t => {
            const cat = t.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(t);
        });
        return grouped;
    }, [filteredTemplates]);

    const handleCreate = () => {
        if (name && content) {
            addTemplate(name, content, category);
            setName('');
            setContent('');
            setCategory('Técnica');
            setViewMode('list');
        }
    };

    const handleStartEdit = (template: Template) => {
        setEditingTemplate(template);
        setName(template.name);
        setContent(template.content);
        setCategory(template.category || 'Técnica');

        if (template.template_type === 'structured') {
            setViewMode('edit-structured');
        } else {
            setViewMode('edit');
        }
    };

    const handleEdit = () => {
        if (editingTemplate && name && content) {
            updateTemplate(editingTemplate.id, name, content, category);
            setName('');
            setContent('');
            setCategory('Técnica');
            setEditingTemplate(null);
            setViewMode('list');
        }
    };

    const handleCancelEdit = () => {
        setName('');
        setContent('');
        setCategory('Técnica');
        setEditingTemplate(null);
        setViewMode('list');
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                <h2 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200">
                    <FileText className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                    Plantillas
                </h2>

                {/* Filter Toggle */}
                <div className="flex space-x-1 bg-white/50 dark:bg-black/20 p-1 rounded-lg mx-4">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'all'
                            ? 'bg-white dark:bg-gray-700 shadow text-gray-800 dark:text-gray-200'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilterType('structured')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterType === 'structured'
                            ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-400'
                            : 'text-gray-500 hover:text-green-600 dark:hover:text-green-400'
                            }`}
                    >
                        Inteligentes
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 p-2 hover:bg-white/50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <span className="sr-only">Close</span>
                    ✕
                </button>
            </header>

            {viewMode === 'list' && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-wrap gap-2">
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                    }`}
                            >
                                <FolderOpen className="w-4 h-4 inline mr-1.5" />
                                {cat} ({cat === 'Todas' ? templates.length : templates.filter(t => t.category === cat).length})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {viewMode === 'list' ? (
                    <div className="space-y-4">
                        <button
                            onClick={() => { setTemplateType('simple'); setViewMode('create'); }}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all flex justify-center items-center font-medium"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Nueva Plantilla Simple
                        </button>
                        <button
                            onClick={() => { setTemplateType('structured'); setViewMode('create-structured'); }}
                            className="w-full py-3 border-2 border-dashed border-green-300 dark:border-green-600 rounded-xl text-green-600 dark:text-green-400 hover:border-green-500 hover:text-green-600 dark:hover:border-green-400 transition-all flex justify-center items-center font-medium"
                        >
                            <List className="w-5 h-5 mr-2" /> Nueva Plantilla Estructurada
                        </button>

                        {filteredTemplates.length === 0 && (
                            <p className="text-center text-gray-400 py-12">
                                {selectedCategory === 'Todas' ? 'No hay plantillas guardadas.' : `No hay plantillas en "${selectedCategory}".`}
                            </p>
                        )}

                        {selectedCategory === 'Todas' ? (
                            // Grouped by category
                            Object.entries(templatesByCategory).map(([cat, temps]) => (
                                <div key={cat} className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center">
                                        <FolderOpen className="w-4 h-4 mr-1.5" />
                                        {cat}
                                    </h3>
                                    <div className="space-y-2">
                                        {temps.map((t) => (
                                            <TemplateCard key={t.id} template={t} onInsert={onInsert} onInsertStructured={onInsertStructured} onDelete={removeTemplate} onEdit={handleStartEdit} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Flat list for specific category
                            <div className="space-y-2">
                                {filteredTemplates.map((t) => (
                                    <TemplateCard key={t.id} template={t} onInsert={onInsert} onInsertStructured={onInsertStructured} onDelete={removeTemplate} onEdit={handleStartEdit} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : viewMode === 'create-structured' || viewMode === 'edit-structured' ? (
                    <div>
                        {!editingTemplate ? (
                            // Step 1: Create template metadata
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nombre de la Plantilla</label>
                                    <input
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="ej: TC Abdomen Completo"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Categoría</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {DEFAULT_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex space-x-2 pt-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (name) {
                                                // Create template in DB first
                                                const { data: { session } } = await supabase.auth.getSession();
                                                if (!session) return;

                                                const { data, error } = await supabase
                                                    .from('templates')
                                                    .insert({
                                                        user_id: session.user.id,
                                                        name,
                                                        category,
                                                        template_type: 'structured',
                                                        content: '' // Placeholder
                                                    })
                                                    .select()
                                                    .single();

                                                if (error) {
                                                    console.error('Error creating template:', error);
                                                    return;
                                                }

                                                if (data) {
                                                    setEditingTemplate({ ...data, fields: [] } as Template);
                                                }
                                            }
                                        }}
                                        disabled={!name}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg"
                                    >
                                        Siguiente: Añadir Campos
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Step 2: Edit fields
                            <TemplateFieldEditor
                                templateId={editingTemplate.id}
                                initialFields={editingTemplate.fields || []}
                                onSave={(fields) => {
                                    setEditingTemplate(null);
                                    setName('');
                                    setCategory('Técnica');
                                    setViewMode('list');
                                    // Reload templates to get the updated one
                                    window.location.reload();
                                }}
                                onCancel={() => {
                                    // Delete the template if user cancels
                                    if (editingTemplate) {
                                        removeTemplate(editingTemplate.id);
                                    }
                                    setEditingTemplate(null);
                                    setName('');
                                    setCategory('Técnica');
                                    setViewMode('list');
                                }}
                            />
                        )}
                    </div>
                ) : (
                    // Simple template creation/editing
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Nombre</label>
                            <input
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Pie de firma"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Categoría</label>
                            <select
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {DEFAULT_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Contenido</label>
                            <textarea
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-white h-40 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Texto de la plantilla..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={handleCancelEdit}
                                className="flex-1 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={viewMode === 'edit' ? handleEdit : handleCreate}
                                disabled={!name || !content}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg"
                            >
                                {viewMode === 'edit' ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TemplateCard({ template, onInsert, onInsertStructured, onDelete, onEdit }: { template: Template; onInsert: (content: string) => void; onInsertStructured?: (template: Template) => void; onDelete: (id: string) => void; onEdit: (template: Template) => void }) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group shadow-sm hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</h3>
                    {template.category && template.category !== 'General' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-block">
                            {template.category}
                        </span>
                    )}
                </div>
                <div className="flex space-x-1">
                    <button
                        onClick={() => onEdit(template)}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Editar"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(template.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {template.template_type === 'structured' ? (
                <div className="mb-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <List className="w-3 h-3 mr-1" />
                        {template.fields?.length || 0} campos
                    </span>
                    <p className="text-xs text-gray-400 mt-1 italic">Plantilla inteligente interactiva</p>
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">{template.content}</p>
            )}

            <button
                onClick={() => {
                    if (template.template_type === 'structured' && onInsertStructured) {
                        onInsertStructured(template);
                    } else {
                        onInsert(template.content || '');
                    }
                }}
                className={`w-full py-2 rounded-lg text-sm font-medium flex justify-center items-center transition-colors ${template.template_type === 'structured'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
            >
                <Copy className="w-4 h-4 mr-2" /> Insertar
            </button>
        </div>
    );
}
