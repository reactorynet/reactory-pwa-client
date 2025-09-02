import { useReactory } from "@reactory/client-core/api";
import { useState, useCallback } from 'react';
import WorkflowDesigner from '../WorkflowDesigner';
import { WorkflowDefinition, WorkflowStepDefinition, Point } from '../types';
import { generateStepId, generateConnectionId } from '../utils';

export default function PerformanceDemo() {
  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useState: useStateReact, useCallback: useCallbackReact } = React;
  const { Box, Paper, Typography, Button, ButtonGroup, Chip } = Material.MaterialCore;

  const [definition, setDefinition] = useStateReact<WorkflowDefinition>({
    id: 'performance-test',
    namespace: 'user',
    name: 'Performance Test Workflow',
    version: '1.0.0',
    description: 'Testing performance with many steps',
    steps: [],
    connections: [],
    variables: [],
    configuration: {},
    metadata: {}
  });

  // Generate a large workflow for testing
  const generateLargeWorkflow = useCallbackReact((stepCount: number) => {
    const steps: WorkflowStepDefinition[] = [];
    const connections = [];
    
    // Create a grid layout of steps
    const gridSize = Math.ceil(Math.sqrt(stepCount));
    const stepSpacing = 250;
    
    for (let i = 0; i < stepCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const stepTypes = ['start', 'task', 'condition', 'end'];
      const stepType = i === 0 ? 'start' : 
                     i === stepCount - 1 ? 'end' : 
                     stepTypes[Math.floor(Math.random() * (stepTypes.length - 2)) + 1];
      
      const step: WorkflowStepDefinition = {
        id: generateStepId(`step_${i}`),
        name: `Step ${i + 1}`,
        type: stepType,
        position: {
          x: col * stepSpacing + Math.random() * 50 - 25,
          y: row * stepSpacing + Math.random() * 50 - 25
        },
        size: { width: 200, height: 100 },
        properties: {},
        inputPorts: stepType !== 'start' ? [{
          id: generateConnectionId(),
          name: 'input',
          type: 'control_input' as any,
          dataType: 'any',
          required: true,
          position: { x: 0, y: 0 }
        }] : [],
        outputPorts: stepType !== 'end' ? [{
          id: generateConnectionId(),
          name: 'output', 
          type: 'control_output' as any,
          dataType: 'any',
          required: false,
          position: { x: 0, y: 0 }
        }] : []
      };
      
      steps.push(step);
      
      // Create some connections
      if (i > 0 && Math.random() > 0.3) {
        const sourceIndex = Math.max(0, i - Math.floor(Math.random() * 3) - 1);
        const sourceStep = steps[sourceIndex];
        
        if (sourceStep.outputPorts.length > 0 && step.inputPorts.length > 0) {
          connections.push({
            id: generateConnectionId(),
            sourceStepId: sourceStep.id,
            sourcePortId: sourceStep.outputPorts[0].id,
            targetStepId: step.id,
            targetPortId: step.inputPorts[0].id
          });
        }
      }
    }

    const newDefinition: WorkflowDefinition = {
      ...definition,
      steps,
      connections,
      name: `Performance Test (${stepCount} steps)`
    };

    setDefinition(newDefinition);
  }, [definition, setDefinition]);

  const handleDefinitionChange = useCallbackReact((newDefinition: WorkflowDefinition) => {
    setDefinition(newDefinition);
  }, [setDefinition]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Performance Test Controls */}
      <Paper 
        elevation={1}
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          flexShrink: 0
        }}
      >
        <Typography variant="h6">
          Performance Testing
        </Typography>
        
        <Chip 
          label={`${definition.steps.length} steps`}
          color={definition.steps.length > 200 ? 'error' : 
                 definition.steps.length > 50 ? 'warning' : 'success'}
        />
        
        <ButtonGroup variant="outlined" size="small">
          <Button onClick={() => generateLargeWorkflow(25)}>
            25 Steps
          </Button>
          <Button onClick={() => generateLargeWorkflow(50)}>
            50 Steps  
          </Button>
          <Button onClick={() => generateLargeWorkflow(100)}>
            100 Steps
          </Button>
          <Button onClick={() => generateLargeWorkflow(250)}>
            250 Steps
          </Button>
          <Button onClick={() => generateLargeWorkflow(500)}>
            500 Steps
          </Button>
        </ButtonGroup>

        <Typography variant="caption" color="text.secondary">
          Performance mode automatically activates at 50+ steps
        </Typography>
      </Paper>

      {/* Workflow Designer */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <WorkflowDesigner
          workflowId={definition.id}
          initialDefinition={definition}
          
          readonly={false}
          showGrid={true}
          snapToGrid={true}
        />
      </Box>
    </Box>
  );
}
