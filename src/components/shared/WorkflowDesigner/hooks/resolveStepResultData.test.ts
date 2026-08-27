import { resolveStepResultData } from './useWorkflowInstance';

describe('resolveStepResultData', () => {
  it('resolves step results using designerStepId', () => {
    const data = {
      stepResults: {
        logStart: { message: 'Hello' },
      },
    };
    const pointer = { stepId: 1, stepName: 'Log Start' };
    const result = resolveStepResultData(data, pointer, 'logStart');
    expect(result).toEqual({ message: 'Hello' });
  });

  it('resolves step results when stepName is formatted with spaces and camelCase key is used', () => {
    const data = {
      stepResults: {
        catalogProject: { status: 'ok' },
      },
    };
    const pointer = { stepId: 2, stepName: 'Catalog Project' };
    const result = resolveStepResultData(data, pointer);
    expect(result).toEqual({ status: 'ok' });
  });

  it('falls back to outputs if stepResults does not contain the key', () => {
    const data = {
      stepResults: {},
      outputs: {
        indexProjectContent: { indexed: true },
      },
    };
    const pointer = { stepId: 3, stepName: 'Index Project Content' };
    const result = resolveStepResultData(data, pointer, 'indexProjectContent');
    expect(result).toEqual({ indexed: true });
  });

  it('returns undefined if no matching step result is found', () => {
    const data = {
      stepResults: {
        otherStep: { foo: 'bar' },
      },
    };
    const pointer = { stepId: 99, stepName: 'Non Existent' };
    const result = resolveStepResultData(data, pointer, 'nonExistent');
    expect(result).toBeUndefined();
  });
});
