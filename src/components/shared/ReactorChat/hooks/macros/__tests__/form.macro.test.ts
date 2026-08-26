import FormMacroDefinition from '../form.macro';

const mockUuid = 'test-uuid-5678';
const createMockContext = () => {
  const formSchemas: any[] = [];
  const sidePanelItems: any[] = [];
  let nextUuidCounter = 1;

  const mockSidePanel = {
    addItem: jest.fn((item) => sidePanelItems.push(item)),
    updateItem: jest.fn((id, updates) => {
      const idx = sidePanelItems.findIndex((i) => i.id === id);
      if (idx >= 0) sidePanelItems[idx] = { ...sidePanelItems[idx], ...updates };
    }),
    removeItem: jest.fn((id) => {
      const idx = sidePanelItems.findIndex((i) => i.id === id);
      if (idx >= 0) sidePanelItems.splice(idx, 1);
    }),
    getState: jest.fn(() => ({ items: sidePanelItems })),
  };

  const mockChatState: any = {
    id: 'chat-123',
    sidePanel: mockSidePanel,
    sendMessage: jest.fn(),
  };

  const reactory: any = {
    formSchemas,
    utils: {
      uuid: () => `uuid-${nextUuidCounter++}`,
    },
    error: jest.fn(),
  };

  return { mockChatState, reactory, formSchemas, sidePanelItems };
};

const formMacro = FormMacroDefinition.component as any;

describe('form.macro', () => {
  it('has correct definition properties for client-side tool discovery', () => {
    expect(FormMacroDefinition.name).toBe('FormMacro');
    expect(FormMacroDefinition.alias).toBe('form');
    expect(FormMacroDefinition.runat).toBe('client');
    expect(FormMacroDefinition.tools).toBeDefined();
    expect(FormMacroDefinition.tools?.[0]?.function.name).toBe('form');
    expect(FormMacroDefinition.tools?.[0]?.runat).toBe('client');
    expect(FormMacroDefinition.tools?.[0]?.safeForAutoExecution).toBe(true);
  });

  describe('action: list', () => {
    it('returns message when no schemas are registered', async () => {
      const { mockChatState, reactory } = createMockContext();
      const result = await formMacro({ action: 'list' }, mockChatState, reactory);

      expect(result.role).toBe('assistant');
      expect(result.content).toContain('No form schemas are currently registered');
    });

    it('returns markdown table of registered form schemas', async () => {
      const { mockChatState, reactory, formSchemas } = createMockContext();
      formSchemas.push(
        { id: 'core.FeedbackForm@1.0.0', title: 'User Feedback' },
        { id: 'google.GmailComposeForm@1.0.0', title: 'Compose Email' },
      );

      const result = await formMacro({ action: 'list' }, mockChatState, reactory);

      expect(result.content).toContain('**Registered form schemas** (2 total):');
      expect(result.content).toContain('`core.FeedbackForm@1.0.0`');
      expect(result.content).toContain('User Feedback');
      expect(result.content).toContain('`google.GmailComposeForm@1.0.0`');
    });
  });

  describe('action: search', () => {
    it('requires query parameter', async () => {
      const { mockChatState, reactory } = createMockContext();
      const result = await formMacro({ action: 'search' }, mockChatState, reactory);

      expect(result.content).toContain('`query` is required');
    });

    it('finds matching schemas by query', async () => {
      const { mockChatState, reactory, formSchemas } = createMockContext();
      formSchemas.push(
        { id: 'core.FeedbackForm@1.0.0', title: 'User Feedback', description: 'Collect user feedback' },
        { id: 'google.GmailComposeForm@1.0.0', title: 'Compose Email' },
      );

      const result = await formMacro({ action: 'search', query: 'feedback' }, mockChatState, reactory);

      expect(result.content).toContain('Search results for "feedback"');
      expect(result.content).toContain('`core.FeedbackForm@1.0.0`');
      expect(result.content).not.toContain('GmailComposeForm');
    });
  });

  describe('action: register', () => {
    it('registers a schema into reactory.formSchemas', async () => {
      const { mockChatState, reactory, formSchemas } = createMockContext();
      const schema = {
        type: 'object',
        properties: {
          comments: { type: 'string', title: 'Comments' },
        },
      };

      const result = await formMacro({
        action: 'register',
        name: 'MyCustomForm',
        nameSpace: 'custom',
        version: '1.0.0',
        title: 'Custom Form',
        schema,
      }, mockChatState, reactory);

      expect(result.content).toContain('registered');
      expect(formSchemas.length).toBe(1);
      expect(formSchemas[0].title).toBe('Custom Form');
    });
  });

  describe('action: add (default)', () => {
    it('mounts a form in the side panel with default parameters', async () => {
      const { mockChatState, reactory } = createMockContext();
      const result = await formMacro({
        title: 'User Survey',
        schema: {
          type: 'object',
          properties: {
            rating: { type: 'number', title: 'Rating' },
          },
        },
      }, mockChatState, reactory);

      expect(mockChatState.sidePanel.addItem).toHaveBeenCalled();
      expect(result.content).toContain('Opened form **User Survey** in the side panel');
    });
  });

  describe('action: update', () => {
    it('updates an existing form in the side panel by referenceId', async () => {
      const { mockChatState, reactory } = createMockContext();
      const result = await formMacro({
        action: 'update',
        referenceId: 'form-ref-1',
        title: 'Updated Survey',
      }, mockChatState, reactory);

      expect(mockChatState.sidePanel.updateItem).toHaveBeenCalledWith(
        'form-ref-1',
        expect.objectContaining({ title: 'Updated Survey' }),
      );
      expect(result.content).toContain('Updated form "form-ref-1" in the side panel');
    });
  });

  describe('action: remove', () => {
    it('removes a form from the side panel by referenceId', async () => {
      const { mockChatState, reactory } = createMockContext();
      const result = await formMacro({
        action: 'remove',
        referenceId: 'form-ref-1',
      }, mockChatState, reactory);

      expect(mockChatState.sidePanel.removeItem).toHaveBeenCalledWith('form-ref-1');
      expect(result.content).toContain('Removed form "form-ref-1" from the side panel');
    });
  });
});
