/**
 * Step Library Demo Example
 * 
 * This example demonstrates the Step Library Panel functionality
 * with categorization, search, and drag & drop features.
 */

import React from 'react';
import { StepLibraryPanel } from '../components/Panels';
import { BUILT_IN_STEPS, STEP_CATEGORIES } from '../constants';

export function StepLibraryDemo() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | undefined>();

  const handleStepDragStart = React.useCallback((step) => {
    console.log('Drag started for step:', step.name);
  }, []);

  const handleStepClick = React.useCallback((step) => {
    console.log('Step clicked:', step.name);
    alert(`You clicked: ${step.name}\n\nDescription: ${step.description}\n\nTags: ${step.tags?.join(', ') || 'None'}`);
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div style={{ width: '400px', height: '100%' }}>
        <StepLibraryPanel
          stepLibrary={BUILT_IN_STEPS}
          categories={STEP_CATEGORIES}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onStepDragStart={handleStepDragStart}
          onSearchChange={setSearchTerm}
          onCategorySelect={setSelectedCategory}
          onStepClick={handleStepClick}
        />
      </div>
      
      <div style={{ 
        flexGrow: 1, 
        padding: '20px',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#666'
      }}>
        <h2>Step Library Demo</h2>
        <p>This demonstrates the Step Library Panel component independently.</p>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h3>Features Demonstrated:</h3>
          <ul style={{ textAlign: 'left' }}>
            <li>📁 <strong>Category Navigation</strong> - Browse steps by category</li>
            <li>🔍 <strong>Real-time Search</strong> - Search by name, description, or tags</li>
            <li>🏷️ <strong>Active Filters</strong> - Visual filter chips with clear options</li>
            <li>🎯 <strong>Step Details</strong> - Rich step cards with icons and info</li>
            <li>📱 <strong>Responsive Design</strong> - Collapsible categories and smooth animations</li>
            <li>🖱️ <strong>Interactions</strong> - Click steps to view details, drag to canvas</li>
          </ul>
          
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Try it:</strong>
            <ul style={{ marginTop: '5px', fontSize: '14px' }}>
              <li>Search for "condition" or "parallel"</li>
              <li>Filter by "Control Flow" category</li>
              <li>Click on any step card for details</li>
              <li>Try dragging steps (see console)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepLibraryDemo;
