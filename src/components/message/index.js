import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
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


import { withTheme, withStyles } from '@material-ui/core/styles';
import { ReactoryFormComponent } from '../reactory';

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
    console.log('Form data submitted', formData);
  }

  render(){
    const { classes } = this.props;
    return (
      <Card className={classes.card}>  
      {this.props.image ? (
        <CardMedia
        className={classes.media}
        image={this.props.image}
        title={this.props.title}
      />
      ) : ( <CardMedia><Typography variant="title"><Icon>message</Icon></Typography></CardMedia> ) }
      
      <CardContent>
        <Typography gutterBottom variant="headline" component="h2">
          {this.props.title}
        </Typography>
        <Typography component="p">
          {this.props.message}
        </Typography>
      </CardContent>      
      <CardActions>
        <Button size="small" color="primary">
          Cancel
        </Button>
        <Button size="small" color="primary">
          Ok
        </Button>
      </CardActions>
    </Card>
    );
  }
}

export default compose(withStyles(Message.styles), withTheme())(Message);