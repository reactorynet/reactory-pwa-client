import React from 'react';
import { styled } from '@mui/material/styles';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import * as MaterialCore from '@mui/material';

const PREFIX = 'Footer';

const classes = {
  footer_container: `${PREFIX}-footer_container`,
  powered_by: `${PREFIX}-powered_by`,
  avatar: `${PREFIX}-avatar`,
  text: `${PREFIX}-text`,
};

const StyledGrid = styled(MaterialCore.Grid2)(({ theme }) => ({
  [`&.${classes.footer_container}`]: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(0.5, 0),
    zIndex: 10,
    pointerEvents: 'none',
  },
  [`& .${classes.powered_by}`]: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.75),
    pointerEvents: 'auto',
  },
  [`& .${classes.avatar}`]: {
    height: '18px',
    width: '18px',
  },
  [`& .${classes.text}`]: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    userSelect: 'none',
  },
}));

export const Footer = () => {
  const reactory = useReactory();
  const { Avatar, Typography } = MaterialCore;

  return (
    <StyledGrid container className={classes.footer_container}>
      <div className={classes.powered_by}>
        <Avatar
          sx={{ width: 18, height: 18 }}
          className={classes.avatar}
          src={reactory.getCDNResource('themes/reactory/images/avatar.png')}
          alt="Reactory"
        />
        <Typography variant="caption" className={classes.text}>
          Powered by Reactory
        </Typography>
      </div>
    </StyledGrid>
  );
};
