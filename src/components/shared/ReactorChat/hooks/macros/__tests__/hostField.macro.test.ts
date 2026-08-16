import {
  HostFieldsMacroDefinition,
  HostFieldUpdateMacroDefinition,
} from '../hostField.macro';
import { HostEditableField } from '../../../types';

/**
 * The host field macros are the agent's only route into the application it is
 * embedded in, so the contract they enforce matters more than most: a wrong
 * key must be correctable rather than fatal, a read-only field must stay
 * read-only, and a chat with no host must degrade to an explanation instead of
 * an error.
 */

const reactory: any = { utils: { uuid: () => 'test-id' } };

const listFields = HostFieldsMacroDefinition.component as any;
const updateField = HostFieldUpdateMacroDefinition.component as any;

const makeHost = (fields: HostEditableField[]) => {
  const applied: Array<{ key: string; data: unknown }> = [];
  const chatState: any = {
    hostBindings: {
      getFields: () => fields,
      applyChange: (key: string, data: unknown) => {
        const field = fields.find((f) => f.key === key);
        if (!field) return { accepted: false, message: `"${key}" is not an editable field.` };
        if (field.readOnly) return { accepted: false, message: `"${key}" is read-only.` };
        applied.push({ key, data });
        return { accepted: true };
      },
    },
  };
  return { chatState, applied };
};

const FIELDS: HostEditableField[] = [
  { key: 'content', description: 'The body of the document', type: 'string', value: '# Hello' },
  { key: 'title', description: 'The document title', type: 'string', value: 'Hi' },
  { key: 'slug', description: 'The identifier', type: 'string', value: 'about', readOnly: true },
];

describe('host_fields macro', () => {
  it('lists the keys and descriptions the host offered', async () => {
    const { chatState } = makeHost(FIELDS);
    const result = await listFields([], chatState, reactory);

    expect(result.content).toContain('content');
    expect(result.content).toContain('The body of the document');
    expect(result.content).toContain('title');
  });

  it('reports current values so the agent can revise rather than replace', async () => {
    const { chatState } = makeHost(FIELDS);
    const result = await listFields([], chatState, reactory);
    expect(result.content).toContain('# Hello');
  });

  it('flags read-only fields', async () => {
    const { chatState } = makeHost(FIELDS);
    const result = await listFields([], chatState, reactory);
    expect(result.content).toContain('readOnly');
  });

  it('truncates a very large value instead of flooding the context', async () => {
    const big = 'x'.repeat(5000);
    const { chatState } = makeHost([
      { key: 'content', description: 'Body', type: 'string', value: big },
    ]);
    const result = await listFields([], chatState, reactory);

    expect(result.content).toContain('truncated');
    expect(result.content.length).toBeLessThan(4000);
    // The true length is still reported, so the agent knows what it is dealing with.
    expect(result.content).toContain('5000');
  });

  it('explains itself when the chat is not embedded in a host', async () => {
    const result = await listFields([], {} as any, reactory);
    expect(result.content).toContain('not embedded');
  });

  it('says so when the host offered no fields', async () => {
    const { chatState } = makeHost([]);
    const result = await listFields([], chatState, reactory);
    expect(result.content).toContain('has not opened any fields');
  });
});

