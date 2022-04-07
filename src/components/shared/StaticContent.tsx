import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { withRouter, match } from 'react-router-dom';
import { Icon, IconButton } from '@mui/material';
import { withStyles, withTheme, } from '@mui/styles';
import moment, { Moment } from 'moment';
import ReactoryApi, { withApi } from '@reactory/client-core/api';

interface ReactoryStaticContentProps {
  id: string,
  reactory: ReactoryApi,
  classes?: any,
  showTitle: boolean,
  title: string,
  published?: boolean,
  slug: string,
  slugSource?: string,
  slugSourceProps?: any,
  defaultValue?: any,
  placeHolder?: string,
  propertyBag?: any,
  viewMode?: string,
  formFqn?: string,
  mode?: string | "edit" | "view",
  templateEngine: 'lodash',
  match: match,
  location: any,
  history: any,
  editAction?: string | "inline" | "link",
  editLink?: string,
  editRoles?: string[],
  viewRoles?: string[],
  autoSave?: string[],
  helpTopics?: string[],
  helpTitle?: string,
  throttle?: number,
  showEditIcon?: boolean,
  isEditing?: boolean

}

interface ReactoryStaticContent {
  title: string,
  content: string,
  createdBy?: {
    id: string,
    fullName: string,
  },
  createdAt: Moment,
  topics?: string[],
  published?: boolean,
}

interface ReactoryStaticContentState {
  content: ReactoryStaticContent,
  original: string | null,
  editing: boolean,
  found: boolean,
  [key: string]: any
};


