import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { compose } from 'redux'
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { withReactory } from '@reactory/client-core/api/ApiProvider';

const ThemedAlertDialog = compose(withReactory)((props: any) => {
    const theme = useTheme();

    const {
        open,
        onClose,
        onAccept,
        id,
        confirmProps = {},
        cancelProps = {},
        contentProps = {},
        titleProps = {},
        style = {},
        maxWidth = 'md',
        fullWidth = true,
        dividers = false,
        showCancel = true,
        showAccept = true,
        showActions = true,
        actions = []
    } = props;

    // return (<>Dialog</>)

    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby={`alert-dialog-title-${id}`}
            aria-describedby={`alert-dialog-description-${id}`}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
        >
            {props.title && <DialogTitle id={`alert-dialog-title-${id}`} {...titleProps}>
                {props.title}
            </DialogTitle>}
            <DialogContent style={style} dividers={dividers}>
                <DialogContentText id={`alert-dialog-description-${id}`} {...contentProps}>
                    {props.content}
                </DialogContentText>
                {props.children}
            </DialogContent>
            {showActions === true && <DialogActions>
                {actions}
                {showCancel === true && <Button
                    variant={cancelProps.variant || "text"}
                    onClick={onClose}
                    {...cancelProps}>
                    {props.cancelTitle ? props.cancelTitle : 'Cancel'}
                </Button>}
                {showAccept === true && <Button onClick={onAccept}
                    variant={confirmProps.variant || 'outlined'}
                    style={{  }}
                    autoFocus
                    {...confirmProps}>
                    {props.acceptTitle ? props.acceptTitle : 'Yes'}
                </Button>}
            </DialogActions>}
        </Dialog >
    );
});

export default {
    nameSpace: 'core',
    name: 'AlertDialog',
    version: '1.0.0',
    component: ThemedAlertDialog
}