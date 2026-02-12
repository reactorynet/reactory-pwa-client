/**
 * Step Library Diagnostics Component
 * 
 * Add this temporarily to your workflow designer to debug step visibility issues
 */

import React from 'react';
import { BUILT_IN_STEPS, STEP_CATEGORIES } from '../constants';
import { ALL_STEP_DEFINITIONS } from '../components/Steps';

export const StepLibraryDiagnostics: React.FC = () => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'white', 
      border: '2px solid #1976d2',
      borderRadius: 8,
      padding: 16,
      maxWidth: 400,
      maxHeight: 400,
      overflow: 'auto',
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 12,
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: 8
      }}>
        <strong>📊 Step Library Diagnostics</strong>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          style={{ 
            padding: '4px 8px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Summary:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>ALL_STEP_DEFINITIONS: {ALL_STEP_DEFINITIONS.length} steps</li>
            <li>BUILT_IN_STEPS: {BUILT_IN_STEPS.length} steps</li>
            <li>STEP_CATEGORIES: {STEP_CATEGORIES.length} categories</li>
          </ul>
        </div>

        {showDetails && (
          <>
            <div style={{ marginBottom: 8 }}>
              <strong>Steps by Category:</strong>
              {STEP_CATEGORIES.map(cat => (
                <div key={cat.id} style={{ marginLeft: 12, marginTop: 4 }}>
                  <div style={{ 
                    color: cat.color, 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: cat.color,
                      display: 'inline-block'
                    }} />
                    {cat.name} ({cat.steps.length})
                  </div>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: 11 }}>
                    {cat.steps.map(step => (
                      <li key={step.id}>{step.name} ({step.id})</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 8, marginTop: 12 }}>
              <strong>All Steps by ID:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: 11 }}>
                {ALL_STEP_DEFINITIONS.map(step => (
                  <li key={step.id}>
                    {step.id} → {step.category}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              <strong>Check:</strong>
              <div style={{ marginTop: 4, fontSize: 11 }}>
                {STEP_CATEGORIES.some(cat => cat.steps.length === 0) ? (
                  <span style={{ color: 'red' }}>⚠️ Some categories have 0 steps!</span>
                ) : (
                  <span style={{ color: 'green' }}>✓ All categories have steps</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepLibraryDiagnostics;