const StaticContent = (props: ReactoryStaticContentProps) => {

  const { reactory } = props;

  const { MaterialCore } = reactory.getComponents(['material-ui.MaterialCore'])

  const {
    classes,
    viewRoles,
    editRoles = ['DEVELOPER'],
    formFqn = 'static.ContentCapture',
    viewMode,
    editLink = '/Forms/ContentCapture/edit/',
    slug,
    title,
    published,
    slugSource,
    slugSourceProps,
    match,
    propertyBag = {},
    defaultValue = ""
  } = props;

  const [state, setState] = React.useState<ReactoryStaticContentState>({
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
    editing: props.isEditing === true,
    original: null,
    found: false,
    parsed_content: null
  });

  const [version, setVersion] = React.useState<number>(0)

  const containerProps = {};
  const {

    editing, found, content } = state;

  const getSlug = () => {
    if (slugSource === 'property' || slugSource === null || slugSource === undefined) return slug;

    if (slugSource === 'route' && typeof slugSourceProps === 'object') {
      const { paramId } = slugSourceProps;
      return match.params[paramId];
    }

    return props.slug
  };

  const parseTemplate = ($template) => {
    let $content = $template;
    if (propertyBag && $content && $content.indexOf("${") >= 0) {
      try {
        $content = reactory.utils.template($content)({ props: { ...propertyBag, reactory } });
      } catch (templateError) {
        $content = `Could not process template ${templateError}\\n${$content}`;
      }
    }

    return $content;
  }

  const getData = (formData) => {
    reactory.graphqlQuery(`
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
    `, { slug: getSlug() }, { fetchPolicy: 'network-only' }).then((result: any) => {
      if (result.data && result.data.ReactoryGetContentBySlug) {
        const staticContent: ReactoryStaticContent = result.data.ReactoryGetContentBySlug;

        try {

          setState({
            content: { ...staticContent },
            found: true,
            original: staticContent.content,
            editing: state.editing,
            parsed_content: parseTemplate(staticContent.content)
          });

        } catch (err) { }

      } else {
        const user = reactory.getUser();

        setState({
          ...state,
          parsed_content: `Content for content: "${getSlug()}" does not exists, please create it.`,
          content: {
            content: `Content for content: "${getSlug()}" does not exists, please create it.`,
            title: "Not Found",
            createdBy: { id: user.id, fullName: user.fullName },
            createdAt: moment(),
            published: false,
            topics: ["new content"],
          }, found: false
        });
      }
    }).catch((err) => {
      setState({
        ...state,
        parsed_content: `Error Loading Content: ${err.message}`,
        content: {
          title: 'Error',
          content: `Error Loading Content: ${err.message}`,
          createdBy: {
            id: null,
            fullName: 'Bugsly',
          },
          createdAt: moment()
        }
      });
    });
  };

  let isDeveloper = reactory.hasRole(['DEVELOPER']) && reactory.isDevelopmentMode() === true;
  let canEdit = reactory.hasRole(editRoles);

  canEdit = canEdit === false && isDeveloper === true ? true : canEdit;
  const edit = () => {
    if (props.editAction && props.editAction === "link") {
      window.open(`${editLink}?slug=${slug}&title=${title}&published=${published === true}`, '_new');
    } else {
      setState({ ...state, editing: !state.editing });
    }

  };

  const onDevelopmentModeChanged = () => {
    setVersion(version + 1);
  }

  let editWidget = (<IconButton onClick={edit} color="primary" size={'small'} className={classes.editIcon}>
    <Icon>{editing === false ? 'edit' : 'check'}</Icon>
  </IconButton>)

  const contentRef = React.useRef<HTMLDivElement>(null);

  let default_content = '';
  if (typeof props.defaultValue === 'string') default_content = props.defaultValue;
  else default_content = '';

  let contentComponent = found === true && content.published === true ? (<div {...containerProps} ref={ref => contentRef.current = ref} dangerouslySetInnerHTML={{ __html: state.parsed_content }}></div>) : props.defaultValue;
  let ContentCaptureComponent = reactory.getComponent(formFqn);
  let contentCaptureProps: any = {
    formData: { slug: getSlug(), title: state.title, published: state.content.published, content: state.found === true ? content.content : default_content },
    mode: "edit",
    id: props.id,
    uiSchemaKey: viewMode || 'default',
    onMutateComplete: (_newData) => {
      getData(null)
    },
    helpTopics: props.helpTopics,
    helpTitle: props.helpTitle,
    placeHolder: props.placeHolder,
  };

  useEffect(() => {
    reactory.form("ContentCapture");
    getData(null);
    reactory.on("onReactoryDevelopmentModeChanged", onDevelopmentModeChanged);

    return () => {
      reactory.removeListener("onDevelopmentModeChanged", onDevelopmentModeChanged);
    }
  }, []);

  useEffect(() => {
    setVersion(version + 1);;
  }, [reactory.$development_mode]);


  useEffect(() => {
    getData(null)
  }, [props.slug])


  useEffect(() => {
    //bind components on page.
    if(contentRef.current && contentRef.current.innerHTML) {
      
    }
  }, [contentRef.current])

  useEffect(() => {
    if (state.found) {
      setState({ ...state, parsed_content: parseTemplate(state.content.content) });
    }
  }, [props.propertyBag])

  const ContentContainer = React.useRef<HTMLDivElement>(null);

  return (        
    <div className={`${classes.staticContentContainer} ${isDeveloper === true ? classes.staticContainerDeveloper : ''}`}>
      {canEdit === true && reactory.$development_mode === true && editWidget}
      {editing === true ? <ContentCaptureComponent  {...contentCaptureProps} /> : contentComponent}
    </div>
  )


};

const StaticContentStyles = (theme: any): any => {
  const { palette } = theme;

  return {
    editIcon: {
      float: 'right',
    },
    staticContentContainer: {
      padding: theme.spacing(2)
    },
    staticContainerDeveloper: {
      '&:hover': {
        outline: `1px solid ${palette.primary.main}`,
        cursor: 'pointer'
      }
    },
  }
};

const StaticContentComponent: any = compose(withApi, withRouter, withTheme, withStyles(StaticContentStyles))(StaticContent);

StaticContentComponent.meta = {
  nameSpace: 'core',
  name: 'StaticContent',
  version: '1.0.0',
  component: StaticContentComponent,
  tags: ['static content', 'html'],
  description: 'A simple html container component',
};

export default StaticContentComponent;