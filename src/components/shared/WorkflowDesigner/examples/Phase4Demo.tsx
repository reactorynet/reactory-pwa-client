/**
 * Phase 4 Completion Demo
 * 
 * This example demonstrates all Phase 4 features including:
 * - Complete Properties Panel with dynamic forms
 * - Real-time property editing and validation
 * - Multi-field property types (text, number, boolean, select, JSON)
 * - Validation Summary with error/warning display
 * - Section-based property organization
 * - Integration with step definitions and schemas
 */

import React from 'react';
import WorkflowDesigner from '../WorkflowDesigner';
import { createDemoWorkflow } from './DemoWorkflow';

export function Phase4Demo() {
  const [definition] = React.useState(() => createDemoWorkflow());
  
  const handleSave = React.useCallback(async (updatedDefinition) => {
    console.log('Phase 4 Demo - Workflow saved with properties:', updatedDefinition);
  }, []);

  const handleValidationChange = React.useCallback((result) => {
    console.log('Phase 4 Demo - Validation result:', result);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '15px 20px', 
        backgroundColor: '#9c27b0', 
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          🎯 Phase 4 Complete: Properties & Validation System
        </h2>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
          Advanced property editing with dynamic forms, real-time validation, and comprehensive error reporting
        </p>
      </div>

      {/* Feature highlights */}
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#f5f5f5', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Dynamic Properties</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Real-time Validation</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Multiple Field Types</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Error Highlighting</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Validation Summary</strong>
        </div>
      </div>

      {/* Property Types Demo */}
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#e8f5e8', 
        borderBottom: '1px solid #c8e6c9',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div><strong>🔧 Property Types Supported:</strong></div>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <span>📝 <em>Text Fields</em></span>
          <span>🔢 <em>Numbers</em></span>
          <span>☑️ <em>Booleans</em></span>
          <span>📋 <em>Select Dropdowns</em></span>
          <span>📄 <em>Text Areas</em></span>
          <span>🔗 <em>JSON Objects</em></span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#fff3cd', 
        borderBottom: '1px solid #ffeaa7',
        fontSize: '14px'
      }}>
        <strong>Try it:</strong> Select any step on the canvas to see its properties panel (right side). Edit properties, see validation feedback, and check the Validation tab.
      </div>
      
      {/* Main Designer */}
      <div style={{ flexGrow: 1 }}>
        <WorkflowDesigner
          initialDefinition={definition}
          onSave={handleSave}
          onValidationChange={handleValidationChange}
          showGrid={true}
          snapToGrid={true}
          autoSave={false}
        />
      </div>
    </div>
  );
}

export default Phase4Demo;
