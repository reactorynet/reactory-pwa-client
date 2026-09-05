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

const PassthroughTextField: React.FC<any> = ({ label, value, onChange, inputProps, InputProps, fullWidth, multiline, maxRows, inputRef, ...rest }) => (
  <div>
    {InputProps?.startAdornment}
    <input
      aria-label={label}
      value={value}
      onChange={onChange}
      {...inputProps}
      {...rest}
    />
    {InputProps?.endAdornment}
  </div>
);

const PassthroughIconButton: React.FC<any> = ({ children, onClick, sx, size, ...rest }) => (
  <button onClick={onClick} data-size={size} {...rest}>{children}</button>
);

const PassthroughFade: React.FC<any> = ({ children, in: inProp }) =>
  inProp ? <>{children}</> : null;

const PassthroughCircularProgress: React.FC<any> = ({ size }) => (
  <span role="progressbar" aria-label="loading" />
);

const PassthroughChip: React.FC<any> = ({ label, children, onClick, onDelete, icon, deleteIcon, ...rest }) => (
  <div onClick={onClick} {...rest}>
    {icon}
    <span>{label || children}</span>
    {deleteIcon}
  </div>
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
    InputAdornment: Passthrough,
    // Not used in the simple components but kept for completeness
    Paper: Passthrough,
    Chip: PassthroughChip,
    Grid: Passthrough,
    Card: Passthrough,
    CardContent: Passthrough,
    CardActions: Passthrough,
    Avatar: Passthrough,
    Dialog: Passthrough,
    DialogTitle: Passthrough,
    DialogContent: Passthrough,
    DialogActions: Passthrough,
    useTheme: () => ({ palette: { mode: 'dark' } }),
    Menu: Passthrough,
    MenuItem: Passthrough,
    ListItemIcon: Passthrough,
    ListItemText: Passthrough,
    Accordion: Passthrough,
    AccordionSummary: Passthrough,
    AccordionDetails: Passthrough,
    Switch: Passthrough,
    Checkbox: Passthrough,
    Select: Passthrough,
    FormControlLabel: Passthrough,
    LinearProgress: Passthrough,
    Tooltip: ({ children }: any) => <>{children}</>,
    Divider: () => <hr />,
  },
  MaterialIcons: {
    Mic: () => <span role="img" aria-label="mic">mic</span>,
    ArrowBack: () => <span role="img" aria-label="arrow_back">arrow_back</span>,
    Chat: () => <span role="img" aria-label="chat">chat</span>,
    Info: () => <span role="img" aria-label="info">info</span>,
    Search: () => <span role="img" aria-label="search">search</span>,
    Clear: () => <span role="img" aria-label="clear">clear</span>,
    Check: () => <span role="img" aria-label="check">check</span>,
    ExpandMore: () => <span role="img" aria-label="expand_more">expand_more</span>,
    Settings: () => <span role="img" aria-label="settings">settings</span>,
    Delete: () => <span role="img" aria-label="delete">delete</span>,
    PlayArrow: () => <span role="img" aria-label="play_arrow">play_arrow</span>,
    HomeRepairService: () => <span role="img" aria-label="home_repair_service">home_repair_service</span>,
  },
};

/** A minimal il8n stub that returns the defaultValue from options. */
export const mockIl8n = {
  t: (_key: string, options: { defaultValue: string; [k: string]: any } = { defaultValue: '' }) =>
    options.defaultValue,
};
