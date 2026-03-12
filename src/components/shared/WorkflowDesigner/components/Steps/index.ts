// Built-in Step Definitions
export { StartStepDefinition } from './Start/definition';
export { EndStepDefinition } from './End/definition';
export { TaskStepDefinition } from './Task/definition';
export { ConditionStepDefinition } from './Condition/definition';
export { ParallelStepDefinition } from './Parallel/definition';
export { JoinStepDefinition } from './Join/definition';

// Integration Step Definitions
export { GraphQLStepDefinition } from './GraphQL/definition';
export { RESTStepDefinition } from './REST/definition';
export { GRPCStepDefinition } from './GRPC/definition';
export { ServiceInvokeStepDefinition } from './ServiceInvoke/definition';

// Interaction Step Definitions
export { UserActivityStepDefinition } from './UserActivity/definition';

// Observability Step Definitions
export { TelemetryStepDefinition } from './Telemetry/definition';
export { LogStepDefinition } from './Log/definition';

// YAML-aligned Step Definitions
export { DelayStepDefinition } from './Delay/definition';
export { ValidationStepDefinition } from './Validation/definition';
export { DataTransformStepDefinition } from './DataTransform/definition';
export { ForEachStepDefinition } from './ForEach/definition';
export { CliCommandStepDefinition } from './CliCommand/definition';

import { StepDefinition } from '../../types';
import { StartStepDefinition } from './Start/definition';
import { EndStepDefinition } from './End/definition';
import { TaskStepDefinition } from './Task/definition';
import { ConditionStepDefinition } from './Condition/definition';
import { ParallelStepDefinition } from './Parallel/definition';
import { JoinStepDefinition } from './Join/definition';
import { GraphQLStepDefinition } from './GraphQL/definition';
import { RESTStepDefinition } from './REST/definition';
import { GRPCStepDefinition } from './GRPC/definition';
import { ServiceInvokeStepDefinition } from './ServiceInvoke/definition';
import { UserActivityStepDefinition } from './UserActivity/definition';
import { TelemetryStepDefinition } from './Telemetry/definition';
import { LogStepDefinition } from './Log/definition';
import { DelayStepDefinition } from './Delay/definition';
import { ValidationStepDefinition } from './Validation/definition';
import { DataTransformStepDefinition } from './DataTransform/definition';
import { ForEachStepDefinition } from './ForEach/definition';
import { CliCommandStepDefinition } from './CliCommand/definition';

/**
 * All available workflow step definitions
 */
export const ALL_STEP_DEFINITIONS: StepDefinition[] = [
  // Control flow
  StartStepDefinition,
  EndStepDefinition,
  
  // Actions
  TaskStepDefinition,
  CliCommandStepDefinition,
  
  // Logic
  ConditionStepDefinition,
  ValidationStepDefinition,
  DataTransformStepDefinition,
  
  // Flow control
  ParallelStepDefinition,
  JoinStepDefinition,
  DelayStepDefinition,
  ForEachStepDefinition,
  
  // Integration
  GraphQLStepDefinition,
  RESTStepDefinition,
  GRPCStepDefinition,
  ServiceInvokeStepDefinition,
  
  // Interaction
  UserActivityStepDefinition,
  
  // Observability
  TelemetryStepDefinition,
  LogStepDefinition,
];

/**
 * Get step definition by ID
 */
export function getStepDefinition(id: string): StepDefinition | undefined {
  return ALL_STEP_DEFINITIONS.find(step => step.id === id);
}

/**
 * Get step definitions by category
 */
export function getStepsByCategory(category: string): StepDefinition[] {
  return ALL_STEP_DEFINITIONS.filter(step => step.category === category);
}
