import { useState, useCallback, useMemo } from 'react';
import { StepDefinition, StepCategory } from '../types';
import { BUILT_IN_STEPS, STEP_CATEGORIES } from '../constants';

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

  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [localCustomSteps, setLocalCustomSteps] = useState<StepDefinition[]>(customSteps);

  // Combine built-in and custom steps
  const stepLibrary = useMemo(() => {
    return [...BUILT_IN_STEPS, ...localCustomSteps];
  }, [localCustomSteps]);

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
