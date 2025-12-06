/**
 * StyledRouter Component
 * A styled wrapper for React Router's BrowserRouter with Material-UI theming
 */
import { styled } from '@mui/material/styles';
import { BrowserRouter as Router } from 'react-router-dom';
import { Theme } from '@mui/material';
import { classes } from '../../../constants/app/styles';

/**
 * StyledRouter - A themed BrowserRouter component
 * Applies Material-UI theme styles to various UI elements
 */
export const StyledRouter = styled(Router)(({ theme }: { theme: Theme }) => {
  return {
    [`& .${classes.root_paper}`]: {
      minHeight: '100vh',
      maxHeight: '100vh',        
    },
    [`& .${classes.selectedMenuLabel}`]: {
      color: theme.palette.primary.main,
      paddingRight: theme.spacing(1.5),
      paddingLeft: theme.spacing(1)
    },
    [`& .${classes.prepend}`]: {
      color: 'rgb(34, 39, 50)',
      opacity: 0.7,
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1)
    },
    [`& .${classes.selected}`]: {
      color: 'rgb(34, 39, 50)',
      opacity: 1,
      paddingLeft: theme.spacing(1)
    },
    [`& .${classes.preffered}`]: {
      fontWeight: 'bold',
      color: theme.palette.primary.main
    },
    [`& .${classes.get_started}`]: {
      fontSize: '20px',
      color: 'grey',
      textAlign: 'center',
      marginTop: '30px'
    },
    [`& .${classes.schema_selector}`]: {
      textAlign: 'right'
    }
  };
});
