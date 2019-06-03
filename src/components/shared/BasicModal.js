import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';

function getModalStyle() {
  const top = 50;
  const left = 50;

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
  };
}

const styles = theme => ({
  paper: {
    position: 'absolute',
    width: theme.spacing(1),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(1)
  },
});

class BasicModal extends React.Component {

  constructor(props, context){
    super(props, context)
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
    const { classes, onClose } = this.props;
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
                {this.props.title}
            </Typography>
            <Typography variant="subtitle1" id="simple-modal-description">
              {this.props.children}
            </Typography>            
          </div>
        </Modal>
      </div>
    );
  }
}

BasicModal.propTypes = {
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func
};



// We need an intermediary variable for handling the recursive nesting.
const BasicModalWrapped = withStyles(styles)(BasicModal);

export default BasicModalWrapped;