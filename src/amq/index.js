/**
 * This is the basic setup and configuration of channels for UI events
 */
import postal from 'postal';

export const DEFAULT_CHANNELS = {
  DATA: 'data',
  METRICS: 'metrics',
  TRANSACTIONS: 'transactions',
  FILE: 'file',
  FORM_COMMAND: 'form.command',
  WORKFLOW: 'workflow',
};

export const $chan = (name) => {
  return postal.channel(name);
};

export const $sub = {
  def: (eventId, func, channel = undefined) => $chan(channel).subscribe(eventId, func),
  transactions: (eventId, func) => $chan(DEFAULT_CHANNELS.TRANSACTIONS).subscribe(eventId, func),
  file: (eventId, func) => $chan(DEFAULT_CHANNELS.FILE).subscribe(eventId, func),
  data: (eventId, func) => $chan(DEFAULT_CHANNELS.DATA).subscribe(eventId, func),
  metrics: (eventId, func) => $chan(DEFAULT_CHANNELS.METRICS).subscribe(eventId, func),
  formCommand: (eventId, func) => $chan(DEFAULT_CHANNELS.FORM_COMMAND).subscribe(eventId, func),
  workFlow: (eventId, func) => $chan(DEFAULT_CHANNELS.WORKFLOW).subscribe(eventId, func)
};

export const $pub = {
  def: (eventId, data, channel = undefined) => $chan(channel).publish(eventId, data),
  transactions: (eventId, data = {}) => $chan(DEFAULT_CHANNELS.TRANSACTIONS).publish(eventId, data),
  file: (eventId, data = {}) => $chan(DEFAULT_CHANNELS.FILE).publish(eventId, data),
  data: (eventId, data = {}) => $chan(DEFAULT_CHANNELS.DATA).publish(eventId, data),
  metrics: (eventId, data = {}) => $chan(DEFAULT_CHANNELS.METRICS).publish(eventId, data),
  formCommand: (eventId, formData) => $chan(DEFAULT_CHANNELS.FORM_COMMAND).publish(eventId, formData),
  workFlow: (eventId, data) => $chan(DEFAULT_CHANNELS.WORKFLOW).publish(eventId, data),
};

export default {
  $chan,
  $sub,
  $pub,
  onTransactionEvent: $sub.transactions,
  onFileEvent: $sub.file,
  onDataEvent: $sub.data,
  onMetricEvent: $sub.metrics,
  onFormCommandEvent: $sub.formCommand,
  raiseTransactionEvent: $pub.transactions,
  raiseFileEvent: $pub.file,
  raiseDataEvent: $pub.data,
  raiseMetricEvent: $pub.metrics,
  raiseFormCommand: $pub.formCommand, 
  raiseWorkFlowEvent: $pub.workFlow, 
};
