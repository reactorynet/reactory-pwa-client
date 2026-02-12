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

/**
 * All available workflow step definitions
 */
export const ALL_STEP_DEFINITIONS: StepDefinition[] = [
  // Control flow
  StartStepDefinition,
  EndStepDefinition,
  
  // Actions
  TaskStepDefinition,
  
  // Logic
  ConditionStepDefinition,
  
  // Flow control
  ParallelStepDefinition,
  JoinStepDefinition,
  
  // Integration
  GraphQLStepDefinition,
  RESTStepDefinition,
  GRPCStepDefinition,
  ServiceInvokeStepDefinition,
  
  // Interaction
  UserActivityStepDefinition,
  
  // Observability
  TelemetryStepDefinition,
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
