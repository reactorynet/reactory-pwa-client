import { StepDefinition, PortType } from '../../../types';

export const EmailStepDefinition: StepDefinition = {
  id: 'email',
  name: 'Send Email',
  category: 'integration',
  description: 'Send an email via the Reactory email service',
  icon: 'email',
  color: '#ec407a',
  inputPorts: [
    { name: 'previous', type: PortType.CONTROL_INPUT, dataType: 'any', description: 'Previous step in workflow' },
  ],
  outputPorts: [
    { name: 'next', type: PortType.CONTROL_OUTPUT, dataType: 'any', description: 'Next step in workflow' },
    { name: 'sent', type: PortType.OUTPUT, dataType: 'object', description: 'Send result { sent, messageId }' },
    { name: 'error', type: PortType.OUTPUT, dataType: 'error', description: 'Error if sending fails' },
  ],
  propertySchema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Step Name', default: 'Send Email' },
      to: { type: 'string', title: 'To', description: 'Recipient address (supports ${variable})' },
      subject: { type: 'string', title: 'Subject' },
      body: { type: 'string', title: 'Body (plain text)' },
      html: { type: 'string', title: 'Body (HTML)' },
      from: { type: 'string', title: 'From (optional)' },
      templateId: { type: 'string', title: 'Template Id (optional)' },
    },
    required: ['name', 'to', 'subject'],
  },
  defaultProperties: { name: 'Send Email' },
  uiSchema: {
    'ui:order': ['name', 'to', 'subject', 'body', 'html', 'from', 'templateId'],
    body: { 'ui:widget': 'RichEditorWidget', 'ui:options': { rows: 4 } },
    html: { 'ui:widget': 'RichEditorWidget', 'ui:options': { format: 'html', rows: 6 } },
  },
  tags: ['integration', 'email', 'notification'],
  rendering: {
    webgl: {
      type: 'webgl',
      theme: 'circuit',
      circuit: {
        elementType: 'icChip',
        labelPrefix: 'MAIL',
        colors: { body: 0x1a1a1a, bodyHover: 0x2a2a2a, bodySelected: 0xec407a, pins: 0x808080, pinsConnected: 0xb87333 },
        features: { hasNotch: true, pinCount: 6 },
        dimensions: { width: 120, height: 80 },
      },
    },
  },
};
