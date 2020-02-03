import React, { Component,Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withRouter, BrowserRouter } from 'react-router-dom';
import { Button, Icon } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import moment from 'moment';
import { withApi, ReactoryApi } from '@reactory/client-core/api/ApiProvider';




class StaticContent extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      content: {
        title: `Loading`,
        content: 'Loading',
        createdBy: {
          id: null,
          fullName: 'Loading',
        },
        createdAt: moment(),
        topics: [],
        published: false,
      },
      editing: false
    }
  }

  componentDidMount(){
    const that = this;
    const getSlug = () => {
      if(that.props.slugSource === 'property') return that.props.slug;
      if(that.props.slugSource === 'route' && typeof that.props.slugSourceProps === 'object') {      
        const { paramId } = that.props.slugSourceProps;
        return that.props.history.match.params[paramId];
      }
    };


    this.props.api.graphqlQuery(`
    query ReactoryGetContentBySlug($slug: String!) {
      ReactoryGetContentBySlug(slug: $slug) {
        id
        slug
        title
        content
        topics
        published
        createdBy {
          id
          fullName
        }
        createdAt
      }
    }
    `, { slug: this.props.slug }).then((result) => {
      if(result.data && result.data.ReactoryGetContentBySlug) {
        that.setState({ content: result.data.ReactoryGetContentBySlug });
      } else {
        that.setState({ content: { content: `Content for content: "${this.props.slug}" does not exists, please create it.`, title: "Not Found" } });
      }
    }).catch((err) => {
      that.setState({ content: {
        title: 'Error',
        content: `Error Loading Content: ${err.message}`,
        createdBy: {
          id: null,
          fullName: 'Bugsly',
        },
        createdAt: moment()
      } });
    });
  }
  
  render(){
    const containerProps = {};  
    let isDeveloper = this.props.api.hasRole(['DEVELOPER']);
    
    const edit = () => {
      this.setState({ editing: !this.state.editing })
    };

    const { editing } = this.state;

    const ContentCapture = this.props.api.getComponent('static.ContentCapture');
        
      return (
        <Fragment>      
          {editing === true ? 
            <ContentCapture slug={this.props.slug} formData={{ slug: this.props.slug }} mode="edit"></ContentCapture> : 
            <div {...containerProps} dangerouslySetInnerHTML={{__html: this.state.content.content}}></div>
          }        
        {isDeveloper === true ? 
          <div>
            <hr/>
            <Button onClick={edit} color="primary">
              <Icon>{editing === false ? 'pencil' : 'check' }</Icon>{editing === false ? 'Edit' : 'Done' }
            </Button>
          </div> : null }
        </Fragment>
      )        
  }
}

StaticContent.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi).isRequired,
  showTitle: PropTypes.bool,
  slug: PropTypes.string.isRequired,
  slugSource: PropTypes.string,
  slugSourceProps: PropTypes.any,
  history: PropTypes.instanceOf(BrowserRouter).isRequired
};

StaticContent.defaultProps = {
  slugSource: 'property' // can be route
};

const StaticContentComponent = compose(withApi, withRouter, withTheme, withStyles(StaticContent.styles))(StaticContent);

StaticContentComponent.meta = {
  nameSpace: 'core',
  name: 'StaticContent',
  version: '1.0.0',
  component: StaticContentComponent,
  tags: ['static content', 'html'],
  description: 'A simple html container component',  
};

export default StaticContentComponent;