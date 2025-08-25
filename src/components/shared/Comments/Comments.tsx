import React from 'react'
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';
import TextField from '@mui/material/TextField'
import { List, ListItem, ListItemSecondaryAction, ListItemText } from '@mui/material'
import Avatar from '@mui/material/Avatar';

import { compose } from 'redux'

const Comment = (props: any) => {
  const { comment, key } = props;

  return (
    <ListItem key={key}>
      <Avatar alt={comment.who.firstName} src={comment.who.avatar}></Avatar>
      <ListItemText>{comment.text}</ListItemText>
    </ListItem>
  );
};

export const CommentComponent = Comment;

const Comments = (props: any) => {
  const theme = useTheme();
  const [newCommentText, setNewCommentText] = React.useState('');
  
  const handleNewCommentText = (evt: any) => {
    setNewCommentText(evt.target.value);
  };

  const newCommentTextKeyPress = (evt: any) => {
    if(evt.charCode === 13){
      evt.preventDefault();      
      props.newCommentAdded(newCommentText);
      setNewCommentText('');
    }
  };

  const { comments } = props;
  
  return (
    <div style={{ width: '100%' }}>
      <form>
          <TextField 
            style={{ width: '100%' }}
            value={newCommentText}
            label="New Comment"
            onChange={handleNewCommentText}
            onKeyPress={newCommentTextKeyPress}
          />
      </form>
      <List>
        {comments.map((comment: any, index: number)=> {             
          return (
          <ListItem key={index}>              
            <Avatar alt={`${comment.who.firstName} ${comment.who.lastName}`} src={comment.who.avatar} ></Avatar>
            <ListItemText primary={comment.text} secondary={comment.when.format('DD MMM YY')}/>
          </ListItem>
          )})}
      </List>
    </div>
  );
};

export default Comments;