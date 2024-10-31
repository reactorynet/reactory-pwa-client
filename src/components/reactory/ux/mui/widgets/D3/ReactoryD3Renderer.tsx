// Reactory component that is used to render a D3 graph

import Reactory from "@reactory/reactory-core";
import { useReactory } from "@reactory/client-core/api";

export interface ReactoryD3RendererDependencies { 
  Material: Reactory.Client.Web.IMaterialModule;
  React: Reactory.React;  
}

export type ForceDirectedNodeRenderer = (data: any[]) => void

export interface ReactoryD3RendererProps<TData, TForm> {
  reactory: Reactory.Client.ReactorySDK;
  schema: Reactory.Schema.ISchema;
  uiSchema: Reactory.Schema.IUISchema;
  formData: TData;
  formContext: Reactory.Client.IReactoryFormContext<TForm>
  readonly: boolean;
  required: boolean;
  theme: any;
  children: any;
}

const DefaultOptions = {
  renderer: 'D3.ForceDirectedNodeRenderer@1.0.0'  
}

export type TRenderer<TData, TForm> = (props: ReactoryD3RendererProps<TData, TForm>) => JSX.Element;

const ReactoryD3Renderer = (props: ReactoryD3RendererProps<any, any>) => { 

  const reactory = useReactory();

  const { schema, uiSchema, formData } = props;
  const {
    Material,
    React
  }: ReactoryD3RendererDependencies = reactory.getComponents<ReactoryD3RendererDependencies>(['material-ui.Material', 'react.React'])
  
  const { 
    useEffect
  } = React;

  const {
    MaterialCore,
    MaterialStyles
  } = Material;

  const {
    Grid,
    Paper,
    Typography
  } = MaterialCore;

  const {
    makeStyles
  } = MaterialStyles;

  // const useStyles = makeStyles((theme: any) => ({
  //   root: {
  //     flexGrow: 1,
  //   },
  //   paper: {
  //     padding: theme.spacing(2),
  //     textAlign: 'left',
  //     color: theme.palette.text.secondary,
  //   },
  // }));

  // const classes = useStyles({ formData, schema });

  const canvas = React.useRef(null);

  // useEffect(() => { }, [
  //   canvas,
  //   formData    
  // ])

  const getOptions = () => { 
    if(uiSchema) {
      return uiSchema['ui:options'] || DefaultOptions;
    }
  }
  

  return (
    <Grid container>
      <Grid item xs={12} lg={12}>
        <Typography variant="h3">{schema.title}</Typography>      
      </Grid>
      <Grid item xs={12} lg={12}>
      <div ref={(canv) => {
        canvas.current = canv
      }}></div> 
      </Grid>
    </Grid>
  )
};

export default ReactoryD3Renderer;