/**
 * Phase 3.1: Animation System Tests
 * Comprehensive tests for the form animation system
 */

import { formAnimations, animationUtils } from '../animations/formAnimations';

describe('Phase 3.1: Animation System', () => {
  describe('Base Animations', () => {
    test('should have field focus animation', () => {
      expect(formAnimations.fieldFocus).toBeDefined();
      expect(formAnimations.fieldFocus.initial).toBeDefined();
      expect(formAnimations.fieldFocus.animate).toBeDefined();
    });

    test('should have field error animation', () => {
      expect(formAnimations.fieldError).toBeDefined();
      expect(formAnimations.fieldError.initial).toBeDefined();
      expect(formAnimations.fieldError.animate).toBeDefined();
    });

    test('should have field success animation', () => {
      expect(formAnimations.fieldSuccess).toBeDefined();
      expect(formAnimations.fieldSuccess.initial).toBeDefined();
      expect(formAnimations.fieldSuccess.animate).toBeDefined();
    });

    test('should have floating label animation', () => {
      expect(formAnimations.floatingLabel).toBeDefined();
      expect(formAnimations.floatingLabel.initial).toBeDefined();
      expect(formAnimations.floatingLabel.animate).toBeDefined();
    });
  });

  describe('Form Submission Animations', () => {
    test('should have form submit animation', () => {
      expect(formAnimations.formSubmit).toBeDefined();
      expect(formAnimations.formSubmit.initial).toBeDefined();
      expect(formAnimations.formSubmit.animate).toBeDefined();
      expect(formAnimations.formSubmit.exit).toBeDefined();
    });

    test('should have submit button animation', () => {
      expect(formAnimations.submitButton).toBeDefined();
      expect(formAnimations.submitButton.initial).toBeDefined();
      expect(formAnimations.submitButton.hover).toBeDefined();
      expect(formAnimations.submitButton.tap).toBeDefined();
      expect(formAnimations.submitButton.loading).toBeDefined();
    });

    test('should have loading spinner animation', () => {
      expect(formAnimations.loadingSpinner).toBeDefined();
      expect(formAnimations.loadingSpinner.animate).toBeDefined();
    });
  });

  describe('Validation Animations', () => {
    test('should have validation message animation', () => {
      expect(formAnimations.validationMessage).toBeDefined();
      expect(formAnimations.validationMessage.initial).toBeDefined();
      expect(formAnimations.validationMessage.animate).toBeDefined();
      expect(formAnimations.validationMessage.exit).toBeDefined();
    });

    test('should have error shake animation', () => {
      expect(formAnimations.errorShake).toBeDefined();
      expect(formAnimations.errorShake.initial).toBeDefined();
      expect(formAnimations.errorShake.animate).toBeDefined();
    });

    test('should have success pulse animation', () => {
      expect(formAnimations.successPulse).toBeDefined();
      expect(formAnimations.successPulse.initial).toBeDefined();
      expect(formAnimations.successPulse.animate).toBeDefined();
    });
  });

  describe('Micro-Interactions', () => {
    test('should have checkbox micro-interaction', () => {
      expect(formAnimations.microInteractions.checkbox).toBeDefined();
      expect(formAnimations.microInteractions.checkbox.initial).toBeDefined();
      expect(formAnimations.microInteractions.checkbox.hover).toBeDefined();
      expect(formAnimations.microInteractions.checkbox.tap).toBeDefined();
    });

    test('should have radio micro-interaction', () => {
      expect(formAnimations.microInteractions.radio).toBeDefined();
      expect(formAnimations.microInteractions.radio.initial).toBeDefined();
      expect(formAnimations.microInteractions.radio.hover).toBeDefined();
      expect(formAnimations.microInteractions.radio.tap).toBeDefined();
    });

    test('should have switch micro-interaction', () => {
      expect(formAnimations.microInteractions.switch).toBeDefined();
      expect(formAnimations.microInteractions.switch.initial).toBeDefined();
      expect(formAnimations.microInteractions.switch.hover).toBeDefined();
      expect(formAnimations.microInteractions.switch.tap).toBeDefined();
    });

    test('should have icon micro-interaction', () => {
      expect(formAnimations.microInteractions.icon).toBeDefined();
      expect(formAnimations.microInteractions.icon.initial).toBeDefined();
      expect(formAnimations.microInteractions.icon.hover).toBeDefined();
      expect(formAnimations.microInteractions.icon.tap).toBeDefined();
    });

    test('should have spinner micro-interaction', () => {
      expect(formAnimations.microInteractions.spinner).toBeDefined();
      expect(formAnimations.microInteractions.spinner.animate).toBeDefined();
    });
  });

  describe('Staggered Animations', () => {
    test('should create staggered animation', () => {
      const staggered = formAnimations.createStaggeredAnimation(0.2);
      expect(staggered.container).toBeDefined();
      expect(staggered.item).toBeDefined();
      expect(staggered.container.initial).toBeDefined();
      expect(staggered.container.animate).toBeDefined();
      expect(staggered.item.initial).toBeDefined();
      expect(staggered.item.animate).toBeDefined();
    });

    test('should have form section animation', () => {
      expect(formAnimations.formSection).toBeDefined();
      expect(formAnimations.formSection.initial).toBeDefined();
      expect(formAnimations.formSection.animate).toBeDefined();
    });
  });

  describe('Performance Animations', () => {
    test('should have reduced motion animations', () => {
      expect(formAnimations.performanceAnimations.reducedMotion).toBeDefined();
      expect(formAnimations.performanceAnimations.reducedMotion.fieldFocus).toBeDefined();
      expect(formAnimations.performanceAnimations.reducedMotion.formSubmit).toBeDefined();
      expect(formAnimations.performanceAnimations.reducedMotion.microInteractions).toBeDefined();
    });

    test('should have high performance animations', () => {
      expect(formAnimations.performanceAnimations.highPerformance).toBeDefined();
      expect(formAnimations.performanceAnimations.highPerformance.fieldFocus).toBeDefined();
      expect(formAnimations.performanceAnimations.highPerformance.formSubmit).toBeDefined();
    });
  });

  describe('Animation Utilities', () => {
    test('should have prefersReducedMotion function', () => {
      expect(typeof animationUtils.prefersReducedMotion).toBe('function');
      expect(typeof animationUtils.prefersReducedMotion()).toBe('boolean');
    });

    test('should have getPerformanceMode function', () => {
      expect(typeof animationUtils.getPerformanceMode).toBe('function');
      const mode = animationUtils.getPerformanceMode();
      expect(['normal', 'reduced', 'high']).toContain(mode);
    });

    test('should have createAdaptiveAnimation function', () => {
      expect(typeof animationUtils.createAdaptiveAnimation).toBe('function');
      const normalAnimation = { initial: { scale: 1 }, animate: { scale: 1.1 } };
      const adaptive = animationUtils.createAdaptiveAnimation(normalAnimation);
      expect(adaptive).toBeDefined();
      expect(adaptive.initial).toBeDefined();
      expect(adaptive.animate).toBeDefined();
    });

    test('should have createEntranceAnimation function', () => {
      expect(typeof animationUtils.createEntranceAnimation).toBe('function');
      const entrance = animationUtils.createEntranceAnimation(0.5);
      expect(entrance).toBeDefined();
      expect(entrance.initial).toBeDefined();
      expect(entrance.animate).toBeDefined();
    });

    test('should have createExitAnimation function', () => {
      expect(typeof animationUtils.createExitAnimation).toBe('function');
      const exit = animationUtils.createExitAnimation(0.3);
      expect(exit).toBeDefined();
      expect(exit.initial).toBeDefined();
      expect(exit.exit).toBeDefined();
    });
  });

  describe('Base Transitions', () => {
    test('should have base transitions', () => {
      expect(formAnimations.baseTransitions).toBeDefined();
      expect(formAnimations.baseTransitions.fast).toBeDefined();
      expect(formAnimations.baseTransitions.normal).toBeDefined();
      expect(formAnimations.baseTransitions.slow).toBeDefined();
      expect(formAnimations.baseTransitions.spring).toBeDefined();
      expect(formAnimations.baseTransitions.bounce).toBeDefined();
    });
  });
}); 