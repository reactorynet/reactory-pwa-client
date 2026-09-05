import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolsPanel from '../components/ToolsPanel';
import { mockMaterial, mockIl8n } from './mockMaterial';
import { ChatState, ToolApprovalMode } from '../types';

jest.mock('../components/ModelSelector', () => () => <div data-testid="model-selector" />);

describe('ToolsPanel Toolbelt & Collection Selection', () => {
  const dummyTools = [
    {
      type: 'function',
      category: 'Development',
      function: {
        name: 'readFile',
        description: 'Read a file from disk',
      },
    },
    {
      type: 'function',
      category: 'Development',
      function: {
        name: 'writeFile',
        description: 'Write a file to disk',
      },
    },
    {
      type: 'function',
      category: 'Playwright',
      function: {
        name: 'playwright_navigate',
        description: 'Navigate to a URL',
      },
    },
    {
      type: 'function',
      category: 'Playwright',
      function: {
        name: 'playwright_click',
        description: 'Click an element',
      },
    },
  ];

  const dummyPersona = {
    id: 'ReactorAIPersona',
    name: 'Reactor',
    tools: dummyTools,
    toolProfiles: [
      {
        name: 'Dev Toolbelt',
        description: 'File development tools',
        tools: ['readFile', 'writeFile'],
      },
      {
        name: 'Browser Toolbelt',
        description: 'Browser automation tools',
        tools: ['playwright_navigate', 'playwright_click'],
      },
    ],
  };

  const dummyChatState: ChatState = {
    id: 'chat-123',
    botId: 'bot-1',
    persona: dummyPersona as any,
    started: new Date(),
    history: [],
    vars: {},
    tools: dummyTools as any,
    sendMessage: jest.fn(),
  };

  const onClose = jest.fn();
  const onStreamingToggle = jest.fn();
  const onToolApprovalModeChange = jest.fn();
  const onToolToggle = jest.fn();
  const onToolsChange = jest.fn();
  const onToolExecute = jest.fn();
  const onModelChange = jest.fn();

  const mockReactory = {
    muiTheme: { palette: { mode: 'dark' } },
    log: () => {},
    utils: { uuid: () => 'test-uuid' },
    getComponents: () => ({
      Material: mockMaterial,
      Markdown: () => null,
      MarkdownGfm: () => null,
      DOMPurify: {},
      PrismCode: () => null,
    }),
    getComponent: () => null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderToolsPanel = (props: any = {}) => {
    return render(
      <ToolsPanel
        open={true}
        onClose={onClose}
        chatState={dummyChatState}
        streamingEnabled={true}
        isStreaming={false}
        enabledTools={new Set(['readFile', 'writeFile', 'playwright_navigate', 'playwright_click'])}
        onStreamingToggle={onStreamingToggle}
        onToolApprovalModeChange={onToolApprovalModeChange}
        onToolToggle={onToolToggle}
        onToolsChange={onToolsChange}
        onToolExecute={onToolExecute}
        modelOverride={null}
        onModelChange={onModelChange}
        Material={mockMaterial}
        toCamelCaseLabel={(s) => s}
        getToolIcon={() => 'code'}
        il8n={mockIl8n}
        reactory={mockReactory}
        {...props}
      />
    );
  };

  it('surfaces pre-defined tool profiles (toolbelts) and All Tools', () => {
    renderToolsPanel();
    expect(screen.getByText('Tool Collections (Toolbelts)')).toBeInTheDocument();
    expect(screen.getAllByText(/Dev Toolbelt/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Browser Toolbelt/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/All Tools/).length).toBeGreaterThan(0);
  });

  it('switches tool collection for the session when a toolbelt chip is clicked', () => {
    renderToolsPanel();
    // Click on the Dev Toolbelt chip in the quick-switch bar
    const devChip = screen.getByText('Dev Toolbelt (2/2)');
    fireEvent.click(devChip);

    expect(onToolsChange).toHaveBeenCalledWith(['readFile', 'writeFile']);
  });

  it('switches tool collection when "Select Toolbelt" button is clicked in an accordion', () => {
    // With only dev tools enabled, Browser Toolbelt is not active and should show "Select Toolbelt"
    renderToolsPanel({
      enabledTools: new Set(['readFile', 'writeFile']),
    });

    const selectButtons = screen.getAllByText('Select Toolbelt');
    expect(selectButtons.length).toBeGreaterThan(0);

    fireEvent.click(selectButtons[0]);
    expect(onToolsChange).toHaveBeenCalled();
  });

  it('shows Active Toolbelt indicator when enabled tools match the profile', () => {
    renderToolsPanel({
      enabledTools: new Set(['readFile', 'writeFile']),
    });

    expect(screen.getByText('Active Toolbelt')).toBeInTheDocument();
  });

  it('auto-derives category-based tool profiles when persona has no toolProfiles', () => {
    const chatStateNoProfiles: ChatState = {
      ...dummyChatState,
      persona: {
        id: 'CustomAgent',
        name: 'Custom Agent',
        tools: dummyTools,
      } as any,
    };

    renderToolsPanel({
      chatState: chatStateNoProfiles,
    });

    expect(screen.getAllByText(/Development Tools/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Playwright Tools/).length).toBeGreaterThan(0);
  });

  it('keeps all tools in a profile visible even when disabled so users can toggle them', () => {
    renderToolsPanel({
      enabledTools: new Set(['readFile']), // writeFile is disabled
    });

    // Both readFile and writeFile should still be rendered in the DOM
    expect(screen.getAllByText('readFile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('writeFile').length).toBeGreaterThan(0);
  });

  it('allows fine-tuning with Enable All and Disable All inside a toolbelt', () => {
    renderToolsPanel();
    const enableAllButtons = screen.getAllByText('Enable All');
    fireEvent.click(enableAllButtons[0]);
    expect(onToolsChange).toHaveBeenCalled();

    const disableAllButtons = screen.getAllByText('Disable All');
    fireEvent.click(disableAllButtons[0]);
    expect(onToolsChange).toHaveBeenCalled();
  });
});
