import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
//import { withRouter, match } from 'react-router-dom';
import { Icon, IconButton } from '@mui/material';
import { withStyles, withTheme, } from '@mui/styles';
import moment, { Moment } from 'moment';
import { withReactory } from '@reactory/client-core/api/ApiProvider';
import classNames from 'classnames';
import ReactDOM from 'react-dom';
import { useNavigate, useParams } from 'react-router';
import { margin } from '@mui/system';

export interface ReactoryStaticContentProps {
  id: string,
  reactory?: Reactory.Client.ReactorySDK,
  classes?: any,
  showTitle?: boolean,
  title?: string,
  published?: boolean,
  slug: string,
  slugSource?: string,
  slugSourceProps?: { 
    paramId: string,  
    slugPrefix?: string
  },
  defaultSlug?: string,
  defaultValue?: any,
  placeHolder?: string,
  propertyBag?: any,
  viewMode?: string,
  formFqn?: string,
  mode?: string | "edit" | "view",
  templateEngine: 'lodash',
  match: any,
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

export interface ReactoryStaticContent {
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

export interface ReactoryStaticContentState {
  content: ReactoryStaticContent,
  original: string | null,
  editing: boolean,
  found: boolean,
  [key: string]: any
};

export interface ComponentMountInfo {
  id: string,
  component: string,
  props: any,
  content: string
}

export type ReactoryStaticContentComponent = React.FC<Partial<ReactoryStaticContentProps>>;


const StaticContentStyles = (theme: any): any => {
  const { palette } = theme;

  return {
    editIcon: {
      float: 'right',
      margin: '10px',
      fontSize: '18px'
    },
    contentContainer: {
      margin: theme.spacing(1),
    },
    buttonContainer: {
      minHeight: '40px'
    },
    staticContentContainer: {
      display: 'flex',
      justifyContent: 'centre',
      minHeight: '40px',      
      padding: theme.spacing(1),
      margin: theme.spacing(1),
      marginBottom: '50px'
    },
    staticContainerDeveloper: {
      '&:hover': {
        outline: `1px solid ${palette.primary.main}`,
        cursor: 'pointer'
      }
    },
  }
};

/**
 * Static Content Component. Used for editing static content using a wysiwig editor
 * @param props 
 * @returns 
 */
const StaticContent: React.FC<ReactoryStaticContentProps> = (props: ReactoryStaticContentProps) => {

  const { reactory } = props;

  const { MaterialCore } = reactory.getComponents<any>(['material-ui.MaterialCore'])
  const navigate = useNavigate();
  const params = useParams();
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
    defaultSlug,
    match,
    propertyBag = {},
    defaultValue = ""
  } = props;

  const [state, setState] = React.useState<ReactoryStaticContentState>({
    id: null,
    content: {
      title: title || `Loading`,
      content: 'Loading',
      createdBy: {
        id: null,
        fullName: 'Loading',
      },
      createdAt: moment(),
      topics: [],
      published: published || false,
    },
    editing: props.isEditing === true,
    original: null,
    found: false,
    parsed_content: null
  });

  const [version, setVersion] = React.useState<number>(0)
  const [allowEdit, setAllowEdit] = React.useState<boolean>(false);
  const [components, setComponents] = React.useState<ComponentMountInfo[]>([]);

  const containerProps = {};
  const {
    editing,
    found, 
    content 
  } = state;

  const getSlug = () => {
    if (slugSource === 'property' || slugSource === null || slugSource === undefined) return slug;
    if (slugSource === 'route' && typeof slugSourceProps === 'object' && params) {
      const { paramId, slugPrefix } = slugSourceProps;
      const routeValue = params[paramId];
      if (routeValue) return `${slugPrefix}${routeValue}`;
      if (defaultSlug) return `${slugPrefix}${defaultSlug}`;
    }

    return props.slug
  };

  const parseTemplate = ($template) => {
    let $content: string = $template;
    if (propertyBag && $content && $content.indexOf("${") >= 0) {
      try {
        $content = reactory.utils.template($content)({ props: { ...propertyBag, reactory } });    
      } catch (templateError) {
        $content = `Could not process template ${templateError}\\n${$content}`;
      }
    }
    
    if (propertyBag && $content && $content.indexOf("<reactory ") >= 0) {
      let componentsToMount: ComponentMountInfo[] = [];

      const getNextComponent = (_content: string): ComponentMountInfo => {        
        const startPos: number = _content.indexOf("<reactory ");
                  
        if(startPos < 0) return { id: null, component: null, props: null, content: _content }; 
        
        let endPos: number = _content.indexOf(" />", startPos);
        if (endPos == -1) {
          endPos = _content.indexOf("</reactory>");
          if (endPos == -1) throw new Error(`Malformed <reactory /> tag at pos ${startPos}. No closing tag found in static content with slug ${getSlug()}`)
          else {
            endPos += "</reactory>".length
          }
        }

        const foundTag = _content.substring(startPos, endPos);
        let component = "";
        let props = {};

        let parser = new DOMParser();        
        const xmlDoc: Document = parser.parseFromString(foundTag, "application/xml");
        
        if(xmlDoc.childNodes.length > 0) {
          xmlDoc.childNodes.forEach((el: any) => {
            if(el.nodeName === "reactory") {
              if(el?.attributes && el.attributes?.length > 0) {                
                for(let attr_idx = 0; attr_idx < el.attributes.length; attr_idx += 1) {
                  let attr = el.attributes[attr_idx];   
                  const key = attr.nodeName.split("-")[1];
                  if (key === "component") component = attr.value;
                  else {                    
                    const $value: string = `${attr.value}`.trim();
                    const $propname: string = `${attr.nodeName.replace("reactory-props-", "")}`;                    
                    if($value.indexOf("bool:") === 0) {
                      props[$propname] = $value.split(":")[1].trim() === "true";
                    } else if ($value.indexOf("object:{") === 0) {
                      props[$propname] = JSON.parse(`{attr.value}`.substring(6,$value.length));
                    } else if ($value.indexOf("int:") === 0) {                      
                      props[$propname] = parseInt($value.split(":")[1].trim());                   
                    } else if ($value.indexOf("float:") === 0) {
                      props[$propname] = parseFloat($value.split(":")[1].trim());
                    } else if ($value.indexOf("moment:") === 0) {
                      props[$propname] = reactory.utils.moment($value.substring(4,$value.length));
                    } else if (attr.value && attr.value.indexOf("date:") === 0) {
                      props[$propname] = new Date($value.substring(4,$value.length));
                    }
                    else {
                      props[$propname] = $value;
                    }                    
                  }
                }                 
              }
            }
          })  
        }
                
        const mountpoint_id = `reactory_component_mount_${getSlug()}_${component}_${reactory.utils.hashCode(JSON.stringify(props))}`;

        const newTag = `<div id="${mountpoint_id}"></div>`
        _content = _content.replace(foundTag, newTag);
        
        return {
          id: mountpoint_id,
          component,
          props,
          content: _content, 
        }
      }

      while($content.indexOf("<reactory ") >= 0) {        
        const nextComponent = getNextComponent($content);
        if(nextComponent.component) {
          componentsToMount.push(nextComponent);
        }
        $content = nextComponent.content;
      }
      setComponents(componentsToMount)
    }
    return $content;
  }

