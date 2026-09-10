import { registerReactoryBlot, toEditorHtml as reactoryToEditorHtml, toContentHtml as reactoryToContentHtml } from '../reactoryBlot';
import { registerTableBlot, tablesToEditorHtml, tablesToContentHtml } from './tableBlot';
import { registerEnhancedImageBlot } from './imageBlot';
import { registerHorizontalRuleBlot } from './hrBlot';
import { registerStyleAttributors } from './styleAttributors';

export * from './tableBlot';
export * from './imageBlot';
export * from './hrBlot';
export * from './styleAttributors';

let allRegistered = false;

/**
 * Registers all custom Blots, Embeds, and Style Attributors with Quill.
 * Safe to call repeatedly; registration happens exactly once.
 */
export const registerAllCustomBlots = (): void => {
  if (allRegistered) return;

  registerReactoryBlot();
  registerTableBlot();
  registerEnhancedImageBlot();
  registerHorizontalRuleBlot();
  registerStyleAttributors();

  allRegistered = true;
};

/**
 * Converts stored HTML (with `<reactory />`, `<table>`, etc.) into the
 * internal representation required by Quill to prevent node stripping.
 */
export const fullToEditorHtml = (html: string): string => {
  if (!html) return '';
  let processed = reactoryToEditorHtml(html);
  processed = tablesToEditorHtml(processed);
  return processed;
};

/**
 * Converts editor HTML (with embeds) back into pristine, semantic HTML
 * for database storage.
 */
export const fullToContentHtml = (html: string): string => {
  if (!html) return '';
  let processed = tablesToContentHtml(html);
  processed = reactoryToContentHtml(processed);
  return processed;
};
