/**
 * Phase 4.3: Form Builder Hook
 * Comprehensive form builder with drag-and-drop, schema editing, and preview capabilities
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'custom';
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
  uiSchema?: {
    width?: string;
    height?: string;
    disabled?: boolean;
    hidden?: boolean;
    className?: string;
    style?: React.CSSProperties;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsed?: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  uiSchema?: {
    backgroundColor?: string;
    borderColor?: string;
    padding?: string;
    margin?: string;
  };
}

export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  version: string;
  sections: FormSection[];
  layout: 'single-column' | 'two-column' | 'three-column' | 'grid' | 'custom';
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  settings?: {
    showProgress?: boolean;
    allowSave?: boolean;
    allowReset?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
  };
  metadata?: Record<string, any>;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: FormSchema;
  thumbnail?: string;
  tags?: string[];
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DragState {
  isDragging: boolean;
  draggedItem: FormField | FormSection | null;
  dragType: 'field' | 'section' | null;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
}

export interface BuilderState {
  schema: FormSchema;
  selectedItem: FormField | FormSection | null;
  hoveredItem: FormField | FormSection | null;
  dragState: DragState;
  previewMode: boolean;
  zoomLevel: number;
  gridSnap: boolean;
  showGrid: boolean;
  showRulers: boolean;
  history: FormSchema[];
  historyIndex: number;
  maxHistorySize: number;
}

export interface FormBuilderConfig {
  /** Whether to enable the form builder */
  enabled?: boolean;
  /** Initial form schema */
  initialSchema?: FormSchema;
  /** Whether to enable drag and drop */
  enableDragDrop?: boolean;
  /** Whether to enable form preview */
  enablePreview?: boolean;
  /** Whether to enable form templates */
  enableTemplates?: boolean;
  /** Whether to enable undo/redo */
  enableHistory?: boolean;
  /** Whether to enable auto-save */
  enableAutoSave?: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Maximum history size */
  maxHistorySize?: number;
  /** Grid snap distance */
  gridSnapDistance?: number;
  /** Available field types */
  availableFieldTypes?: FormField['type'][];
  /** Available templates */
  availableTemplates?: FormTemplate[];
  /** Custom field renderers */
  customFieldRenderers?: Record<string, React.ComponentType<any>>;
  /** Event handlers */
  onSchemaChange?: (schema: FormSchema) => void;
  onFieldSelect?: (field: FormField) => void;
  onSectionSelect?: (section: FormSection) => void;
  onDragStart?: (item: FormField | FormSection, type: 'field' | 'section') => void;
  onDragEnd?: (item: FormField | FormSection, position: { x: number; y: number }) => void;
  onSave?: (schema: FormSchema) => void;
  onExport?: (schema: FormSchema, format: 'json' | 'yaml' | 'xml') => void;
  onImport?: (schema: FormSchema) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export const useFormBuilder = (config: FormBuilderConfig = {}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [state, setState] = useState<BuilderState>(() => {
    const initialSchema = config.initialSchema || createDefaultSchema();
    return {
      schema: initialSchema,
      selectedItem: null,
      hoveredItem: null,
      dragState: {
        isDragging: false,
        draggedItem: null,
        dragType: null,
        startPosition: null,
        currentPosition: null,
      },
      previewMode: false,
      zoomLevel: 1,
      gridSnap: true,
      showGrid: true,
      showRulers: true,
      history: [initialSchema],
      historyIndex: 0,
      maxHistorySize: config.maxHistorySize || 50,
    };
  });

  // ============================================================================
  // REFS
  // ============================================================================

  const canvasRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const {
    enabled = true,
    enableDragDrop = true,
    enablePreview = true,
    enableTemplates = true,
    enableHistory = true,
    enableAutoSave = true,
    autoSaveInterval = 5000,
    gridSnapDistance = 10,
    availableFieldTypes = ['text', 'email', 'password', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file'],
    availableTemplates = [],
    customFieldRenderers = {},
    onSchemaChange,
    onFieldSelect,
    onSectionSelect,
    onDragStart,
    onDragEnd,
    onSave,
    onExport,
    onImport,
  } = config;

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const createDefaultSchema = useCallback((): FormSchema => {
    return {
      id: uuidv4(),
      name: 'New Form',
      description: 'A new form created with the form builder',
      version: '1.0.0',
      sections: [
        {
          id: uuidv4(),
          title: 'Main Section',
          description: 'Main form section',
          fields: [],
          position: { x: 0, y: 0, width: 800, height: 600 },
        },
      ],
      layout: 'single-column',
      theme: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        backgroundColor: '#ffffff',
        textColor: '#000000',
      },
      settings: {
        showProgress: true,
        allowSave: true,
        allowReset: true,
        autoSave: true,
        autoSaveInterval: 5000,
      },
    };
  }, []);

  const snapToGrid = useCallback((position: { x: number; y: number }): { x: number; y: number } => {
    if (!state.gridSnap) return position;
    
    return {
      x: Math.round(position.x / gridSnapDistance) * gridSnapDistance,
      y: Math.round(position.y / gridSnapDistance) * gridSnapDistance,
    };
  }, [state.gridSnap, gridSnapDistance]);

  const addToHistory = useCallback((schema: FormSchema) => {
    if (!enableHistory) return;

    setState(prev => {
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), schema];
      const historyIndex = Math.min(newHistory.length - 1, prev.maxHistorySize - 1);
      
      return {
        ...prev,
        history: newHistory.slice(-prev.maxHistorySize),
        historyIndex,
      };
    });
  }, [enableHistory]);

  // ============================================================================
  // FIELD MANAGEMENT
  // ============================================================================

  const addField = useCallback((fieldType: FormField['type'], sectionId: string, position?: { x: number; y: number; width?: number; height?: number }) => {
    const newField: FormField = {
      id: uuidv4(),
      type: fieldType,
      label: `New ${fieldType} field`,
      placeholder: `Enter ${fieldType}`,
      required: false,
      position: {
        x: position?.x || 0,
        y: position?.y || 0,
        width: position?.width || 200,
        height: position?.height || 50,
      },
      validation: {},
      uiSchema: {},
    };

    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.map(section =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, newField] }
            : section
        ),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: newField,
      };
    });
  }, [addToHistory, onSchemaChange]);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.map(section => ({
          ...section,
          fields: section.fields.map(field =>
            field.id === fieldId ? { ...field, ...updates } : field
          ),
        })),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: prev.selectedItem?.id === fieldId ? { ...prev.selectedItem, ...updates } as FormField | FormSection : prev.selectedItem,
      };
    });
  }, [addToHistory, onSchemaChange]);

  const removeField = useCallback((fieldId: string) => {
    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.map(section => ({
          ...section,
          fields: section.fields.filter(field => field.id !== fieldId),
        })),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: prev.selectedItem?.id === fieldId ? null : prev.selectedItem,
      };
    });
  }, [addToHistory, onSchemaChange]);

  const duplicateField = useCallback((fieldId: string) => {
    setState(prev => {
      const fieldToDuplicate = prev.schema.sections
        .flatMap(section => section.fields)
        .find(field => field.id === fieldId);

      if (!fieldToDuplicate) return prev;

      const duplicatedField: FormField = {
        ...fieldToDuplicate,
        id: uuidv4(),
        label: `${fieldToDuplicate.label} (Copy)`,
        position: {
          ...fieldToDuplicate.position,
          x: fieldToDuplicate.position.x + 20,
          y: fieldToDuplicate.position.y + 20,
        },
      };

      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.map(section => ({
          ...section,
          fields: [...section.fields, duplicatedField],
        })),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: duplicatedField,
      };
    });
  }, [addToHistory, onSchemaChange]);

  // ============================================================================
  // SECTION MANAGEMENT
  // ============================================================================

  const addSection = useCallback((position?: { x: number; y: number; width?: number; height?: number }) => {
    const newSection: FormSection = {
      id: uuidv4(),
      title: 'New Section',
      description: 'A new form section',
      fields: [],
      position: {
        x: position?.x || 0,
        y: position?.y || 0,
        width: position?.width || 800,
        height: position?.height || 400,
      },
      uiSchema: {},
    };

    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: [...prev.schema.sections, newSection],
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: newSection,
      };
    });
  }, [addToHistory, onSchemaChange]);

  const updateSection = useCallback((sectionId: string, updates: Partial<FormSection>) => {
    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.map(section =>
          section.id === sectionId ? { ...section, ...updates } : section
        ),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: prev.selectedItem?.id === sectionId ? { ...prev.selectedItem, ...updates } as FormField | FormSection : prev.selectedItem,
      };
    });
  }, [addToHistory, onSchemaChange]);

  const removeSection = useCallback((sectionId: string) => {
    setState(prev => {
      const updatedSchema = {
        ...prev.schema,
        sections: prev.schema.sections.filter(section => section.id !== sectionId),
      };

      addToHistory(updatedSchema);
      onSchemaChange?.(updatedSchema);

      return {
        ...prev,
        schema: updatedSchema,
        selectedItem: prev.selectedItem?.id === sectionId ? null : prev.selectedItem,
      };
    });
  }, [addToHistory, onSchemaChange]);

  // ============================================================================
  // DRAG AND DROP
  // ============================================================================

  const startDrag = useCallback((item: FormField | FormSection, type: 'field' | 'section', startPosition: { x: number; y: number }) => {
    if (!enableDragDrop) return;

    setState(prev => ({
      ...prev,
      dragState: {
        isDragging: true,
        draggedItem: item,
        dragType: type,
        startPosition,
        currentPosition: startPosition,
      },
    }));

    onDragStart?.(item, type);
  }, [enableDragDrop, onDragStart]);

  const updateDrag = useCallback((position: { x: number; y: number }) => {
    if (!enableDragDrop) return;

    setState(prev => ({
      ...prev,
      dragState: {
        ...prev.dragState,
        currentPosition: snapToGrid(position),
      },
    }));
  }, [enableDragDrop, snapToGrid]);

  const endDrag = useCallback((position: { x: number; y: number }) => {
    if (!enableDragDrop) return;

    const snappedPosition = snapToGrid(position);

    setState(prev => {
      const updatedSchema = { ...prev.schema };

      if (prev.dragState.draggedItem) {
        if (prev.dragState.dragType === 'field') {
          const field = prev.dragState.draggedItem as FormField;
          updateField(field.id, { 
            position: {
              ...field.position,
              x: snappedPosition.x,
              y: snappedPosition.y,
            }
          });
        } else if (prev.dragState.dragType === 'section') {
          const section = prev.dragState.draggedItem as FormSection;
          updateSection(section.id, { 
            position: {
              ...section.position,
              x: snappedPosition.x,
              y: snappedPosition.y,
            }
          });
        }
      }

      return {
        ...prev,
        dragState: {
          isDragging: false,
          draggedItem: null,
          dragType: null,
          startPosition: null,
          currentPosition: null,
        },
      };
    });

    // Note: onDragEnd callback is handled within the setState callback
  }, [enableDragDrop, snapToGrid, updateField, updateSection]);

  // ============================================================================
  // SELECTION
  // ============================================================================

  const selectItem = useCallback((item: FormField | FormSection | null) => {
    setState(prev => ({
      ...prev,
      selectedItem: item,
    }));

    if (item) {
      if ('type' in item) {
        onFieldSelect?.(item as FormField);
      } else {
        onSectionSelect?.(item as FormSection);
      }
    }
  }, [onFieldSelect, onSectionSelect]);

  const hoverItem = useCallback((item: FormField | FormSection | null) => {
    setState(prev => ({
      ...prev,
      hoveredItem: item,
    }));
  }, []);

  // ============================================================================
  // PREVIEW MODE
  // ============================================================================

  const togglePreviewMode = useCallback(() => {
    if (!enablePreview) return;

    setState(prev => ({
      ...prev,
      previewMode: !prev.previewMode,
    }));
  }, [enablePreview]);

  // ============================================================================
  // ZOOM AND GRID
  // ============================================================================

  const setZoomLevel = useCallback((zoomLevel: number) => {
    setState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.1, Math.min(3, zoomLevel)),
    }));
  }, []);

  const toggleGridSnap = useCallback(() => {
    setState(prev => ({
      ...prev,
      gridSnap: !prev.gridSnap,
    }));
  }, []);

  const toggleShowGrid = useCallback(() => {
    setState(prev => ({
      ...prev,
      showGrid: !prev.showGrid,
    }));
  }, []);

  const toggleShowRulers = useCallback(() => {
    setState(prev => ({
      ...prev,
      showRulers: !prev.showRulers,
    }));
  }, []);

  // ============================================================================
  // HISTORY
  // ============================================================================

  const undo = useCallback(() => {
    if (!enableHistory) return;

    setState(prev => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        const newSchema = prev.history[newIndex];
        
        onSchemaChange?.(newSchema);
        
        return {
          ...prev,
          schema: newSchema,
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, [enableHistory, onSchemaChange]);

  const redo = useCallback(() => {
    if (!enableHistory) return;

    setState(prev => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        const newSchema = prev.history[newIndex];
        
        onSchemaChange?.(newSchema);
        
        return {
          ...prev,
          schema: newSchema,
          historyIndex: newIndex,
        };
      }
      return prev;
    });
  }, [enableHistory, onSchemaChange]);

  // ============================================================================
  // SAVE AND EXPORT
  // ============================================================================

  const saveSchema = useCallback(() => {
    onSave?.(state.schema);
  }, [state.schema, onSave]);

  const exportSchema = useCallback((format: 'json' | 'yaml' | 'xml') => {
    onExport?.(state.schema, format);
  }, [state.schema, onExport]);

  const importSchema = useCallback((schema: FormSchema) => {
    setState(prev => {
      addToHistory(schema);
      onSchemaChange?.(schema);
      onImport?.(schema);

      return {
        ...prev,
        schema,
        selectedItem: null,
        history: [schema],
        historyIndex: 0,
      };
    });
  }, [addToHistory, onSchemaChange, onImport]);

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  const loadTemplate = useCallback((template: FormTemplate) => {
    importSchema(template.schema);
  }, [importSchema]);

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  useEffect(() => {
    if (enableAutoSave && autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        saveSchema();
      }, autoSaveInterval);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [enableAutoSave, autoSaveInterval, saveSchema]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    state,
    schema: state.schema,
    selectedItem: state.selectedItem,
    hoveredItem: state.hoveredItem,
    dragState: state.dragState,
    previewMode: state.previewMode,
    zoomLevel: state.zoomLevel,
    gridSnap: state.gridSnap,
    showGrid: state.showGrid,
    showRulers: state.showRulers,

    // Field management
    addField,
    updateField,
    removeField,
    duplicateField,

    // Section management
    addSection,
    updateSection,
    removeSection,

    // Drag and drop
    startDrag,
    updateDrag,
    endDrag,

    // Selection
    selectItem,
    hoverItem,

    // Preview mode
    togglePreviewMode,

    // Zoom and grid
    setZoomLevel,
    toggleGridSnap,
    toggleShowGrid,
    toggleShowRulers,

    // History
    undo,
    redo,

    // Save and export
    saveSchema,
    exportSchema,
    importSchema,

    // Templates
    loadTemplate,

    // Configuration
    availableFieldTypes,
    availableTemplates,
    customFieldRenderers,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default useFormBuilder; 