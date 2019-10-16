import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import withMobileDialog from '@material-ui/core/withMobileDialog';
import {
  Avatar,
  Chip,
  Button,
  Card, 
  CardMedia,
  CardContent,
  CardActions,
  CardActionArea,
  FormControl,
  List,
  ListItem,
  ListItemText,
  InputLabel,
  Input,
  Icon,
  InputAdornment,
  IconButton,
  Grid,
  Paper,
  TextField,
  Table,
  TableBody,
  TableHead,  
  TableRow,
  TableCell,
  Typography,
} from '@material-ui/core';

import { CenteredContainer } from '../util';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { ReactoryFormComponent } from '../reactory/ReactoryFormComponent';

class Message extends Component {

  static propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
  };

  static styles = theme => ({
    card: {
      maxWidth: 345,
    },
    media: {
      height: 140,
    },
  });

  static defaultProps = {
    title: 'Test',
    message: 'This is a test message',
    variant: 'error',      
  };

  onSubmit(formData){
    //console.log('Form data submitted', formData);
  }

  render(){
    const { classes } = this.props;
    return (
      <CenteredContainer>
        <Card className={classes.card}>  
        {
          this.props.image ? (
          <CardMedia
            className={classes.media}
            image={this.props.image}
            title={this.props.title}/>
        ) : ( 
          <CardMedia>
            <Typography variant="h6">
              <Icon>message</Icon>
            </Typography>
          </CardMedia>)
        }        
        <CardContent>
          <Typography gutterBottom variant="h5" component="h2">
            {this.props.title}
          </Typography>
          <Typography variant="body1">
            {this.props.message}
          </Typography>
        </CardContent>      
        <CardActions>
          { this.props.cancelButton ? <Button size="small" color="primary">
            Cancel
          </Button> : null }
          { this.props.okButton ? <Button size="small" color="primary">
            Ok
          </Button> : null }
          
        </CardActions>
      </Card>
    </CenteredContainer>
    );
  }
}

export default compose(
  withMobileDialog, 
  withStyles(Message.styles), 
  withTheme)(Message);