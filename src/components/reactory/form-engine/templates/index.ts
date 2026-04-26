/**
 * Barrel export for the Reactory v5 templates.
 *
 * The shape returned by `reactoryTemplates()` matches `Partial<TemplatesType>`
 * from `@rjsf/utils` so it can be passed directly to `<Form templates=...>`
 * (or `withTheme(...)`).
 *
 * Each entry comes from one of the per-template files in this directory.
 * Adding a new template only requires updating this barrel.
 */

import type { TemplatesType } from '@rjsf/utils';

import { ReactoryArrayFieldTemplate } from './ArrayFieldTemplate';
import { ReactoryFieldTemplate } from './FieldTemplate';
import { ReactoryObjectFieldTemplate } from './ObjectFieldTemplate';
import { ReactoryTitleFieldTemplate } from './TitleFieldTemplate';
import { ReactoryDescriptionFieldTemplate } from './DescriptionFieldTemplate';
import { ReactoryFieldErrorTemplate } from './FieldErrorTemplate';
import { ReactoryFieldHelpTemplate } from './FieldHelpTemplate';
import { ReactoryWrapIfAdditionalTemplate } from './WrapIfAdditionalTemplate';
import { ReactoryUnsupportedFieldTemplate } from './UnsupportedFieldTemplate';
import { ReactoryErrorListTemplate } from './ErrorListTemplate';
import * as ReactoryButtonTemplates from './ButtonTemplates';

export {
  ReactoryArrayFieldTemplate,
  ReactoryFieldTemplate,
  ReactoryObjectFieldTemplate,
  ReactoryTitleFieldTemplate,
  ReactoryDescriptionFieldTemplate,
  ReactoryFieldErrorTemplate,
  ReactoryFieldHelpTemplate,
  ReactoryWrapIfAdditionalTemplate,
  ReactoryUnsupportedFieldTemplate,
  ReactoryErrorListTemplate,
  ReactoryButtonTemplates,
};

/**
 * Build the templates object for the rjsf `<Form>` `templates` prop.
 * Returned fresh so callers can override individual entries before passing.
 */
export function reactoryTemplates(): Partial<TemplatesType> {
  return {
    ArrayFieldTemplate: ReactoryArrayFieldTemplate as TemplatesType['ArrayFieldTemplate'],
    FieldTemplate: ReactoryFieldTemplate as TemplatesType['FieldTemplate'],
    ObjectFieldTemplate: ReactoryObjectFieldTemplate as TemplatesType['ObjectFieldTemplate'],
    TitleFieldTemplate: ReactoryTitleFieldTemplate as TemplatesType['TitleFieldTemplate'],
    DescriptionFieldTemplate: ReactoryDescriptionFieldTemplate as TemplatesType['DescriptionFieldTemplate'],
    FieldErrorTemplate: ReactoryFieldErrorTemplate as TemplatesType['FieldErrorTemplate'],
    FieldHelpTemplate: ReactoryFieldHelpTemplate as TemplatesType['FieldHelpTemplate'],
    WrapIfAdditionalTemplate: ReactoryWrapIfAdditionalTemplate as TemplatesType['WrapIfAdditionalTemplate'],
    UnsupportedFieldTemplate: ReactoryUnsupportedFieldTemplate as TemplatesType['UnsupportedFieldTemplate'],
    ErrorListTemplate: ReactoryErrorListTemplate as TemplatesType['ErrorListTemplate'],
    ButtonTemplates: {
      SubmitButton: ReactoryButtonTemplates.SubmitButton,
      AddButton: ReactoryButtonTemplates.AddButton,
      RemoveButton: ReactoryButtonTemplates.RemoveButton,
      MoveUpButton: ReactoryButtonTemplates.MoveUpButton,
      MoveDownButton: ReactoryButtonTemplates.MoveDownButton,
      CopyButton: ReactoryButtonTemplates.CopyButton,
    } as TemplatesType['ButtonTemplates'],
  };
}
