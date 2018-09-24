import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';
import { withStyles, withTheme } from '@material-ui/core/styles';

import { EditorState, convertToRaw, ContentState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';

import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import {
  AppBar, Tabs, Tab, 
  Button, Grid, Paper, 
  FormControl, FormHelperText,
  Input, InputLabel, TextField, 
  Typography, List, ListItem, Toolbar,
  ListItemText} from '@material-ui/core';

import SaveIcon from '@material-ui/icons/Save';
import CloseIcon from '@material-ui/icons/Close';


const EmailTemplateItems = [
  { key: 'welcome', title: 'Welcome Email', description: 'Sent to users on registration', params: [] },
  { key: 'forgot-password', title: 'Forgot Password', description: 'Sent to users when triggering password reset', params: [] },
  { key: 'peer-invite', title: 'Peer Invitation', description: 'Sent to users when inviting their peers', params: [] },
  { key: 'survey-invitation', title: 'Survey Invitation', description: 'Sent to users when added to a survey', params: [] },
];

class EmailTemplateEditor extends Component {
  constructor(props, context){
    super(props, context);
    this.state = {
      editorState: EditorState.createEmpty(),
    };

    this.onEditorStateChange = this.onEditorStateChange.bind(this);
    this.saveTemplate = this.saveTemplate.bind(this);
  }

  static propTypes = {

  }

  static styles = (theme) => {
    return {
      templateEditorContainer: {

      }
    }
  }

  onEditorStateChange(editorState){
    this.setState({
      editorState,
    });
  };

  saveTemplate(){
    //console.log
  }

  render(){
    const { classes, templateKey, templateTitle } = this.props;
    const { editorState } = this.state;

    return (
      <div>
        <Toolbar>
            <Button onClick={this.saveTemplate} ><SaveIcon /> Save</Button>
            <Button onClick={this.props.closeEditor}><CloseIcon /> CLOSE</Button>
        </Toolbar>
        <Paper style={{padding: '5px;'}}>
          <Editor
            editorState={editorState}
            wrapperClassName="demo-wrapper"
            editorClassName="demo-editor"
            onEditorStateChange={this.onEditorStateChange} />
        </Paper>
      </div>
    );
  }

}


const EmailTemplateEditorComponent = compose(
  withTheme(),
  withStyles(EmailTemplateEditor.styles),  
  withApollo,
)(EmailTemplateEditor);

class TemplateList extends Component {
  constructor(props, context){
    super(props, context);
    this.state = {
      selected: null,
    }
  }

  static styles = (theme) => {
    return {

    }
  }

  static propTypes = {
    templates: PropTypes.array
  }

  handleTemplateSelect(template){
    console.log('Template item selected', template);
    this.setState({ selected:  template });
  }

  render(){
    const that = this;
    const { classes } = this.props;
    const { selected } = this.state;

    let newTemplateLink = null;

    if(this.props.newOrganizationLink === true){
      const selectNewLinkClick = () => { that.handleTemplateSelect({id: 'new', name: 'NEW'}) };
      newTemplateLink = (
        <ListItem key={-1} dense button onClick={selectNewLinkClick}>              
            <ListItemText primary={'New Template'} secondary={'Add a new template'} />
        </ListItem>)
    }

    const list = (
      <List>
        {EmailTemplateItems.map( (templateItem, index) => {    
          const selectTemplate = () => {
            that.handleTemplateSelect(templateItem);
          }
          return (
            <ListItem key={index} dense button onClick={selectTemplate}>              
              <ListItemText primary={templateItem.title} secondary={templateItem.description} />
            </ListItem>)}) }              
      </List>);

    const closeEditor = ( ) => {
      this.setState( { selected: null } )
    }
    return (
      <div>
        { selected === null ? list : <EmailTemplateEditorComponent templateKey={ selected.key } templateTitle={ selected.title } closeEditor={ closeEditor }/> }  
      </div>
    );
  }
}

const TemplateListComponent = compose(
  withTheme(),
  withStyles(TemplateList.styles),
  withApollo,  
)(TemplateList);



export default {
  TemplateListComponent,
  EmailTemplateEditorComponent
};
