import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from 'material-ui/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import classNames from 'classnames';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import Chip from 'material-ui/Chip';
import List, { ListItem, ListItemSecondaryAction, ListItemText } from 'material-ui/List';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import SaveIcon from 'material-ui-icons/Save';
import SupervisorIcon from 'material-ui-icons/SupervisorAccount';
import RowingIcon from 'material-ui-icons/Rowing';
import VertMoreIcon from 'material-ui-icons/MoreVert';
import ShowChartIcon from 'material-ui-icons/ShowChart';
import PersonIcon from 'material-ui-icons/Person';
import EmailIcon from 'material-ui-icons/Email';
import PlaylistAddCheck from 'material-ui-icons/PlaylistAddCheck';
import PhotoCamera from 'material-ui-icons/PhotoCamera';
import Avatar from 'material-ui/Avatar';
import TextField from 'material-ui/TextField';
import Paper from 'material-ui/Paper';


class GreetingWidget extends Component {


    static styles = (theme) => ({
        mainContainer: {
            width:'100%',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',                    
        }        
    });

    static propTypes = {
        user:  PropTypes.object
    };

    static defaultProps = {
        user: null 
    };
    
    render(){    
        const { classes, history, user } = this.props;
        
                                                
        return (
            <Grid container spacing={16} className={classes.mainContainer}>
                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={classes.general}>
                        <Typography>Welcome {user.firstName}, What would you like to do?</Typography>
                    </Paper>
                </Grid>                                                                     
            </Grid>
        );
    }

    windowResize(){
        this.forceUpdate();
    }

    constructor(props, context){
        super(props, context);
        this.onAvatarMouseOver = this.onAvatarMouseOver.bind(this);
        this.onAvatarMouseOut = this.onAvatarMouseOut.bind(this);
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            avatarMouseOver: false
        }
        
        window.addEventListener('resize', this.windowResize);
    }
}

const _component = compose(
    withRouter,
    withStyles(GreetingWidget.styles),
    withTheme()
  )(GreetingWidget);
  export default _component;