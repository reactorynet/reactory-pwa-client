/**
 * ObjectFieldTemplate — renders the container for an object schema's
 * properties. Each property is already wrapped in a FieldTemplate by rjsf
 * before reaching us; here we lay them out in document order with the
 * object's title and description.
 *
 * Reactory specifics:
 *   - Honour `ui:order` (already applied by rjsf when computing `properties`,
 *     so we just iterate).
 *   - Honour `additionalProperties` via the `onAddClick` button when the
 *     schema allows it. (WrapIfAdditionalTemplate handles the per-property
 *     key-rename UX; this template only renders the "Add" affordance.)
 *   - Skip rendering hidden properties (rjsf marks them on the property
 *     entry).
 */

import * as React from 'react';
import type { ObjectFieldTemplateProps } from '@rjsf/utils';

export function ReactoryObjectFieldTemplate(props: ObjectFieldTemplateProps): React.ReactElement {
  const {
    title,
    description,
    properties,
    schema,
    uiSchema,
    idSchema,
    required,
    onAddClick,
    disabled,
    readonly,
  } = props;

  const additionalAllowed = schema.additionalProperties !== false && schema.additionalProperties !== undefined;
  const titleId = `${idSchema.$id}__title`;
  const descId = `${idSchema.$id}__description`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  const showTitle = labelOverride !== false && Boolean(title);

  return (
    <fieldset className="object-field" aria-labelledby={showTitle ? titleId : undefined}>
      {showTitle ? (
        <legend className="object-field-title" id={titleId}>
          {title}
          {required ? <span className="required-indicator" aria-hidden="true">{' *'}</span> : null}
        </legend>
      ) : null}

      {description ? (
        <p className="object-field-description" id={descId}>
          {description}
        </p>
      ) : null}

      {properties
        .filter((p) => !p.hidden)
        .map((p) => (
          <div key={p.name} className="object-field-property" data-property-name={p.name}>
            {p.content}
          </div>
        ))}

      {additionalAllowed && !readonly && !disabled ? (
        <button
          type="button"
          className="object-field-add"
          onClick={onAddClick(schema)}
          aria-label="Add new property"
        >
          {'+ Add'}
        </button>
      ) : null}
    </fieldset>
  );
}

export default ReactoryObjectFieldTemplate;
