"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TemplateField } from '@/hooks/useTemplates';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

interface TemplateFieldEditorProps {
    templateId: string;
    initialFields: TemplateField[];
    onSave: (fields: TemplateField[]) => void;
    onCancel: () => void;
}

interface EditableField extends Omit<TemplateField, 'id'> {
    tempId: string; // For new fields that don't have DB id yet
    id?: string; // Optional for existing fields
}

export function TemplateFieldEditor({ templateId, initialFields, onSave, onCancel }: TemplateFieldEditorProps) {
    const [fields, setFields] = useState<EditableField[]>(() =>
        initialFields.map((f, index) => ({
            ...f,
            tempId: f.id || `temp-${index}`,
            variants: f.variants || []
        }))
    );
    const [saving, setSaving] = useState(false);

    const addField = () => {
        const newField: EditableField = {
            tempId: `temp-${Date.now()}`,
            template_id: templateId,
            field_name: '',
            default_text: '',
            section: 'HALLAZGOS',
            display_order: fields.length,
            is_required: false,
            variants: []
        };
        setFields([...fields, newField]);
    };

    const updateField = (tempId: string, updates: Partial<EditableField>) => {
        setFields(prev => prev.map(f =>
            f.tempId === tempId ? { ...f, ...updates } : f
        ));
    };

    const removeField = (tempId: string) => {
        setFields(prev => {
            const filtered = prev.filter(f => f.tempId !== tempId);
            // Reorder display_order
            return filtered.map((f, index) => ({ ...f, display_order: index }));
        });
    };

    const moveField = (tempId: string, direction: 'up' | 'down') => {
        const index = fields.findIndex(f => f.tempId === tempId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === fields.length - 1) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        // Update display_order
        const reordered = newFields.map((f, i) => ({ ...f, display_order: i }));
        setFields(reordered);
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            // Delete all existing fields for this template
            await supabase
                .from('template_fields')
                .delete()
                .eq('template_id', templateId);

            // Insert all current fields
            const fieldsToInsert = fields.map(({ tempId, id, ...field }) => field);

            const { data, error } = await supabase
                .from('template_fields')
                .insert(fieldsToInsert)
                .select();

            if (error) throw error;

            if (data) {
                onSave(data as TemplateField[]);
            }
        } catch (error) {
            console.error('Error saving fields:', error);
            alert('Error al guardar los campos. Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    Editar Campos de Plantilla
                </h3>
                <button
                    onClick={addField}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Campo</span>
                </button>
            </div>

            {fields.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No hay campos. Click "Añadir Campo" para empezar.
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div
                            key={field.tempId}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                        >
                            <div className="flex items-start space-x-3">
                                {/* Drag handle */}
                                <div className="flex flex-col space-y-1 pt-2">
                                    <button
                                        onClick={() => moveField(field.tempId, 'up')}
                                        disabled={index === 0}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                                        title="Mover arriba"
                                    >
                                        ▲
                                    </button>
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <button
                                        onClick={() => moveField(field.tempId, 'down')}
                                        disabled={index === fields.length - 1}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                                        title="Mover abajo"
                                    >
                                        ▼
                                    </button>
                                </div>

                                {/* Field content */}
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Nombre del Campo
                                            </label>
                                            <input
                                                type="text"
                                                value={field.field_name}
                                                onChange={(e) => updateField(field.tempId, { field_name: e.target.value })}
                                                placeholder="ej: Hígado"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Sección
                                            </label>
                                            <select
                                                value={field.section}
                                                onChange={(e) => updateField(field.tempId, { section: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                                            >
                                                <option value="TECNICA">TÉCNICA</option>
                                                <option value="HALLAZGOS">HALLAZGOS</option>
                                                <option value="CONCLUSION">CONCLUSIÓN</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Texto de Normalidad
                                        </label>
                                        <textarea
                                            value={field.default_text}
                                            onChange={(e) => updateField(field.tempId, { default_text: e.target.value })}
                                            placeholder="ej: de morfología y tamaño normales. Sin LOEs."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Variantes rápidas (separadas por punto y coma ';')
                                        </label>
                                        <textarea
                                            value={field.variants?.join('; ') || ''}
                                            onChange={(e) => updateField(field.tempId, {
                                                variants: e.target.value.split(';').map(v => v.trim()).filter(v => v.length > 0)
                                            })}
                                            placeholder="ej: es de tamaño aumentado por esteatosis; presenta quistes simples milimétricos"
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Opciones que aparecerán al hacer clic derecho</p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`required-${field.tempId}`}
                                            checked={field.is_required}
                                            onChange={(e) => updateField(field.tempId, { is_required: e.target.checked })}
                                            className="rounded"
                                        />
                                        <label htmlFor={`required-${field.tempId}`} className="text-sm text-gray-700 dark:text-gray-300">
                                            Campo requerido
                                        </label>
                                    </div>
                                </div>

                                {/* Delete button */}
                                <button
                                    onClick={() => removeField(field.tempId)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    title="Eliminar campo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    disabled={saving}
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || fields.length === 0 || fields.some(f => !f.field_name || !f.default_text)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </div>
        </div>
    );
}
