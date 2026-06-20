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
export { FileOperationStepDefinition } from './FileOperation/definition';
export { WhileStepDefinition } from './While/definition';
export { CustomStepDefinition } from './Custom/definition';

// Logic / state Step Definitions
export { SetVariableStepDefinition } from './SetVariable/definition';

// Action Step Definitions
export { TodoStepDefinition } from './Todo/definition';

// Data / integration Step Definitions
export { EmailStepDefinition } from './Email/definition';
export { SearchStepDefinition } from './Search/definition';
export { MongoQueryStepDefinition } from './MongoQuery/definition';
export { MongoWriteStepDefinition } from './MongoWrite/definition';
export { UserLookupStepDefinition } from './UserLookup/definition';
export { MySQLStepDefinition } from './MySQL/definition';
export { PostgresStepDefinition } from './Postgres/definition';
export { MSSQLStepDefinition } from './MSSQL/definition';
export { GraphQLQueryStepDefinition } from './GraphQLQuery/definition';
export { GraphQLMutationStepDefinition } from './GraphQLMutation/definition';

// Flow control Step Definitions
export { SagaStepDefinition } from './Saga/definition';

// Interaction Step Definitions
export { WaitEventStepDefinition } from './WaitEvent/definition';

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
import { FileOperationStepDefinition } from './FileOperation/definition';
import { WhileStepDefinition } from './While/definition';
import { CustomStepDefinition } from './Custom/definition';
import { SetVariableStepDefinition } from './SetVariable/definition';
import { TodoStepDefinition } from './Todo/definition';
import { EmailStepDefinition } from './Email/definition';
import { SearchStepDefinition } from './Search/definition';
import { MongoQueryStepDefinition } from './MongoQuery/definition';
import { MongoWriteStepDefinition } from './MongoWrite/definition';
import { UserLookupStepDefinition } from './UserLookup/definition';
import { MySQLStepDefinition } from './MySQL/definition';
import { PostgresStepDefinition } from './Postgres/definition';
import { MSSQLStepDefinition } from './MSSQL/definition';
import { GraphQLQueryStepDefinition } from './GraphQLQuery/definition';
import { GraphQLMutationStepDefinition } from './GraphQLMutation/definition';
import { SagaStepDefinition } from './Saga/definition';
import { WaitEventStepDefinition } from './WaitEvent/definition';

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
  FileOperationStepDefinition,
  CustomStepDefinition,
  TodoStepDefinition,

  // Logic
  ConditionStepDefinition,
  ValidationStepDefinition,
  DataTransformStepDefinition,
  SetVariableStepDefinition,

  // Flow control
  ParallelStepDefinition,
  JoinStepDefinition,
  DelayStepDefinition,
  ForEachStepDefinition,
  WhileStepDefinition,
  SagaStepDefinition,

  // Integration
  GraphQLStepDefinition,
  RESTStepDefinition,
  GRPCStepDefinition,
  ServiceInvokeStepDefinition,
  EmailStepDefinition,
  SearchStepDefinition,
  MongoQueryStepDefinition,
  MongoWriteStepDefinition,
  UserLookupStepDefinition,
  MySQLStepDefinition,
  PostgresStepDefinition,
  MSSQLStepDefinition,
  GraphQLQueryStepDefinition,
  GraphQLMutationStepDefinition,

  // Interaction
  UserActivityStepDefinition,
  WaitEventStepDefinition,

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
