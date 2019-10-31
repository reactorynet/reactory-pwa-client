import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withRouter, BrowserRouter } from 'react-router-dom';
import { withStyles, withTheme } from '@material-ui/core/styles';
import moment from 'moment';
import { withApi, ReactoryApi } from '@reactory/client-core/api/ApiProvider';



class StaticContent extends Component {

  constructor(props, context){
    super(props, context);
    this.state = {
      content: {
        title: 'loading...',
        content: 'loading...',
        createdBy: {
          id: null,
          fullName: 'loading...',
        },
        createdAt: moment()
      }
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
    return (<div {...containerProps} dangerouslySetInnerHTML={{__html: this.state.content.content}}></div>)
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