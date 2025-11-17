import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeWrapper } from '@reactory/client-storybook/ThemeWrapper';

// Mock the AccordionComponent since it has complex Reactory dependencies
const MockAccordionComponent = ({ 
  formData = [
    {
      id: 'panel1',
      title: 'First Panel',
      Components: [
        {
          componentFqn: 'core.TextField',
          componentProps: { label: 'Sample Input', value: 'Hello World' }
        }
      ]
    },
    {
      id: 'panel2', 
      title: 'Second Panel',
      Components: [
        {
          componentFqn: 'core.Button',
          componentProps: { label: 'Sample Button', variant: 'contained' }
        }
      ]
    }
  ],
  uiSchema = {
    'ui:options': {
      displayStepper: false,
      panels: []
    }
  },
  schema = {},
  formContext = {},
  classes = {},
  reactory = {
    getComponent: (fqn: string) => {
      // Mock component registry
      const mockComponents = {
        'core.TextField': ({ label, value }: any) => (
          <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <label>{label}:</label>
            <input value={value} readOnly style={{ marginLeft: '8px' }} />
          </div>
        ),
        'core.Button': ({ label, variant }: any) => (
          <button 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: variant === 'contained' ? '#1976d2' : 'transparent',
              color: variant === 'contained' ? 'white' : '#1976d2',
              border: variant === 'contained' ? 'none' : '1px solid #1976d2',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {label}
          </button>
        ),
        'core.NotFound': ({ message }: any) => (
          <div style={{ padding: '8px', color: 'red', border: '1px solid red', borderRadius: '4px' }}>
            {message}
          </div>
        )
      };
      return mockComponents[fqn] || mockComponents['core.NotFound'];
    },
    utils: {
      objectMapper: (props: any, map: any) => ({ ...props, ...map }),
      lodash: {
        findIndex: (array: any[], predicate: any) => array.findIndex(predicate)
      }
    }
  }
}: any) => {
  const uiOptions = uiSchema?.['ui:options'] || {};
  const displayStepper = uiOptions.displayStepper !== false;
  
  const panels = [...formData];
  if (uiOptions.panels && Array.isArray(uiOptions.panels)) {
    panels.push(...uiOptions.panels);
  }

  if (displayStepper) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Stepper Accordion</h3>
          {panels.map((panel, index) => (
            <div key={index} style={{ 
              marginBottom: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}>
              <div style={{ 
                padding: '12px 16px', 
                backgroundColor: '#f5f5f5',
                borderBottom: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                {index + 1}. {panel.title}
              </div>
              <div style={{ padding: '16px' }}>
                {panel.Components?.map((comp: any, compIndex: number) => {
                  const Component = reactory.getComponent(comp.componentFqn);
                  return (
                    <div key={compIndex} style={{ marginBottom: '8px' }}>
                      <Component {...comp.componentProps} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Accordion</h3>
          {panels.map((panel, index) => (
            <details key={index} style={{ 
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}>
              <summary style={{ 
                padding: '12px 16px', 
                backgroundColor: '#f5f5f5',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                {index + 1}. {panel.title}
              </summary>
              <div style={{ padding: '16px' }}>
                {panel.Components?.map((comp: any, compIndex: number) => {
                  const Component = reactory.getComponent(comp.componentFqn);
                  return (
                    <div key={compIndex} style={{ marginBottom: '8px' }}>
                      <Component {...comp.componentProps} />
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }
};

const meta = {
  title: 'Shared/AccordionComponent',
  component: MockAccordionComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A flexible accordion component that can display content in either accordion or stepper format. Supports dynamic component loading through the Reactory component registry.'
      }
    }
  },
  argTypes: {
    formData: {
      description: 'Array of panel data with components to render',
      control: { type: 'object' }
    },
    uiSchema: {
      description: 'UI schema configuration including display options',
      control: { type: 'object' }
    },
    displayStepper: {
      description: 'Whether to display as stepper or accordion',
      control: { type: 'boolean' }
    }
  },
  decorators: [
    (Story) => (
      <ThemeWrapper showThemeSelector={false}>
        <Story />
      </ThemeWrapper>
    )
  ]
} satisfies Meta<typeof MockAccordionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formData: [
      {
        id: 'panel1',
        title: 'Basic Information',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Name', value: 'John Doe' }
          },
          {
            componentFqn: 'core.TextField', 
            componentProps: { label: 'Email', value: 'john@example.com' }
          }
        ]
      },
      {
        id: 'panel2',
        title: 'Additional Details',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Phone', value: '+1-555-0123' }
          },
          {
            componentFqn: 'core.Button',
            componentProps: { label: 'Save', variant: 'contained' }
          }
        ]
      }
    ],
    uiSchema: {
      'ui:options': {
        displayStepper: false
      }
    }
  }
};

export const StepperMode: Story = {
  args: {
    formData: [
      {
        id: 'step1',
        title: 'Step 1: Personal Info',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'First Name', value: 'John' }
          },
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Last Name', value: 'Doe' }
          }
        ]
      },
      {
        id: 'step2',
        title: 'Step 2: Contact Info',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Email', value: 'john@example.com' }
          },
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Phone', value: '+1-555-0123' }
          }
        ]
      },
      {
        id: 'step3',
        title: 'Step 3: Confirmation',
        Components: [
          {
            componentFqn: 'core.Button',
            componentProps: { label: 'Submit', variant: 'contained' }
          }
        ]
      }
    ],
    uiSchema: {
      'ui:options': {
        displayStepper: true
      }
    }
  }
};

export const SinglePanel: Story = {
  args: {
    formData: [
      {
        id: 'single',
        title: 'Single Panel',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Input Field', value: 'Sample Value' }
          },
          {
            componentFqn: 'core.Button',
            componentProps: { label: 'Action Button', variant: 'outlined' }
          }
        ]
      }
    ],
    uiSchema: {
      'ui:options': {
        displayStepper: false
      }
    }
  }
};

export const WithAdditionalPanels: Story = {
  args: {
    formData: [
      {
        id: 'dynamic1',
        title: 'Dynamic Panel 1',
        Components: [
          {
            componentFqn: 'core.TextField',
            componentProps: { label: 'Dynamic Field 1', value: 'Value 1' }
          }
        ]
      }
    ],
    uiSchema: {
      'ui:options': {
        displayStepper: false,
        panels: [
          {
            id: 'dynamic2',
            title: 'Additional Panel',
            Components: [
              {
                componentFqn: 'core.TextField',
                componentProps: { label: 'Dynamic Field 2', value: 'Value 2' }
              },
              {
                componentFqn: 'core.Button',
                componentProps: { label: 'Dynamic Button', variant: 'contained' }
              }
            ]
          }
        ]
      }
    }
  }
}; 