import { useState, useCallback, useMemo, useEffect } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { StepDefinition, StepCategory, PortType } from '../types';
import { BUILT_IN_STEPS, STEP_CATEGORIES } from '../constants';

/**
 * GraphQL query for the server-side step catalog. Returns every registered engine
 * step type, including designer definitions contributed by modules. The designer
 * merges these with its built-in library so module steps (e.g. agent_conversation)
 * appear without a client release.
 */
const WORKFLOW_STEP_CATALOG_QUERY = `
  query WorkflowStepCatalog {
    workflowStepCatalog {
      stepType
      source
      description
      version
      definition {
        id
        name
        category
        description
        icon
        color
        inputPorts { name type dataType required description }
        outputPorts { name type dataType required description }
        propertySchema
        uiSchema
        inputsSchema
        inputsUiSchema
        defaultProperties
        tags
        rendering
      }
    }
  }
`;

interface CatalogPort {
  name: string;
  type: string;
  dataType?: string;
  required?: boolean;
  description?: string;
}

interface CatalogDefinition {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  icon?: string;
  color?: string;
  inputPorts?: CatalogPort[];
  outputPorts?: CatalogPort[];
  propertySchema?: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  inputsSchema?: Record<string, unknown>;
  inputsUiSchema?: Record<string, unknown>;
  defaultProperties?: Record<string, unknown>;
  tags?: string[];
  rendering?: Record<string, unknown>;
}

interface CatalogEntry {
  stepType: string;
  source: string;
  description?: string;
  version?: string;
  definition?: CatalogDefinition | null;
}

/** Map a server catalog port to the designer PortTemplate shape. */
function toPortTemplate(p: CatalogPort) {
  return {
    name: p.name,
    type: (p.type as PortType) || PortType.INPUT,
    dataType: p.dataType || 'any',
    required: p.required,
    description: p.description,
  };
}

/**
 * Convert a catalog entry that carries a designer definition into a full
 * StepDefinition usable by the designer. Returns null when the entry has no
 * definition (the designer already covers core steps via its built-in library).
 */
function catalogEntryToStepDefinition(entry: CatalogEntry): StepDefinition | null {
  const def = entry.definition;
  if (!def) return null;
  return {
    id: def.id || entry.stepType,
    name: def.name || entry.stepType,
    category: def.category || 'integration',
    description: def.description || entry.description || '',
    icon: def.icon,
    color: def.color,
    inputPorts: (def.inputPorts || []).map(toPortTemplate),
    outputPorts: (def.outputPorts || []).map(toPortTemplate),
    // Schema/uiSchema/rendering are opaque JSON authored against the designer's
    // StepDefinition shape; cast the assembled object through `unknown` since the
    // catalog types them loosely as Record<string, unknown>.
    propertySchema: def.propertySchema || { type: 'object', properties: {} },
    uiSchema: def.uiSchema,
    inputsSchema: def.inputsSchema,
    inputsUiSchema: def.inputsUiSchema,
    defaultProperties: def.defaultProperties || {},
    tags: def.tags,
    rendering: def.rendering,
  } as unknown as StepDefinition;
}

export interface UseStepLibraryReturn {
  stepLibrary: StepDefinition[];
  categories: StepCategory[];
  filteredSteps: StepDefinition[];
  searchTerm: string;
  selectedCategory: string | null;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  getStepsByCategory: (categoryId: string) => StepDefinition[];
  getStepDefinition: (stepType: string) => StepDefinition | undefined;
  addCustomStep: (step: StepDefinition) => void;
  removeCustomStep: (stepId: string) => void;
  resetLibrary: () => void;
}

interface UseStepLibraryOptions {
  customSteps?: StepDefinition[];
  customCategories?: StepCategory[];
}