describe('host_field_update macro', () => {
  it('applies a value to the named field', async () => {
    const { chatState, applied } = makeHost(FIELDS);
    await updateField({ key: 'content', value: '# Updated' }, chatState, reactory);

    expect(applied).toEqual([{ key: 'content', data: '# Updated' }]);
  });

  it('accepts arguments passed positionally', async () => {
    // Tool arguments arrive either as an object or wrapped in an array,
    // depending on how the call was serialised.
    const { chatState, applied } = makeHost(FIELDS);
    await updateField([{ key: 'title', value: 'New title' }], chatState, reactory);

    expect(applied).toEqual([{ key: 'title', data: 'New title' }]);
  });

  it('lists the valid keys when given an unknown one', async () => {
    const { chatState, applied } = makeHost(FIELDS);
    const result = await updateField({ key: 'nonsense', value: 'x' }, chatState, reactory);

    expect(applied).toEqual([]);
    // A correctable mistake, not a dead end.
    expect(result.content).toContain('no editable field called "nonsense"');
    expect(result.content).toContain('content');
    expect(result.content).toContain('title');
  });

  it('refuses to write a read-only field', async () => {
    const { chatState, applied } = makeHost(FIELDS);
    const result = await updateField({ key: 'slug', value: 'hacked' }, chatState, reactory);

    expect(applied).toEqual([]);
    expect(result.content).toContain('read-only');
  });

  it('asks for a key when none was supplied', async () => {
    const { chatState } = makeHost(FIELDS);
    const result = await updateField({ value: 'orphan' }, chatState, reactory);
    expect(result.content).toContain('No field key');
  });

  it('asks for a value when none was supplied', async () => {
    const { chatState, applied } = makeHost(FIELDS);
    const result = await updateField({ key: 'content' }, chatState, reactory);

    expect(applied).toEqual([]);
    expect(result.content).toContain('No value');
  });

  it('reports a host rejection rather than claiming success', async () => {
    const chatState: any = {
      hostBindings: {
        getFields: () => FIELDS,
        applyChange: () => ({ accepted: false, message: 'the editor is closed' }),
      },
    };

    const result = await updateField({ key: 'content', value: 'x' }, chatState, reactory);
    expect(result.content).toContain('rejected');
    expect(result.content).toContain('the editor is closed');
  });

  it('surfaces a host exception as a message, not a thrown error', async () => {
    const chatState: any = {
      hostBindings: {
        getFields: () => FIELDS,
        applyChange: () => {
          throw new Error('boom');
        },
      },
    };

    const result = await updateField({ key: 'content', value: 'x' }, chatState, reactory);
    expect(result.content).toContain('boom');
  });

  it('tells the agent the change is unsaved', async () => {
    const { chatState } = makeHost(FIELDS);
    const result = await updateField({ key: 'content', value: '# Updated' }, chatState, reactory);
    expect(result.content).toContain('not saved');
  });

  it('explains itself when the chat is not embedded in a host', async () => {
    const result = await updateField({ key: 'content', value: 'x' }, {} as any, reactory);
    expect(result.content).toContain('not embedded');
  });
});

describe('tool declarations', () => {
  it('exposes discovery as a safe, auto-executable read', () => {
    const tool = HostFieldsMacroDefinition.tools[0];
    expect(tool.function.name).toBe('host_fields');
    expect(tool.safeForAutoExecution).toBe(true);
    expect(tool.runat).toBe('client');
  });

  it('does not auto-execute writes', () => {
    const tool = HostFieldUpdateMacroDefinition.tools[0];
    expect(tool.function.name).toBe('host_field_update');
    // Rewriting what the user is working on goes through tool approval.
    expect(tool.safeForAutoExecution).toBe(false);
    expect(tool.runat).toBe('client');
  });

  it('requires both key and value on the update tool', () => {
    const tool = HostFieldUpdateMacroDefinition.tools[0];
    expect(tool.function.parameters.required).toEqual(['key', 'value']);
    expect(Object.keys(tool.function.parameters.properties)).toEqual(['key', 'value']);
  });

  it('matches each tool name to its macro alias, which is how calls resolve', () => {
    expect(HostFieldsMacroDefinition.alias).toBe(HostFieldsMacroDefinition.tools[0].function.name);
    expect(HostFieldUpdateMacroDefinition.alias).toBe(
      HostFieldUpdateMacroDefinition.tools[0].function.name
    );
  });

  it('tells the agent to discover fields before writing', () => {
    expect(HostFieldUpdateMacroDefinition.tools[0].function.description).toContain('host_fields');
  });

  it('warns the agent to preserve component tags', () => {
    expect(HostFieldUpdateMacroDefinition.tools[0].function.description).toContain('<reactory');
  });
});

describe('registry wiring', () => {
  it('registers both macros as client macros', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const macros = require('../index').default;
    const aliases = macros.map((m: any) => m.alias);

    expect(aliases).toContain('host_fields');
    expect(aliases).toContain('host_field_update');
    expect(
      macros.filter((m: any) => m.alias?.startsWith('host_')).every((m: any) => m.runat === 'client')
    ).toBe(true);
  });
});
