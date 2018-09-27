import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { withStyles, withTheme } from '@material-ui/core/styles';
import { compose } from 'redux';
import uuid from 'uuid';
import classNames from 'classnames';
import Grid from '@material-ui/core/Grid';
import { Input, InputAdornment, FormControl, List, Card, CardHeader, CardContent, CardActions } from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import SendIcon from '@material-ui/icons/Send';
import Avatar from '@material-ui/core/Avatar';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Draggable from 'react-draggable';

import ChatBubble from './ChatBubble';

import moment from 'moment';

let defaultInstance = require("./defaultInstance.json");
defaultInstance.id = uuid();
defaultInstance.entries.map((entry) => {
    entry.id = uuid();
    return entry;
})



class ChatCard extends Component {


    static styles = (theme) => ({
        mainContainer: {
            width: '100%',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        conversationEntries: {
            maxHeight: '500px',
            overflow: 'scroll'
        }
    });

    static propTypes = {
        user: PropTypes.object,
        conversation: PropTypes.object
    };

    static defaultProps = {
        user: null,
        conversation: defaultInstance
    };

    handleStart() {
        console.log('handle start called');
    }

    handleDrag() {
        console.log('handle drag called');
    }

    handleStop() {
        console.log('handle stop called');
    }

    render() {
        const { classes, history, user, conversation } = this.props;


        return (
            <Draggable
                handle=".drag-handle"
                defaultPosition={{ x: 0, y: 0 }}
                onStart={this.handleStart}
                onDrag={this.handleDrag}
                onStop={this.handleStop}
                position={null}>
                <Card className={classes.mainContainer}>
                    <CardHeader
                        avatar={
                            <Avatar aria-label="Recipe" className={classes.avatar}>
                                SB
                    </Avatar>
                        }
                        action={
                            <IconButton>
                                <MoreVertIcon />
                            </IconButton>
                        }
                        className="drag-handle"
                        title={conversation.title}
                        subheader={moment(conversation.lastActivity).format('DD-MM-YYYY HH:mm:ss')}
                    />
                    <Collapse in={true} timeout="auto" unmountOnExit>
                        <CardContent>
                            <List className={classes.conversationEntries}>
                                {conversation.entries.map((entry, idx) => <ChatBubble conversationEntry={entry} key={idx} />)}
                            </List>
                            <Grid item xs={12}>
                                <hr />
                                <FormControl fullWidth>
                                    <Input
                                        id="sendMessageTextField"
                                        value={this.state.messageToSend}
                                        onKeyPress={this.onChatKeyPress}
                                        onChange={this.onChatMessageChange}
                                        placeHolder={'Message Sparky'}
                                        multiline
                                        endAdornment={
                                            <InputAdornment position="end">
                                                <IconButton color="secondary">
                                                    <SendIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                    />
                                </FormControl>
                            </Grid>
                        </CardContent>
                    </Collapse>
                    <CardActions className={classes.actions} disableActionSpacing>
                        <IconButton
                            className={classNames(classes.expand, {
                                [classes.expandOpen]: this.state.expanded,
                            })}
                            onClick={this.handleExpandClick}
                            aria-expanded={this.state.expanded}
                            aria-label="Show more"
                        >
                            <ExpandMoreIcon />
                        </IconButton>
                    </CardActions>
                </Card>
            </Draggable>
        );
    }

    windowResize() {
        this.forceUpdate();
    }

    constructor(props, context) {
        super(props, context);
        this.windowResize = this.windowResize.bind(this);
        this.state = {
            avatarMouseOver: false
        }

        this.handleStart = this.handleStart.bind(this);
        this.handleStop = this.handleStop.bind(this);
        this.handleDrag = this.handleDrag.bind(this);

        window.addEventListener('resize', this.windowResize);
    }
}


const _component = compose(
    withRouter,
    withStyles(ChatCard.styles),
    withTheme()
)(ChatCard);
export default _component;