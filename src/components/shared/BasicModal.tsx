import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

function getModalStyle() {
  const top = 50;
  const left = 50;

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
  };
}


class BasicModal extends React.Component<any, any> {
  
  static styles = (theme): any => ({
    paper: {
      position: 'absolute',    
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[5],
      padding: theme.spacing(1)
    },
  });

  constructor(props){
    super(props)
    this.state = {
      open: props.open === true || false,
    };
  }
  

  handleOpen = () => {
    this.setState({ open: true });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  render() {
    const { classes, onClose, title, children } = this.props;
    const closeHandler = onClose || this.handleClose;
    return (
      <div>                
        <Modal
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
          open={this.state.open}
          onClose={closeHandler}
        >
          <div style={getModalStyle()} className={classes.paper}>
            <Typography variant="h6" id="modal-title">
                {title}
            </Typography>
            <Typography variant="subtitle1" id="simple-modal-description">
              {children}
            </Typography>            
          </div>
        </Modal>
      </div>
    );
  }
}

const BasicModalWrapped = withStyles(BasicModal.styles)(BasicModal);

export default BasicModalWrapped;