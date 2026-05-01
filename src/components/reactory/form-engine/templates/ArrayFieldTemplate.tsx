/**
 * ArrayFieldTemplate — renders the container for an array schema's items.
 * Each item is rendered via ArrayFieldItemTemplate (rjsf supplies them
 * pre-rendered in `items`); we lay them out and surface the Add button
 * when canAdd allows it.
 *
 * Phase 2 keeps this minimal: ordered list, item wrapper, add button.
 * Virtualization for large arrays is Phase 4 per
 * docs/forms-engine/08-enterprise-capabilities.md section 7.
 */

import * as React from 'react';
import type { ArrayFieldTemplateProps } from '@rjsf/utils';

export function ReactoryArrayFieldTemplate(props: ArrayFieldTemplateProps): React.ReactElement {
  const {
    canAdd,
    className,
    disabled,
    idSchema,
    items,
    onAddClick,
    readonly,
    required,
    title,
    uiSchema,
  } = props;

  const titleId = `${idSchema.$id}__title`;
  const labelOverride = (uiSchema as Record<string, unknown> | undefined)?.['ui:label'];
  const showTitle = labelOverride !== false && Boolean(title);

  return (
    <section
      className={className ?? 'array-field'}
      aria-labelledby={showTitle ? titleId : undefined}
      data-array-id={idSchema.$id}
    >
      {showTitle ? (
        <h4 className="array-field-title" id={titleId}>
          {title}
          {required ? <span className="required-indicator" aria-hidden="true">{' *'}</span> : null}
        </h4>
      ) : null}

      <ol className="array-field-items">
        {items.map((item) => (
          <li key={item.key} className="array-field-item">
            {item.children}
          </li>
        ))}
      </ol>

      {canAdd && !readonly && !disabled ? (
        <button
          type="button"
          className="array-field-add"
          onClick={onAddClick}
          aria-label="Add new item"
        >
          {'+ Add'}
        </button>
      ) : null}
    </section>
  );
}

export default ReactoryArrayFieldTemplate;