export function useStepLibrary(options: UseStepLibraryOptions = {}): UseStepLibraryReturn {
  const { customSteps = [], customCategories = [] } = options;
  const reactory = useReactory();

  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [localCustomSteps, setLocalCustomSteps] = useState<StepDefinition[]>(customSteps);
  // Module-contributed step definitions fetched from the server step catalog.
  const [catalogSteps, setCatalogSteps] = useState<StepDefinition[]>([]);

  // Fetch the server step catalog once and merge any module-contributed step
  // definitions. Failures are non-fatal — the built-in library still works.
  useEffect(() => {
    let mounted = true;
    if (!reactory?.graphqlQuery) return undefined;
    (async () => {
      try {
        const response = await reactory.graphqlQuery<{ workflowStepCatalog: CatalogEntry[] }, Record<string, never>>(
          WORKFLOW_STEP_CATALOG_QUERY,
          {},
        );
        const entries = response?.data?.workflowStepCatalog || [];
        const defs = entries
          .map(catalogEntryToStepDefinition)
          .filter((d): d is StepDefinition => d !== null);
        if (mounted && defs.length > 0) setCatalogSteps(defs);
      } catch (err) {
        reactory.log?.('WorkflowDesigner: failed to load step catalog', { err }, 'warning');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [reactory]);

  // Combine built-in, catalog (module-contributed), and custom steps.
  // Built-in definitions win by id (they carry the richest rendering); catalog
  // entries only add step types the built-in library doesn't already cover.
  const stepLibrary = useMemo(() => {
    const builtInIds = new Set(BUILT_IN_STEPS.map((s) => s.id));
    const customIds = new Set(localCustomSteps.map((s) => s.id));
    const moduleSteps = catalogSteps.filter((s) => !builtInIds.has(s.id) && !customIds.has(s.id));
    return [...BUILT_IN_STEPS, ...moduleSteps, ...localCustomSteps];
  }, [catalogSteps, localCustomSteps]);

  // Combine built-in and custom categories
  const categories = useMemo(() => {
    const allCategories = [...STEP_CATEGORIES, ...customCategories];
    
    // Update categories with custom steps
    const categoryMap = new Map(allCategories.map(cat => [cat.id, { ...cat, steps: [] as StepDefinition[] }]));
    
    stepLibrary.forEach(step => {
      const category = categoryMap.get(step.category);
      if (category) {
        category.steps.push(step);
      } else {
        // Create a new category for uncategorized steps
        if (!categoryMap.has('uncategorized')) {
          categoryMap.set('uncategorized', {
            id: 'uncategorized',
            name: 'Uncategorized',
            description: 'Steps without a specific category',
            icon: 'help_outline',
            color: '#757575',
            steps: []
          });
        }
        categoryMap.get('uncategorized')!.steps.push(step);
      }
    });

    return Array.from(categoryMap.values()).filter(cat => cat.steps.length > 0);
  }, [stepLibrary, customCategories]);

  // Filter steps based on search term and selected category
  const filteredSteps = useMemo(() => {
    let filtered = stepLibrary;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(step => step.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(step => {
        const nameMatch = step.name.toLowerCase().includes(term);
        const descMatch = step.description.toLowerCase().includes(term);
        const tagMatch = step.tags?.some(tag => tag.toLowerCase().includes(term));
        const categoryMatch = step.category.toLowerCase().includes(term);
        
        return nameMatch || descMatch || tagMatch || categoryMatch;
      });
    }

    return filtered;
  }, [stepLibrary, searchTerm, selectedCategory]);

  // Get steps by category
  const getStepsByCategory = useCallback((categoryId: string): StepDefinition[] => {
    return stepLibrary.filter(step => step.category === categoryId);
  }, [stepLibrary]);

  // Get step definition by type
  const getStepDefinition = useCallback((stepType: string): StepDefinition | undefined => {
    return stepLibrary.find(step => step.id === stepType);
  }, [stepLibrary]);

  // Add custom step
  const addCustomStep = useCallback((step: StepDefinition) => {
    setLocalCustomSteps(prev => {
      // Check if step already exists
      const existingIndex = prev.findIndex(s => s.id === step.id);
      if (existingIndex >= 0) {
        // Update existing step
        const updated = [...prev];
        updated[existingIndex] = step;
        return updated;
      } else {
        // Add new step
        return [...prev, step];
      }
    });
  }, []);

  // Remove custom step
  const removeCustomStep = useCallback((stepId: string) => {
    setLocalCustomSteps(prev => prev.filter(step => step.id !== stepId));
  }, []);

  // Reset library to built-in steps only
  const resetLibrary = useCallback(() => {
    setLocalCustomSteps([]);
    setSearchTerm('');
    setSelectedCategory(null);
  }, []);

  return {
    stepLibrary,
    categories,
    filteredSteps,
    searchTerm,
    selectedCategory,
    setSearchTerm,
    setSelectedCategory,
    getStepsByCategory,
    getStepDefinition,
    addCustomStep,
    removeCustomStep,
    resetLibrary
  };
}
