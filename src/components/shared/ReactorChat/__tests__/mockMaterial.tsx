/**
 * Minimal Material mock for ReactorChat component tests.
 * Components that accept a `Material` prop get this object.
 * Each component is a passthrough that renders its children.
 */
import React from 'react';

const Passthrough: React.FC<any> = ({ children, ...rest }) => (
  <div {...rest}>{children}</div>
);

const PassthroughText: React.FC<any> = ({ children, variant, sx, ...rest }) => (
  <span data-variant={variant}>{children}</span>
);

const PassthroughButton: React.FC<any> = ({ children, onClick, ...rest }) => (
  <button onClick={onClick} {...rest}>{children}</button>
);

const PassthroughIcon: React.FC<any> = ({ children, sx }) => (
  <span role="img" aria-label={typeof children === 'string' ? children : undefined}>{children}</span>
);

const PassthroughTextField: React.FC<any> = ({ label, value, onChange, inputProps, ...rest }) => (
  <input
    aria-label={label}
    value={value}
    onChange={onChange}
    {...inputProps}
    {...rest}
  />
);

const PassthroughIconButton: React.FC<any> = ({ children, onClick, sx, size }) => (
  <button onClick={onClick} data-size={size}>{children}</button>
);

const PassthroughFade: React.FC<any> = ({ children, in: inProp }) =>
  inProp ? <>{children}</> : null;

const PassthroughCircularProgress: React.FC<any> = ({ size }) => (
  <span role="progressbar" aria-label="loading" />
);

export const mockMaterial = {
  MaterialCore: {
    Box: Passthrough,
    Typography: PassthroughText,
    Button: PassthroughButton,
    Icon: PassthroughIcon,
    IconButton: PassthroughIconButton,
    CircularProgress: PassthroughCircularProgress,
    Fade: PassthroughFade,
    TextField: PassthroughTextField,
    // Not used in the simple components but kept for completeness
    Paper: Passthrough,
    Chip: Passthrough,
    Tooltip: ({ children }: any) => <>{children}</>,
    Divider: () => <hr />,
  },
  MaterialIcons: {},
};

/** A minimal il8n stub that returns the defaultValue from options. */
export const mockIl8n = {
  t: (_key: string, options: { defaultValue: string; [k: string]: any } = { defaultValue: '' }) =>
    options.defaultValue,
};
