import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PersonaSelectionPanel from '../components/PersonaSelectionPanel';
import { mockMaterial, mockIl8n } from './mockMaterial';
import { IAIPersona } from '../types';

describe('PersonaSelectionPanel', () => {
  const dummyPersonas: IAIPersona[] = [
    {
      id: 'persona-1',
      name: 'Agent Alpha',
      description: 'First agent with python skills',
      avatar: 'https://example.com/alpha.png',
      modelId: 'gpt-5.4',
      tags: ['python', 'backend'],
    } as any,
    {
      id: 'persona-2',
      name: 'Agent Beta',
      description: 'Second agent with react skills',
      avatar: 'https://example.com/beta.png',
      modelId: 'claude-3-sonnet',
      tags: ['react', 'frontend'],
    } as any,
  ];

  const onClose = jest.fn();
  const onPersonaSelect = jest.fn();
  const toCamelCaseLabel = (s: string) => s;

  beforeEach(() => {
    onClose.mockClear();
    onPersonaSelect.mockClear();
  });

  const renderPanel = (props = {}) =>
    render(
      <PersonaSelectionPanel
        open={true}
        onClose={onClose}
        personas={dummyPersonas}
        selectedPersona={dummyPersonas[0]}
        onPersonaSelect={onPersonaSelect}
        Material={mockMaterial}
        toCamelCaseLabel={toCamelCaseLabel}
        il8n={mockIl8n}
        {...props}
      />
    );

  it('renders the header and persona cards', () => {
    renderPanel();
    expect(screen.getByText('Select an Agent')).toBeInTheDocument();
    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
  });

  it('calls onPersonaSelect when a card is selected', () => {
    renderPanel();
    const chatButtons = screen.getAllByText('Chat');
    expect(chatButtons.length).toBe(2);
    fireEvent.click(chatButtons[1]);
    expect(onPersonaSelect).toHaveBeenCalledWith(dummyPersonas[1]);
  });

  it('calls onClose when the back button is clicked', () => {
    renderPanel();
    const backBtn = screen.getByLabelText('Close persona selection');
    fireEvent.click(backBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when personas list is empty', () => {
    renderPanel({ personas: [] });
    expect(screen.getByText('No personas available')).toBeInTheDocument();
  });

  it('filters personas by search input query', () => {
    renderPanel();
    const searchInput = screen.getByPlaceholderText('Search agents by name...');
    expect(searchInput).toBeInTheDocument();

    // Type "Beta" in search input
    fireEvent.change(searchInput, { target: { value: 'Beta' } });
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
    expect(screen.queryByText('Agent Alpha')).not.toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.click(clearBtn);
    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
  });

  it('filters personas using the TagCloud widget', () => {
    renderPanel();
    // Tags from personas: 'python', 'backend', 'react', 'frontend', 'gpt-5.4', 'claude-3-sonnet'
    const pythonTag = screen.getByText('python');
    expect(pythonTag).toBeInTheDocument();

    // Click 'python' tag chip
    fireEvent.click(pythonTag);
    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.queryByText('Agent Beta')).not.toBeInTheDocument();

    // Deselect 'python' tag chip
    fireEvent.click(pythonTag);
    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
  });

  it('shows no matches message and provides Clear filters button', () => {
    renderPanel();
    const searchInput = screen.getByPlaceholderText('Search agents by name...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentAgentXYZ' } });

    expect(screen.getByText('No agents match your search or filter')).toBeInTheDocument();

    const clearFiltersBtn = screen.getByText('Clear filters');
    fireEvent.click(clearFiltersBtn);

    expect(screen.getAllByText('Agent Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Agent Beta').length).toBeGreaterThan(0);
  });
});