  const getData = () => {
    if(state.found === true) return;
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
          
          if(staticContent !== null) {
            let nextState = {
              content: { ...staticContent },
              found: true,
              original: staticContent.content,
              editing: state.editing,
              parsed_content: parseTemplate(staticContent.content)
            }

            if (nextState.content.title === null && title !== null) nextState.content.title = title;
            if (nextState.content.published === null && published !== null) nextState.content.published = published;

            setState(nextState);
          }          
        } catch (err) { }

      } else {
        const user = reactory.getUser();

        setState({
          ...state,
          parsed_content: `Content for content: "${getSlug()}" does not exists, please create it.`,
          content: {
            content: `Content for content: "${getSlug()}" does not exists, please create it.`,
            title: title || "Not Found",
            createdBy: { id: user.id, fullName: user.loggedIn.user.firstName },
            createdAt: moment(),
            published: published || false,
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

  const getIsDeveloper = () => { 
    let isDeveloper = reactory.hasRole(['DEVELOPER']) && reactory.isDevelopmentMode() === true;
    return isDeveloper;
  }

  const getCanEdit = () => {
    let canEdit = reactory.hasRole(editRoles);
    return canEdit;
  }

  //canEdit = canEdit === false && isDeveloper === true ? true : canEdit;
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


  const getContent = () => {

    const portals = components.map((mountInfo) => {
      const portalContainer = document.getElementById(mountInfo.id);
      const MountableComponent = reactory.getComponent<any>(mountInfo.component);

      if(!portalContainer || MountableComponent === null) return null
            
      return ReactDOM.createPortal(<MountableComponent  { ...mountInfo.props }/>, portalContainer);
    })

    return (
    <React.Fragment>      
        <div {...containerProps} ref={ref => contentRef.current = ref} dangerouslySetInnerHTML={{ __html: state.parsed_content }}></div>
        {portals}
    </React.Fragment>)  
  }

  let contentComponent = found === true ? getContent() : props.defaultValue;
  let ContentCaptureComponent = reactory.getComponent<any>(formFqn);
  let contentCaptureProps: any = {
    formData: { 
      slug: getSlug(), 
      title: state.content.title, 
      published: state.content.published, 
      content: state.found === true ? content.content : default_content 
    },
    mode: "edit",
    id: props.id,
    uiSchemaKey: viewMode || 'inline',
    onMutateComplete: (_newData) => {
      setState({ ...state, found: false });
    },
    helpTopics: props.helpTopics,
    helpTitle: props.helpTitle,
    placeHolder: props.placeHolder,
  };

  useEffect(() => {
    // this call ensures we are loading the ContentCapture form
    // for the logged in user.
    reactory.form("ContentCapture");
    getData();
    reactory.on("onReactoryDevelopmentModeChanged", onDevelopmentModeChanged);

    return () => {
      reactory.removeListener("onReactoryDevelopmentModeChanged", onDevelopmentModeChanged);
    }
  }, []);
  
  useEffect(() => {
    getData()
  }, [props.slug, state.editing, state.found])

  useEffect(() => {
    if (state.found) {
      setState({ ...state, parsed_content: parseTemplate(state.content.content) });
    }
  }, [props.propertyBag])

  return (        
    <>
      <div className={`${classes.contentContainer}`}>
        {editing === true ? <ContentCaptureComponent  {...contentCaptureProps} /> : contentComponent}
      </div>
      <div className={`${classes.buttonContainer}`}>
        {getCanEdit() === true && getIsDeveloper() === true && editWidget}
      </div>
    </>
  )


};



const StaticContentComponent: any = compose(withReactory, withTheme, withStyles(StaticContentStyles))(StaticContent);

StaticContentComponent.meta = {
  nameSpace: 'core',
  name: 'StaticContent',
  version: '1.0.0',
  component: StaticContentComponent,
  tags: ['static content', 'html'],
  description: 'A simple html container component',
};

export default StaticContentComponent;