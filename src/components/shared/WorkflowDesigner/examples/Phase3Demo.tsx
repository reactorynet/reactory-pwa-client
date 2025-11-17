/**
 * Phase 3 Completion Demo
 * 
 * This example demonstrates all Phase 3 features including:
 * - Complete Step Library Panel
 * - Category-based navigation  
 * - Advanced search and filtering
 * - Drag & Drop from library to canvas
 * - Panel management and toggles
 */

import React from 'react';
import WorkflowDesigner from '../WorkflowDesigner';
import { createDemoWorkflow } from './DemoWorkflow';

export function Phase3Demo() {
  const [definition] = React.useState(() => createDemoWorkflow());
  
  const handleSave = React.useCallback(async (updatedDefinition) => {
    console.log('Phase 3 Demo - Workflow saved:', updatedDefinition);
  }, []);

  const handleValidationChange = React.useCallback((result) => {
    console.log('Phase 3 Demo - Validation result:', result);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        padding: '15px 20px', 
        backgroundColor: '#1976d2', 
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          🎉 Phase 3 Complete: Step Library System
        </h2>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
          Full-featured step library with categorization, search, and drag & drop functionality
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
          <strong>Categorized Browser</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Real-time Search</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Drag & Drop</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Panel Toggles</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#4caf50', fontSize: '16px' }}>✅</span>
          <strong>Visual Step Cards</strong>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: '#fff3cd', 
        borderBottom: '1px solid #ffeaa7',
        fontSize: '14px'
      }}>
        <strong>Try it:</strong> Use the step library panel (left side) to browse, search, and drag steps to the canvas. Toggle panels with the toolbar buttons.
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

export default Phase3Demo;
