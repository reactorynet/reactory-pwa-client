/**
 * Renderers for the contract test harness — fork-vs-v5 parity assertions.
 *
 * Lives in a separate .tsx file so the rest of contractHarness.ts can stay
 * a pure Node module (fs/path) usable by tooling that doesn't need React.
 *
 * Both renderers mount a small harness component, capture `outerHTML`, and
 * extract observable signals (visible labels, surface error messages).
 *
 * Limitations (documented per fixture as `divergences` annotations):
 *   - Widgets that depend on Apollo/GraphQL or external services (Froala,
 *     Recharts, Google Maps, etc.) will not render fully under jsdom; these
 *     fixtures are expected to either skip via `divergences` or be tested
 *     with shallower assertions.
 *   - rjsf v5 default widgets (used in renderWithV5) are unstyled HTML
 *     inputs; the fork uses MUI. `normalizeHtml` from contractHarness.ts
 *     strips the cosmetic class differences but structural differences
 *     (e.g., a wrapping <div> around an input vs none) will surface as
 *     parity failures and need either a fixture annotation or a template
 *     adjustment.
 */

import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import type { ContractFixture, RenderResult } from './contractHarness';
import { useReactoryForm } from '../hooks/useReactoryForm';
import { createMockReactorySDK, type MockReactorySDK } from './mockReactorySDK';

/** Capture every label-like text from a rendered container. */
function extractLabels(container: Element): Set<string> {
  const labels = new Set<string>();
  container.querySelectorAll('label, legend, h4.array-field-title, h5.title-field, .object-field-title')
    .forEach((el) => {
      const text = (el.textContent ?? '').trim().replace(/\s*\*$/, '');
      if (text) labels.add(text);
    });
  return labels;
}

/** Capture text-form errors surfaced by the engine at render time. */
function extractErrors(container: Element): Array<{ path: string; message: string }> {
  const out: Array<{ path: string; message: string }> = [];
  container.querySelectorAll('[role="alert"]').forEach((el) => {
    const path = el.getAttribute('id') ?? '';
    out.push({ path, message: (el.textContent ?? '').trim() });
  });
  return out;
}

export interface RenderOptions {
  /** Override the mock SDK used (e.g., to register specific FQN components). */
  reactory?: MockReactorySDK;
  /** Whether to live-validate at render time. Default false. */
  liveValidate?: boolean;
}

/**
 * Render a fixture using the v5 engine via `useReactoryForm`.
 * Returns the captured HTML and observables; the caller is responsible for
 * calling cleanup (or relying on RTL's per-test cleanup).
 */
export async function renderWithV5(
  fixture: ContractFixture,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const reactory = options.reactory ?? createMockReactorySDK({
    featureFlags: { 'forms.useV5Engine': true },
  });

  const Harness: React.FC = () => {
    const { form } = useReactoryForm({
      schema: fixture.schema as any,
      uiSchema: fixture.uiSchema as any,
      formData: fixture.formData,
      formContext: { reactory: reactory as any },
      engine: 'v5',
      liveValidate: options.liveValidate,
    });
    return form;
  };

  let html = '';
  let labels = new Set<string>();
  let errors: Array<{ path: string; message: string }> = [];
  try {
    const { container, unmount } = render(<Harness />);
    html = container.innerHTML;
    labels = extractLabels(container);
    errors = extractErrors(container);
    unmount();
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    // Known classes of expected errors during Phase 2:
    //   - "No widget 'X' for type 'Y'" — fixture references a widget that
    //     hasn't been adapted yet (P2.10).
    //   - "No field 'X' for type 'Y'" — fixture references a custom field
    //     that hasn't been registered.
    // Surface these as a structured error in the result instead of throwing.
    errors = [{ path: '__render__', message: msg }];
    html = `<!-- v5 render skipped: ${msg.replace(/-->/g, '--&gt;')} -->`;
  }
  return { engine: 'v5', html, visibleLabels: labels, errors };
}

/**
 * Render a fixture using the legacy fork's `<SchemaForm>`.
 *
 * Mocking surface: the legacy SchemaForm chain reaches `useReactory()` from
 * `@reactory/client-core/api` and many MUI fields read the SDK off it.
 * Tests that exercise this renderer must `jest.mock('@reactory/client-core/api', …)`
 * **before** importing this module, returning the same SDK instance the
 * caller passes here as `options.reactory`.
 *
 * The renderer does not import the legacy SchemaForm at module-load time
 * (avoids triggering the full MUI field tree on import); it lazy-loads
 * via `require()` inside the render callsite.
 */
export async function renderWithFork(
  fixture: ContractFixture,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const reactory = options.reactory ?? createMockReactorySDK();

  // Lazy-load to keep the import graph light when only renderWithV5 is used.
  // Cast: the fork's SchemaForm has a sprawling prop interface we don't model
  // strictly here; the contract is "renders something for these inputs".
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LegacySchemaForm: React.ComponentType<Record<string, unknown>> =
    require('@reactory/client-core/components/reactory/form').default;

  const formContext = {
    reactory,
    formData: fixture.formData,
    formDef: { id: fixture.name, schema: fixture.schema, uiSchema: fixture.uiSchema },
    formInstanceId: 'contract-test',
    signature: `contract:${fixture.name}`,
    version: 0,
    screenBreakPoint: 'md' as const,
    i18n: reactory.i18n,
    refresh: () => undefined,
    reset: () => undefined,
    setFormData: async () => undefined,
    getData: async () => fixture.formData,
    $ref: { props: {} },
  };

  let html = '';
  let labels = new Set<string>();
  let errors: Array<{ path: string; message: string }> = [];

  try {
    const { container, unmount } = render(
      <LegacySchemaForm
        schema={fixture.schema}
        uiSchema={fixture.uiSchema ?? {}}
        formData={fixture.formData}
        formContext={formContext}
        ErrorList={() => null}
        showErrorList={false}
        liveValidate={options.liveValidate}
      />,
    );
    html = container.innerHTML;
    labels = extractLabels(container);
    errors = extractErrors(container);
    unmount();
  } catch (err) {
    // The fork's MUI field tree may crash under jsdom for fixtures that depend
    // on full theming/Apollo. Surface the error in the result so the test
    // can decide whether to fail or annotate as a divergence.
    html = `<!-- fork render failed: ${(err as Error).message} -->`;
  }

  return { engine: 'fork', html, visibleLabels: labels, errors };
}

/**
 * Test cleanup helper. Mirrors RTL's cleanup() so tests can call from afterEach.
 */
export function resetRenderers(): void {
  cleanup();
}
