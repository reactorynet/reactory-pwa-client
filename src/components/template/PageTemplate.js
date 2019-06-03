import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import {
  Fab,
  Button, Icon,
  Grid,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { compose } from 'redux';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
import { Typography } from '@material-ui/core';


class PageBuilder extends Component {

  static styles = (theme) => {
    return {}
  }

  static propTypes = {
    api: PropTypes.instanceOf(ReactoryApi).isRequired,
    pageId: PropTypes.string,
  }

  static defaultProps = {
    pageId: null
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      loginToken: null,
      pageData: props.pageData || null,
      pageId: props.match.params.pageId,
      clientId: null,
      authToken: props.api.readObjectWithKey('boxcommerce_token') || null,
      pagesData: null,
    }
    this.onPublishPage = this.onPublishPage.bind(this)
    this.onPageSubmit = this.onPageSubmit.bind(this)
    this.onLoginFormSubmit = this.onLoginFormSubmit.bind(this)
    this.componentDefs = props.api.getComponents([
      'core.ReactoryForm', 
      'core.PageIntegrations', 
      'core.FullPageDialog', 
      'forms.PageEditorForm',
      'forms.ContentPagesList',
    ])
    this.loadPages = this.loadPages.bind(this)
    this.loadPageContent = this.loadPageContent.bind(this)
  }

  componentDidMount() {
    //load page data
    if(this.state.authToken && this.state.pagesData === null) this.loadPages()
    if(this.state.pageId && !this.state.pageContent) this.loadPageContent()
  }

  loadPages(){
    const { PageIntegrations } = this.componentDefs
    const { api } = this.props;
    const that = this;
    const tokenObject = api.readObjectWithKey('boxcommerce_token');
    PageIntegrations.boxcommerce.listPages(tokenObject.baseUrl, tokenObject.access_token).then((pagesData) => {
      that.setState({ pagesData })      
    }).catch((pagesError) => {
      that.setState({ pagesData: [] })
    })
  }

  loadPageContent(){
    const { PageIntegrations } = this.componentDefs
    const { api } = this.props;
    const that = this;
    const tokenObject = api.readObjectWithKey('boxcommerce_token');
    PageIntegrations.boxcommerce.getPage(tokenObject.baseUrl, tokenObject.access_token, this.state.pageId).then((pageData) => {      
      that.setState({ pageData: pageData })
    }).catch((contentError) => {
      that.setState({ pageData: "<p>Error No Content</p>" })
    })
  }

  onPublishPage(pageData) {

  }

  onPageSubmit(data){
    //console.log('Page submit', {data});
  }

  onLoginFormSubmit(loginForm){
    //console.log('Login Form Submit', loginForm);
    //do login with integration
    const { PageIntegrations } = this.componentDefs
    const that = this;
    const { api } = this.props;
    const { 
      baseUrl,
      email, 
      password,
      clientId,
    } = loginForm.formData;
    
    PageIntegrations.boxcommerce.login(`https://${clientId}.${baseUrl}`, email, password, clientId).then((loginResponse) => {
      //console.log('Logged in with boxcommerce', loginResponse);      
      that.setState({ authToken: loginResponse }, ()=>{ 
        api.storeObjectWithKey('boxcommerce_token', { ...loginResponse, baseUrl: `https://${clientId}.${baseUrl}`} );
        that.loadPages()
      });
    }).catch((err) => {
      console.error('could not login')
    })

  }

  render() {
    const { ReactoryForm, PageEditorForm, ContentPagesList } = this.componentDefs;
    const { match, api } = this.props;
    const { pageData, pagesData, authToken } = this.state; 
    const user = api.getUser()

    let pageId = null;

    if(match.params.pageId){
      pageId = match.params.pageId
    }

    const logout = () => {
      api.deleteObjectWithKey("boxcommerce_token");
      this.forceUpdate();
    }

    return (
      <Grid container spacing={8}>
        <Grid item md={3}>
        { authToken === null ? <ReactoryForm formId={"LoginForm"} formData={{email: user.email }} onSubmit={this.onLoginFormSubmit}>
          <Button type="submit" variant="fab" color="secondary"><Icon>lock_open</Icon></Button>
        </ReactoryForm> : null }
        { authToken !== null ? <ContentPagesList formId={"ContentPages"} formData={pagesData}>
          <Button type="button" variant="text" color="secondary" onClick={logout}><Icon>lock</Icon></Button>
          <Fab type="submit" color="primary"><Icon>save</Icon></Fab>          
        </ContentPagesList> : null }        
        </Grid>
        <Grid item md={9}>
          { authToken ? 
          <PageEditorForm onSubmit={this.onPageSubmit} formData={pageData}>
            
          </PageEditorForm> : <p>Login To Edit Pages</p> }
        </Grid>
      </Grid>
    )
  }
}

export default {
  PageBuilderComponent: compose(withApi, withStyles(PageBuilder.styles), withTheme, withRouter)(PageBuilder)
}