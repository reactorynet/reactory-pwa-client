/**
 * ReactoryObjectField — honours `ui:widget` on object schemas.
 *
 * The legacy fork renders `ui:widget` for any schema type, and Reactory forms
 * rely on it for object-shaped values: for example the applications dashboard
 * (`core.Applications`) renders each array item through
 * `'ui:widget': 'core.ApplicationCard@1.0.0'`. rjsf v5 only consults
 * `ui:widget` for primitive (and some array) fields; for an object,
 * `SchemaField` always picks `ObjectField`, which renders the object's
 * properties one by one. Under the v5 engine those forms showed raw inputs
 * instead of their widget.
 *
 * This field replaces the registry's `ObjectField`. When the object's
 * uiSchema names a widget, it resolves and renders that widget with standard
 * `WidgetProps` (value = the object). Otherwise it delegates to rjsf's own
 * `ObjectField` unchanged, so ordinary objects and `GridLayout` (which calls
 * `registry.fields.ObjectField`) behave exactly as before.
 *
 * Widget resolution, in order:
 *   1. `ui:widget` given as a component.
 *   2. `registry.widgets[name]`: the static catalogue plus the form's
 *      `widgetMap` entries, already adapted to `WidgetProps`.
 *   3. A dotted FQN resolved through the Reactory SDK (`getComponent`).
 *      rjsf copies the widget map into a plain object when it builds its
 *      registry, so FQN lookups do not survive step 2.
 * An unresolvable name falls back to the default object rendering with a
 * warning, rather than taking the whole form down.
 */

import * as React from 'react';
import { getDefaultRegistry } from '@rjsf/core';
import { getUiOptions } from '@rjsf/utils';
import type { FieldProps, WidgetProps } from '@rjsf/utils';
import { adaptWidget } from '../registry/widgetAdapter';
import { resolveFqn } from '../registry/resolveFqn';

const DefaultObjectField = getDefaultRegistry().fields.ObjectField as React.ComponentType<FieldProps>;

/** One adapted wrapper per raw component, so React sees a stable type. */
const adaptedCache = new WeakMap<object, React.ComponentType<WidgetProps>>();

const adapt = (component: React.ComponentType<any>): React.ComponentType<WidgetProps> => {
  const cached = adaptedCache.get(component as object);
  if (cached) return cached;
  const adapted = adaptWidget(component as React.ComponentType<any>);
  adaptedCache.set(component as object, adapted);
  return adapted;
};

const warned = new Set<string>();

export function resolveObjectWidget(
  widget: unknown,
  registry: FieldProps['registry'],
  reactory: any,
): React.ComponentType<WidgetProps> | null {
  if (typeof widget === 'function' || (widget && typeof widget === 'object')) {
    return adapt(widget as React.ComponentType<any>);
  }
  if (typeof widget !== 'string' || widget.length === 0) return null;

  const registered = (registry?.widgets as Record<string, unknown> | undefined)?.[widget];
  if (registered) return registered as React.ComponentType<WidgetProps>;

  if (reactory && typeof reactory.getComponent === 'function') {
    const resolved = resolveFqn({ reactory }, widget, 'widget');
    if (resolved) return adapt(resolved);
  }
  return null;
}

export function ReactoryObjectField(props: FieldProps): React.ReactElement {
  const {
    schema,
    uiSchema,
    idSchema,
    name,
    formData,
    formContext,
    registry,
    errorSchema,
    required,
    disabled,
    readonly,
    autofocus,
    onChange,
    onBlur,
    onFocus,
  } = props;

  const uiOptions = getUiOptions(uiSchema);
  const widget = uiOptions.widget;

  const reactory = (formContext as { reactory?: unknown } | undefined)?.reactory;
  const Widget = widget && widget !== 'hidden'
    ? resolveObjectWidget(widget, registry, reactory)
    : null;

  if (!Widget) {
    if (typeof widget === 'string' && widget !== 'hidden' && !warned.has(widget)) {
      warned.add(widget);
      (reactory as any)?.warning?.(
        `[form-engine] ui:widget "${widget}" on object field ${idSchema?.$id ?? name} could not be resolved; rendering its properties instead.`,
      );
    }
    return <DefaultObjectField {...props} />;
  }

  const id = idSchema?.$id ?? name;
  return (
    <Widget
      id={id}
      name={name}
      schema={schema}
      uiSchema={uiSchema}
      value={formData}
      options={uiOptions as WidgetProps['options']}
      label={(uiOptions.title as string) ?? schema?.title ?? name}
      required={required}
      disabled={disabled}
      readonly={readonly}
      autofocus={autofocus}
      rawErrors={(errorSchema as { __errors?: string[] } | undefined)?.__errors}
      formContext={formContext}
      registry={registry}
      onChange={onChange as WidgetProps['onChange']}
      onBlur={onBlur as WidgetProps['onBlur']}
      onFocus={onFocus as WidgetProps['onFocus']}
    />
  );
}

export default ReactoryObjectField;
