/**
 * Properties Panel Demo
 * 
 * This example demonstrates the Properties Panel functionality
 * with different field types and validation features.
 */

import React from 'react';
import { PropertiesPanel } from '../components/Panels';
import { BUILT_IN_STEPS } from '../constants';
import { createDemoWorkflow } from './DemoWorkflow';

export function PropertiesDemo() {
  const [selectedStepIndex, setSelectedStepIndex] = React.useState(0);
  const [workflowDefinition] = React.useState(() => createDemoWorkflow());
  
  const selectedStep = workflowDefinition.steps[selectedStepIndex];
  const selectedSteps = [selectedStep];

  // Mock validation result with some errors and warnings
  const mockValidationResult = {
    isValid: false,
    errors: [
      {
        stepId: selectedStep?.id,
        message: 'Required field "inputField" is missing',
        path: 'configuration.inputField',
        severity: 'error' as const
      }
    ],
    warnings: [
      {
        stepId: selectedStep?.id,
        message: 'Consider adding a timeout value for better error handling',
        path: 'timeout',
        severity: 'warning' as const
      }
    ],
    infos: []
  };

  const handleStepUpdate = React.useCallback((updatedStep) => {
    console.log('Properties Demo - Step updated:', updatedStep);
  }, []);

  const handleConnectionUpdate = React.useCallback((updatedConnection) => {
    console.log('Properties Demo - Connection updated:', updatedConnection);
  }, []);

  const handleValidate = React.useCallback(() => {
    console.log('Properties Demo - Validation triggered');
  }, []);

  const handleStepSelect = (index: number) => {
    setSelectedStepIndex(index);
  };

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Step Selector */}
      <div style={{ width: '300px', padding: '20px', backgroundColor: '#f5f5f5', borderRight: '1px solid #ddd' }}>
        <h3>Select a Step to Edit Properties</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workflowDefinition.steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => handleStepSelect(index)}
              style={{
                padding: '10px',
                border: selectedStepIndex === index ? '2px solid #1976d2' : '1px solid #ddd',
                backgroundColor: selectedStepIndex === index ? '#e3f2fd' : 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{step.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Type: {step.type}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '4px' }}>
          <h4>Features Demonstrated:</h4>
          <ul style={{ fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
            <li>Dynamic property forms</li>
            <li>Multiple field types</li>
            <li>Real-time validation</li>
            <li>Error highlighting</li>
            <li>Section organization</li>
            <li>Validation summary</li>
          </ul>
        </div>
      </div>

      {/* Properties Panel */}
      <div style={{ width: '400px', height: '100%' }}>
        <PropertiesPanel
          selectedSteps={selectedSteps}
          selectedConnections={[]}
          stepLibrary={BUILT_IN_STEPS}
          validationResult={mockValidationResult}
          readonly={false}
          onStepUpdate={handleStepUpdate}
          onConnectionUpdate={handleConnectionUpdate}
          onValidate={handleValidate}
        />
      </div>
      
      {/* Info Panel */}
      <div style={{ 
        flexGrow: 1, 
        padding: '20px',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#666'
      }}>
        <h2>Properties Panel Demo</h2>
        <p>This demonstrates the Properties Panel component independently.</p>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          textAlign: 'left'
        }}>
          <h3>Try editing these property types:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div>📝 <strong>Text Fields</strong></div>
            <div>🔢 <strong>Number Fields</strong></div>
            <div>☑️ <strong>Boolean Switches</strong></div>
            <div>📋 <strong>Select Dropdowns</strong></div>
            <div>📄 <strong>Text Areas</strong></div>
            <div>🔗 <strong>JSON Objects</strong></div>
          </div>
          
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Notice:</strong>
            <ul style={{ marginTop: '5px', fontSize: '13px', paddingLeft: '20px' }}>
              <li>Properties organized into collapsible sections</li>
              <li>Real-time validation with error/warning indicators</li>
              <li>Validation summary in the second tab</li>
              <li>Field descriptions and help text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertiesDemo;
