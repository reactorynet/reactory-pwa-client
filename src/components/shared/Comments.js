import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {withStyles, withTheme} from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import TextField from '@material-ui/core/TextField'
import { List, ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core'
import Avatar from '@material-ui/core/Avatar';

import { compose } from 'redux'

class Comment extends Component {
  static styles = theme => {
    return {
      commentRoot: {

      }
    }
  }

  static propTypes = {
    comment: PropTypes.object.isRequired,
    key: PropTypes.string,
    alt: PropTypes.bool
  }


  render(){
    const { classes, comment, key } = this.props;

    return (
      <ListItem key={key}>
        <Avatar alt={comment.who.firstName} src={comment.who.avatar}></Avatar>
        <ListItemText>{comment.text}</ListItemText>
      </ListItem>
    )
  }
}

export const CommentComponent = compose(
  withStyles(Comment.styles),
  withTheme()
)(Comment)

class Comments extends Component {
  
  static styles = theme => {
    const primaryDark = theme.palette.primary.dark
    return {
      commentsRoot: {
        width: '100%'          
      },
      textField: {
        width: '100%',
      }
    }
  }

  static propTypes = {
    comments: PropTypes.array,
    newCommentAdded: PropTypes.func,    
  }

  static defaultProps = {
    newCommentAdded : (comment) => { //console.log('Comment added', comment)}
  }

  setNewCommentText(evt){
    this.setState({newCommentText: evt.target.value})
  }

  newCommentTextKeyPress(evt){
    if(evt.charCode === 13){
      evt.preventDefault()      
      this.props.newCommentAdded(this.state.newCommentText)
      this.setState({newCommentText: ''})
    }
  }

  render(){

    const { classes, comments } = this.props
    const { newCommentText } = this.state
    return (
      <div className={classes.commentsRoot}>
        <form>
            <TextField 
              className={classes.textField}
              value={newCommentText}
              label="New Comment"
              onChange={this.setNewCommentText}
              onKeyPress={this.newCommentTextKeyPress}
            />
        </form>
        <List>
          {comments.map((comment, index)=> {             
            return (
            <ListItem key={index} className={classes.listItem}>              
              <Avatar alt={`${comment.who.firstName} ${comment.who.lastName}`} src={comment.who.avatar} ></Avatar>
              <ListItemText primary={comment.text} secondary={comment.when.format('DD MMM YY')}/>
            </ListItem>
            )})}
        </List>
      </div>
    )
  }

  constructor(props, context){
    super(props, context)
    this.state = {
      newCommentText: ''
    }
    this.setNewCommentText = this.setNewCommentText.bind(this)
    this.newCommentTextKeyPress = this.newCommentTextKeyPress.bind(this)
  }
}

export default compose(
  withStyles(Comments.styles),
  withTheme()
)(Comments)