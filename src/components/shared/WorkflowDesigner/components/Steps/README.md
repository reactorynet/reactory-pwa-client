# Workflow Steps

This folder contains modular step definitions for the Workflow Designer. Each step type is organized in its own folder with a standardized structure.

## Structure

Each step folder contains:
- `definition.ts` - The step definition with ports, schema, and configuration
- `index.ts` - Exports for the step
- Optional: Custom component implementations, validators, or executors

## Step Categories

### Control Flow
- **Start** - Entry point for workflows
- **End** - Termination point with return values

### Actions
- **Task** - Generic task execution step

### Logic
- **Condition** - Conditional branching based on expressions

### Flow Control
- **Parallel** - Execute multiple branches concurrently
- **Join** - Synchronize parallel branches

### Integration
- **GraphQL** - Execute GraphQL queries and mutations
- **REST** - Call REST APIs with full HTTP method support
- **gRPC** - Invoke gRPC services
- **Service Invoke** - Call registered Reactory services

### Interaction
- **User Activity** - Manual user activities, approvals, and form input

### Observability
- **Telemetry** - Record metrics, traces, and logs

## Adding New Steps

To add a new step:

1. Create a new folder with the step name
2. Create `definition.ts` with the step configuration:

```typescript
import { StepDefinition, PortType } from '../../../types';

export const MyStepDefinition: StepDefinition = {
  id: 'my_step',
  name: 'My Step',
  category: 'action',
  description: 'Description of what this step does',
  icon: 'icon_name',
  color: '#hexcolor',
  inputPorts: [...],
  outputPorts: [...],
  propertySchema: {...},
  defaultProperties: {...},
  tags: [...]
};
```

3. Create `index.ts` to export the definition
4. Add to the `ALL_STEP_DEFINITIONS` array in `index.ts`

## Step Properties

Each step definition includes:

- **id**: Unique identifier
- **name**: Display name
- **category**: Organizational category
- **description**: User-facing description
- **icon**: Material icon name
- **color**: Hex color for visual identification
- **inputPorts**: Array of input port definitions
- **outputPorts**: Array of output port definitions
- **propertySchema**: JSON Schema for step configuration
- **defaultProperties**: Default property values
- **tags**: Searchable tags for filtering

## Port Types

Available port types from `PortType` enum:
- `CONTROL_INPUT` - Control flow input
- `CONTROL_OUTPUT` - Control flow output
- `INPUT` - Data input
- `OUTPUT` - Data output

## Usage

Import all steps:
```typescript
import { ALL_STEP_DEFINITIONS } from './components/Steps';
```

Import specific steps:
```typescript
import { GraphQLStepDefinition, RESTStepDefinition } from './components/Steps';
```

Get step by ID:
```typescript
import { getStepDefinition } from './components/Steps';
const stepDef = getStepDefinition('graphql');
```

Get steps by category:
```typescript
import { getStepsByCategory } from './components/Steps';
const integrationSteps = getStepsByCategory('integration');
```
