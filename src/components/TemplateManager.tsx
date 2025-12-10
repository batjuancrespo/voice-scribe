"use client";

import React, { useState } from 'react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { Plus, Trash, FileText, Copy } from 'lucide-react';

interface TemplateManagerProps {
    onInsert: (content: string) => void;
    onClose: () => void;
}

export function TemplateManager({ onInsert, onClose }: TemplateManagerProps) {
    const { templates, addTemplate, removeTemplate } = useTemplates();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    const handleCreate = () => {
        if (name && content) {
            addTemplate(name, content);
            setName('');
            setContent('');
            setViewMode('list');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Plantillas
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-black">
                    <span className="sr-only">Close</span>
                    ✕
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {viewMode === 'list' ? (
                    <div className="space-y-3">
                        <button
                            onClick={() => setViewMode('create')}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex justify-center items-center"
                        >
                            <Plus className="w-5 h-5 mr-1" /> Nueva Plantilla
                        </button>

                        {templates.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No hay plantillas guardadas.</p>
                        )}

                        {templates.map((t) => (
                            <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t.name}</h3>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => removeTemplate(t.id)}
                                            className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3 font-mono text-xs bg-gray-50 p-1 rounded">{t.content}</p>
                                <button
                                    onClick={() => onInsert(t.content)}
                                    className="w-full py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium flex justify-center items-center"
                                >
                                    <Copy className="w-4 h-4 mr-2" /> Insertar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre</label>
                            <input
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                                placeholder="Ej: Pie de firma"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contenido</label>
                            <textarea
                                className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 h-32"
                                placeholder="Texto de la plantilla..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!name || !content}
                                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
