import { useState, useCallback } from 'react';
import { Point } from '../types';

export interface ConnectionCreationState {
  isCreating: boolean;
  sourceStepId: string | null;
  sourcePortId: string | null;
  sourcePortType: 'input' | 'output' | null;
  startPoint: Point | null;
  currentPoint: Point | null;
}

export interface UseConnectionCreationResult {
  connectionState: ConnectionCreationState;
  startConnection: (stepId: string, portId: string, portType: 'input' | 'output', startPoint: Point) => void;
  updateConnectionPreview: (currentPoint: Point) => void;
  endConnection: (targetStepId?: string, targetPortId?: string) => { 
    sourceStepId: string;
    sourcePortId: string;
    targetStepId: string;
    targetPortId: string;
  } | null;
  cancelConnection: () => void;
}

export function useConnectionCreation(): UseConnectionCreationResult {
  const [connectionState, setConnectionState] = useState<ConnectionCreationState>({
    isCreating: false,
    sourceStepId: null,
    sourcePortId: null,
    sourcePortType: null,
    startPoint: null,
    currentPoint: null
  });

  const startConnection = useCallback((stepId: string, portId: string, portType: 'input' | 'output', startPoint: Point) => {
    setConnectionState({
      isCreating: true,
      sourceStepId: stepId,
      sourcePortId: portId,
      sourcePortType: portType,
      startPoint,
      currentPoint: startPoint
    });
  }, []);

  const updateConnectionPreview = useCallback((currentPoint: Point) => {
    setConnectionState(prev => ({
      ...prev,
      currentPoint
    }));
  }, []);

  const endConnection = useCallback((targetStepId?: string, targetPortId?: string) => {
    const result = connectionState.isCreating && targetStepId && targetPortId ? {
      sourceStepId: connectionState.sourceStepId!,
      sourcePortId: connectionState.sourcePortId!,
      targetStepId,
      targetPortId
    } : null;

    setConnectionState({
      isCreating: false,
      sourceStepId: null,
      sourcePortId: null,
      sourcePortType: null,
      startPoint: null,
      currentPoint: null
    });

    return result;
  }, [connectionState]);

  const cancelConnection = useCallback(() => {
    setConnectionState({
      isCreating: false,
      sourceStepId: null,
      sourcePortId: null,
      sourcePortType: null,
      startPoint: null,
      currentPoint: null
    });
  }, []);

  return {
    connectionState,
    startConnection,
    updateConnectionPreview,
    endConnection,
    cancelConnection
  };
}

