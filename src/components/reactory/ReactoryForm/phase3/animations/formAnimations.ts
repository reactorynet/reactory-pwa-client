/**
 * Phase 3.1: Form Animations System
 * Comprehensive animation definitions with proper Framer Motion types
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// ANIMATION TYPES
// ============================================================================

export interface FormAnimationConfig {
  duration?: number;
  ease?: string;
  delay?: number;
  staggerChildren?: number;
  delayChildren?: number;
}

export interface MicroInteractionConfig {
  scale?: number;
  rotate?: number;
  opacity?: number;
  y?: number;
  x?: number;
}

// ============================================================================
// BASE ANIMATIONS
// ============================================================================

export const baseTransitions: Record<string, Transition> = {
  fast: { duration: 0.1, ease: 'easeOut' },
  normal: { duration: 0.2, ease: 'easeOut' },
  slow: { duration: 0.3, ease: 'easeInOut' },
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  bounce: { type: 'spring', stiffness: 400, damping: 10 },
};

// ============================================================================
// FORM FIELD ANIMATIONS
// ============================================================================

export const fieldFocus: Variants = {
  initial: { scale: 1, y: 0 },
  animate: { scale: 1.02, y: -2 },
};

export const fieldError: Variants = {
  initial: { x: 0 },
  animate: { x: [-5, 5, -5, 5, 0] },
};

export const fieldSuccess: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.05, 1] },
};

export const floatingLabel: Variants = {
  initial: { y: 0, scale: 1, color: '#666' },
  animate: { y: -20, scale: 0.85, color: '#1976d2' },
};

// ============================================================================
// FORM SUBMISSION ANIMATIONS
// ============================================================================

export const formSubmit: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const submitButton: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  loading: { scale: 0.9, opacity: 0.7 },
};

export const loadingSpinner: Variants = {
  animate: { rotate: 360 },
};

// ============================================================================
// VALIDATION ANIMATIONS
// ============================================================================

export const validationMessage: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

export const errorShake: Variants = {
  initial: { x: 0 },
  animate: { x: [-10, 10, -10, 10, 0] },
};

export const successPulse: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.1, 1] },
};

// ============================================================================
// MICRO-INTERACTIONS
// ============================================================================

export const microInteractions = {
  checkbox: {
    initial: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
  },
  radio: {
    initial: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
  },
  switch: {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  },
  icon: {
    initial: { rotate: 0 },
    hover: { rotate: 180 },
    tap: { rotate: 90 },
  },
  spinner: {
    animate: { rotate: 360 },
  },
};

// ============================================================================
// STAGGERED ANIMATIONS
// ============================================================================

export const createStaggeredAnimation = (delay: number = 0.1): {
  container: Variants;
  item: Variants;
} => ({
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
});

export const formSection: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

// ============================================================================
// PERFORMANCE OPTIMIZED ANIMATIONS
// ============================================================================

export const performanceAnimations = {
  reducedMotion: {
    fieldFocus: { initial: { scale: 1 }, animate: { scale: 1 } },
    formSubmit: { initial: { opacity: 1 }, animate: { opacity: 1 } },
    microInteractions: {
      checkbox: { initial: { scale: 1 }, hover: { scale: 1 }, tap: { scale: 1 } },
      radio: { initial: { scale: 1 }, hover: { scale: 1 }, tap: { scale: 1 } },
      switch: { initial: { scale: 1 }, hover: { scale: 1 }, tap: { scale: 1 } },
      icon: { initial: { rotate: 0 }, hover: { rotate: 0 }, tap: { rotate: 0 } },
    },
  },
  highPerformance: {
    fieldFocus: { initial: { scale: 1 }, animate: { scale: 1.01 } },
    formSubmit: { initial: { opacity: 0.9 }, animate: { opacity: 1 } },
  },
};

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

export const animationUtils = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Get appropriate animation based on performance preferences
   */
  getPerformanceMode: (): 'normal' | 'reduced' | 'high' => {
    if (animationUtils.prefersReducedMotion()) return 'reduced';
    // Add logic for detecting low-end devices if needed
    return 'normal';
  },

  /**
   * Create animation variants based on performance mode
   */
  createAdaptiveAnimation: (
    normalAnimation: Variants,
    reducedAnimation?: Variants,
    highPerformanceAnimation?: Variants
  ): Variants => {
    const mode = animationUtils.getPerformanceMode();
    
    switch (mode) {
      case 'reduced':
        return reducedAnimation || { initial: {}, animate: {} };
      case 'high':
        return highPerformanceAnimation || normalAnimation;
      default:
        return normalAnimation;
    }
  },

  /**
   * Create entrance animation with configurable duration
   */
  createEntranceAnimation: (duration: number = 0.3): Variants => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  }),

  /**
   * Create exit animation with configurable duration
   */
  createExitAnimation: (duration: number = 0.2): Variants => ({
    initial: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }),
};

// ============================================================================
// MAIN ANIMATION EXPORT
// ============================================================================

export const formAnimations = {
  // Base animations
  fieldFocus,
  fieldError,
  fieldSuccess,
  floatingLabel,
  formSubmit,
  submitButton,
  loadingSpinner,
  validationMessage,
  errorShake,
  successPulse,
  
  // Micro-interactions
  microInteractions,
  
  // Staggered animations
  createStaggeredAnimation,
  formSection,
  
  // Performance optimized
  performanceAnimations,
  
  // Utilities
  animationUtils,
  
  // Base transitions
  baseTransitions,
};

export default formAnimations; 