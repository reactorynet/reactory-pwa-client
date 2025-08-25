import React from 'react';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
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


const BasicModal = (props: any) => {
  const theme = useTheme();
  const [open, setOpen] = React.useState(props.open === true || false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const { onClose, title, children } = props;
  const closeHandler = onClose || handleClose;
  
  return (
    <div>                
      <Modal
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
        open={open}
        onClose={closeHandler}
      >
        <div style={{ ...getModalStyle(), position: 'absolute', backgroundColor: theme.palette.background.paper, boxShadow: theme.shadows[5], padding: theme.spacing(1) }}>
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
};

export default BasicModal;