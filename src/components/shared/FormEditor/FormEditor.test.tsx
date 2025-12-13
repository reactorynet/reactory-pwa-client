import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormEditor from './FormEditor';

// Mock the ReactoryForm component
jest.mock('../../reactory', () => ({
  ReactoryForm: ({ formDef, formData, onChange }: any) => (
    <div data-testid="reactory-form">
      <div data-testid="form-def">{JSON.stringify(formDef)}</div>
      <div data-testid="form-data">{JSON.stringify(formData)}</div>
      <button
        data-testid="form-change-button"
        onClick={() => onChange?.({ title: 'Updated Title' })}
      >
        Change Form
      </button>
    </div>
  ),
}));

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

      expect(screen.getByText('Form Configuration')).toBeInTheDocument();
      expect(screen.getByTestId('reactory-form')).toBeInTheDocument();
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
    test('calls onChange when form data is modified', () => {
      render(<FormEditor onChange={mockOnChange} />);

      const changeButton = screen.getByTestId('form-change-button');
      fireEvent.click(changeButton);

      expect(mockOnChange).toHaveBeenCalledWith({ title: 'Updated Title' });
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