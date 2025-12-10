"use client";

import React, { useState, useMemo } from 'react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { Plus, Trash, FileText, Copy, FolderOpen } from 'lucide-react';

interface TemplateManagerProps {
    onInsert: (content: string) => void;
    onClose: () => void;
}

const DEFAULT_CATEGORIES = ['General', 'Informes', 'Firmas', 'Diagnósticos', 'Prescripciones'];

export function TemplateManager({ onInsert, onClose }: TemplateManagerProps) {
    const { templates, addTemplate, removeTemplate } = useTemplates();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    // Get unique categories from templates + default categories
    const allCategories = useMemo(() => {
        const cats = new Set<string>(['Todas', ...DEFAULT_CATEGORIES]);
        templates.forEach(t => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [templates]);

    // Filter templates by selected category
    const filteredTemplates = useMemo(() => {
        if (selectedCategory === 'Todas') return templates;
        return templates.filter(t => t.category === selectedCategory);
    }, [templates, selectedCategory]);

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
            setCategory('General');
            setViewMode('list');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                <h2 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200">
                    <FileText className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                    Plantillas
                </h2>
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

            <div className="flex-1 overflow-y-auto p-4">
                {viewMode === 'list' ? (
                    <div className="space-y-4">
                        <button
                            onClick={() => setViewMode('create')}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all flex justify-center items-center font-medium"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Nueva Plantilla
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
                                            <TemplateCard key={t.id} template={t} onInsert={onInsert} onDelete={removeTemplate} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Flat list for specific category
                            <div className="space-y-2">
                                {filteredTemplates.map((t) => (
                                    <TemplateCard key={t.id} template={t} onInsert={onInsert} onDelete={removeTemplate} />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
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
                                onClick={() => setViewMode('list')}
                                className="flex-1 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!name || !content}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TemplateCard({ template, onInsert, onDelete }: { template: Template; onInsert: (content: string) => void; onDelete: (id: string) => void }) {
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
                <button
                    onClick={() => onDelete(template.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                >
                    <Trash className="w-4 h-4" />
                </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded">{template.content}</p>
            <button
                onClick={() => onInsert(template.content)}
                className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm font-medium flex justify-center items-center transition-colors"
            >
                <Copy className="w-4 h-4 mr-2" /> Insertar
            </button>
        </div>
    );
}
