import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { compose } from 'redux'
import { withStyles, withTheme } from '@material-ui/core/styles';
import { withApi } from '@reactory/client-core/api/ApiProvider';

const ThemedAlertDialog = compose(withTheme, withApi)((props: any) => {

    const {
        open,
        onClose,
        onAccept,
        id,
        theme,
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
            { showActions === true && <DialogActions>
                {actions}
                {showCancel === true && < Button
                    variant={cancelProps.variant || "text"}
                    onClick={onClose}
                    {...cancelProps}>
                    {props.cancelTitle ? props.cancelTitle : 'Cancel'}
                </Button>}
                {showAccept === true && <Button onClick={onAccept}
                    variant={confirmProps.variant || 'outlined'}
                    style={{ color: theme.palette.error.main }}
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