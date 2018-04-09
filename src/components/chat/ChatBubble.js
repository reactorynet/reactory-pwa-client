import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {withStyles, withTheme} from 'material-ui/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import {isNil} from 'lodash';
import classNames from 'classnames';
import Grid from 'material-ui/Grid';
import Input, { InputLabel } from 'material-ui/Input';
import { FormControl, FormHelperText } from 'material-ui/Form';
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

class ActionSelector extends Component {
    
    render(){
        return (
            <Grid container>
                <Grid item xs={4}>
                    <Button variant="raised" color="primary">Administration</Button>
                </Grid>
                <Grid item xs={4}>
                <Button variant="raised" color="primary">Product Roadmap</Button>
                </Grid>
                <Grid item xs={4}>
                <Button variant="raised" color="primary">Complete polls</Button>
                </Grid>
            </Grid>
        );
    }    
}


class MemberInvite extends Component {
    
    render(){
        return (
            <Grid container>
                <Grid item xs={12}>
                <FormControl>
                    <InputLabel htmlFor="name-simple">Name</InputLabel>
                    <Input id="name-simple" type="email"/>
                </FormControl>
                </Grid>                
            </Grid>
        );
    }    
}

const MemberInviteComponent = withTheme()(MemberInvite);

class ChatBubble extends Component {


    static styles = (theme) => ({
        mainContainer: {
            width:'100%',
            marginLeft: 'auto',
            marginRight: 'auto',                    
        },
        chatEntry: {
            padding: '15px',
            backgroundColor: theme.palette.primary.dark,
            color: theme.palette.primary.light,
            marginRight: '25px'
        },
        chatEntrySelf: {
            textAlign: 'right',
            color: theme.palette.primary.dark,
            backgroundColor: theme.palette.primary.light,
            marginRight: '0px',
            marginLeft: '25px'
        }        
    });

    static propTypes = {
        user:  PropTypes.object,
        conversationEntry: PropTypes.object
    };

    static defaultProps = {
        user: null 
    };
    
    render(){    
        const { classes, history, conversationEntry } = this.props;
        
                                                
        return (
            <Grid container spacing={24} className={classes.mainContainer} key={this.props.key}>
                <Grid item sm={12} xs={12} offset={4}>
                    <Paper className={conversationEntry.me === false ? classes.chatEntry : classNames(classes.chatEntry, classes.chatEntrySelf)}>
                        <Typography variant="p">{conversationEntry.message}</Typography>
                        {conversationEntry.component === "ActionSelector" ? <ActionSelector /> : null }
                        {conversationEntry.component === "MemberInvite" ? <MemberInviteComponent /> : null }
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
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            avatarMouseOver: false
        }
        
        window.addEventListener('resize', this.windowResize);
    }
}

const _component = compose(
    withRouter,
    withStyles(ChatBubble.styles),
    withTheme()
  )(ChatBubble);
  export default _component;