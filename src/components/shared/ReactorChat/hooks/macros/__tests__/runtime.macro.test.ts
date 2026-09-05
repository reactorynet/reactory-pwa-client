import RuntimeMacroDefinition from '../runtime.macro';
import { ChatState } from '../../../../types';

describe('runtime.macro (macros tool)', () => {
  const runtimeMacro = RuntimeMacroDefinition.component as any;

  const mockReactory = {
    utils: {
      uuid: () => 'uuid-1234',
    },
    getUser: () => ({
      id: 'user-1',
      roles: ['USER'],
    }),
  };

  const sampleTools = [
    {
      type: 'function',
      function: {
        name: 'readFile',
        description: 'Read a file',
      },
    },
    {
      type: 'function',
      function: {
        name: 'shell',
        description: 'Run shell command',
      },
    },
  ];

  const sampleMacros = [
    {
      name: 'readFile',
      alias: 'readFile',
      nameSpace: 'reactor-macros',
      roles: ['USER'],
      tools: [
        {
          type: 'function',
          function: { name: 'readFile' },
        },
      ],
    },
    {
      name: 'shell',
      alias: 'shell',
      nameSpace: 'reactor-macros',
      roles: ['ADMIN'], // requires ADMIN, current user only has USER
      tools: [
        {
          type: 'function',
          function: { name: 'shell' },
        },
      ],
    },
    {
      name: 'jiraGetIssue',
      alias: 'jiraGetIssue',
      nameSpace: 'reactor-macros',
      roles: ['USER'],
      tools: [
        {
          type: 'function',
          function: { name: 'jiraGetIssue' }, // Not in active tools
        },
      ],
    },
    {
      name: 'macros',
      alias: 'macros',
      nameSpace: 'core',
      roles: ['USER'],
      runat: 'client',
    },
  ];

  it('has correct definition properties', () => {
    expect(RuntimeMacroDefinition.name).toBe('macros');
    expect(RuntimeMacroDefinition.alias).toBe('macros');
    expect(RuntimeMacroDefinition.runat).toBe('client');
    expect(RuntimeMacroDefinition.tools?.[0]?.function.name).toBe('macros');
  });

  it('action=list filters macros to only active tools and user roles', async () => {
    const chatState: any = {
      tools: sampleTools,
      macros: sampleMacros,
    };

    const result = await runtimeMacro({ action: 'list' }, chatState, mockReactory);

    expect(result).toBeDefined();
    expect(result.content).toContain('Available Macros:');
    expect(result.content).toContain('Available Tools:');

    const [macrosSection, toolsSection] = result.content.split('Available Tools:');
    // readFile is active and user has USER role -> should be listed
    expect(macrosSection).toContain('readFile');
    // macros is client utility with USER role -> should be listed
    expect(macrosSection).toContain('macros');

    // shell requires ADMIN role, but user has USER -> should NOT be listed in macros
    expect(macrosSection).not.toContain('- shell');

    // jiraGetIssue is not in active tools -> should NOT be listed in macros
    expect(macrosSection).not.toContain('jiraGetIssue');

    // Available Tools section contains the session tools
    expect(toolsSection).toContain('readFile');
    expect(toolsSection).toContain('shell');
  });

  it('action=details returns full metadata for a specific macro by name', async () => {
    const chatState: any = {
      tools: sampleTools,
      macros: sampleMacros,
    };

    const result = await runtimeMacro(
      { action: 'details', macro: { name: 'readFile' } },
      chatState,
      mockReactory
    );

    expect(result.content).toContain('Macro Details:');
    expect(result.content).toContain('reactor-macros');
    expect(result.content).toContain('readFile');
  });

  it('action=details returns full metadata for a specific tool by name', async () => {
    const chatState: any = {
      tools: sampleTools,
      macros: sampleMacros,
    };

    const result = await runtimeMacro(
      { action: 'details', tool: { name: 'readFile' } },
      chatState,
      mockReactory
    );

    expect(result.content).toContain('Tool Details:');
    expect(result.content).toContain('Read a file');
  });

  it('action=add appends or updates a macro in chatState.macros array', async () => {
    const chatState: any = {
      tools: [],
      macros: [...sampleMacros],
    };

    const newMacro = {
      name: 'customMacro',
      alias: 'customMacro',
      nameSpace: 'custom',
      roles: ['USER'],
    };

    const result = await runtimeMacro(
      { action: 'add', macro: newMacro },
      chatState,
      mockReactory
    );

    expect(result.content).toContain('Macro "customMacro" added.');
    expect(chatState.macros.some((m: any) => m.name === 'customMacro')).toBe(true);
  });
});
