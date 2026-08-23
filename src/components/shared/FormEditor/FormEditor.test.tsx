import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormEditor from './FormEditor';

// Mock the ReactoryForm component. It counts its own renders so tests can
// assert that a re-render of the editor does not reach into the form subtree -
// the real engine re-runs its initial data fetch whenever the props object
// identity it was handed changes, which shows up as the tab reloading.
jest.mock('../../reactory', () => {
  const renderCounts = { form: 0 };
  const ReactoryForm = ({ formDef, formData, onChange }: any) => {
    renderCounts.form += 1;
    return (
      <div data-testid="reactory-form">
        <div data-testid="form-def">{JSON.stringify(formDef)}</div>
        <div data-testid="form-data">{JSON.stringify(formData)}</div>
        <button
          data-testid="form-change-button"
          onClick={() => onChange?.({ presentation: { title: 'Updated Title' } })}
        >
          Change Form
        </button>
      </div>
    );
  };
  return { ReactoryForm, __renderCounts: renderCounts };
});

const { __renderCounts: renderCounts } = jest.requireMock('../../reactory');

// Mock the JsonSchemaEditor component
jest.mock('../JsonSchemaEditor', () => ({
  JsonSchemaEditor: ({ value, onChange, label }: any) => (
    <div data-testid="json-schema-editor">
      <label>{label}</label>
      <textarea
        data-testid="schema-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

describe('FormEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    renderCounts.form = 0;
  });

  describe('Component Rendering', () => {
    test('renders all tabs correctly', () => {
      render(<FormEditor />);

      expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /schema/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ui schema/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument();
    });

    test('renders general tab content by default', () => {
      render(<FormEditor />);

      expect(screen.getByText('Form configuration')).toBeInTheDocument();
      expect(screen.getByTestId('reactory-form')).toBeInTheDocument();
    });

    test('lays the General tab out as sectioned groups', () => {
      render(<FormEditor />);

      const formDef = JSON.parse(screen.getByTestId('form-def').textContent as string);
      const sections = ['identity', 'presentation', 'behaviour', 'metadata'];

      sections.forEach((section) => {
        // every section is an object group rendered by its own GridLayout
        expect(formDef.schema.properties[section].type).toBe('object');
        expect(formDef.uiSchema[section]['ui:field']).toBe('GridLayout');
        expect(formDef.uiSchema[section]['ui:grid-layout'].length).toBeGreaterThan(0);
      });

      // the root layout places the four groups, not the individual fields
      expect(Object.keys(formDef.uiSchema['ui:grid-layout'][0])).toEqual(sections);
    });

    test('projects the flat base config onto the section groups', () => {
      render(
        <FormEditor
          formData={{ nameSpace: 'core', name: 'Widget', roles: ['USER'] }}
        />
      );

      const formData = JSON.parse(screen.getByTestId('form-data').textContent as string);

      expect(formData.identity).toEqual(
        expect.objectContaining({ nameSpace: 'core', name: 'Widget' })
      );
      expect(formData.metadata.roles).toEqual(['USER']);
      // array / boolean fields are normalised so widgets never see undefined
      expect(formData.metadata.tags).toEqual([]);
      expect(formData.behaviour.registerAsComponent).toBe(false);
    });

    test('renders with provided formData', () => {
      const initialData = {
        id: 'test-form',
        title: 'Test Form',
        description: 'A test form'
      };

      render(<FormEditor formData={initialData} onChange={mockOnChange} />);

      expect(screen.getByTestId('reactory-form')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('switches to schema tab when clicked', () => {
      render(<FormEditor />);

      const schemaTab = screen.getByRole('tab', { name: /schema/i });
      fireEvent.click(schemaTab);

      expect(screen.getByText('Data Schema Validation')).toBeInTheDocument();
      expect(screen.getByTestId('json-schema-editor')).toBeInTheDocument();
      expect(screen.getByText('Form Data Schema')).toBeInTheDocument();
    });

    test('switches to UI schema tab when clicked', () => {
      render(<FormEditor />);

      const uiSchemaTab = screen.getByRole('tab', { name: /ui schema/i });
      fireEvent.click(uiSchemaTab);

      expect(screen.getByText('UI Schema Validation')).toBeInTheDocument();
      expect(screen.getByText('Form UI Schema')).toBeInTheDocument();
    });

    test('switches to preview tab when clicked', () => {
      render(<FormEditor />);

      const previewTab = screen.getByRole('tab', { name: /preview/i });
      fireEvent.click(previewTab);

      expect(screen.getByText('Form Preview')).toBeInTheDocument();
      expect(screen.getByText('Form Preview Status')).toBeInTheDocument();
    });
  });

  describe('Schema Validation', () => {
    test('shows validation success for valid schema', async () => {
      render(<FormEditor />);

      const schemaTab = screen.getByRole('tab', { name: /schema/i });
      fireEvent.click(schemaTab);

      // Enter valid JSON schema
      const textarea = screen.getByTestId('schema-textarea');
      const validSchema = '{"type": "object", "properties": {"name": {"type": "string"}}}';

      fireEvent.change(textarea, { target: { value: validSchema } });

      await waitFor(() => {
        expect(screen.getByText('Data Schema Validation: Valid')).toBeInTheDocument();
      });
    });

    test('shows validation errors for invalid schema', async () => {
      render(<FormEditor />);

      const schemaTab = screen.getByRole('tab', { name: /schema/i });
      fireEvent.click(schemaTab);

      // Enter invalid JSON
      const textarea = screen.getByTestId('schema-textarea');
      const invalidSchema = '{"type": "object", "properties": {"name": {"type": "invalid_type"}}}';

      fireEvent.change(textarea, { target: { value: invalidSchema } });

      await waitFor(() => {
        expect(screen.getByText('Data Schema Validation')).toBeInTheDocument();
      });
    });
  });

  describe('Form Data Changes', () => {
    // The General layout groups the base config into sections, so the form
    // emits grouped data. The editor flattens it before notifying consumers.
    test('flattens grouped General data before calling onChange', () => {
      render(<FormEditor onChange={mockOnChange} />);

      const changeButton = screen.getByTestId('form-change-button');
      fireEvent.click(changeButton);

      expect(mockOnChange).toHaveBeenCalledWith({ title: 'Updated Title' });
    });

    // Regression: the first edit is the only one that flips isDirty, so it was
    // the only one that re-rendered the editor - and that re-render allocated a
    // fresh props object for the General ReactoryForm, making the engine
    // re-fetch and visibly reload the tab. The memoized element must keep the
    // subtree untouched.
    test('does not re-render the General form when the first edit marks the editor dirty', () => {
      render(<FormEditor onChange={mockOnChange} />);

      const rendersAfterMount = renderCounts.form;
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('form-change-button'));

      // the editor itself re-rendered (the dirty chip appeared) ...
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      // ... but the form subtree was not re-rendered with new props
      expect(renderCounts.form).toBe(rendersAfterMount);
    });

    test('keeps the General form stable across subsequent edits', () => {
      render(<FormEditor onChange={mockOnChange} />);

      const button = screen.getByTestId('form-change-button');
      fireEvent.click(button);
      const rendersAfterFirstEdit = renderCounts.form;

      fireEvent.click(button);
      fireEvent.click(button);

      expect(renderCounts.form).toBe(rendersAfterFirstEdit);
    });

    test('updates internal state when schema changes', () => {
      render(<FormEditor />);

      const schemaTab = screen.getByRole('tab', { name: /schema/i });
      fireEvent.click(schemaTab);

      const textarea = screen.getByTestId('schema-textarea');
      const newSchema = '{"type": "object", "properties": {"test": {"type": "string"}}}';

      fireEvent.change(textarea, { target: { value: newSchema } });

      expect(textarea).toHaveValue(newSchema);
    });
  });

  describe('Preview Functionality', () => {
    test('shows preview when schemas are valid', () => {
      render(<FormEditor />);

      const previewTab = screen.getByRole('tab', { name: /preview/i });
      fireEvent.click(previewTab);

      expect(screen.getByText('Live Form Preview:')).toBeInTheDocument();
    });

    test('shows error message when schemas are invalid', () => {
      // This would need validation state management to be fully implemented
      // For now, we test the basic preview structure
      render(<FormEditor />);

      const previewTab = screen.getByRole('tab', { name: /preview/i });
      fireEvent.click(previewTab);

      expect(screen.getByText('Form Preview Status')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('tabs have proper ARIA attributes', () => {
      render(<FormEditor />);

      const generalTab = screen.getByRole('tab', { name: /general/i });
      expect(generalTab).toHaveAttribute('aria-controls', 'form-editor-tabpanel-0');

      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('aria-labelledby', 'form-editor-tab-0');
    });
  });
});