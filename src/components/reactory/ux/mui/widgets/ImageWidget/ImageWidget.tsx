import { useReactory } from "@reactory/client-core/api";
import { React } from "@reactory/reactory-core";


const default_options = { 
  variant: 'img' 
};

type ImageUploaderHook = (props: {}) => {
  upload: (base64: string, file: File) => Promise<string>
  url: string
  uploadStatus: string
  uploadError: Error | null
}

const NullUploader: ImageUploaderHook = (props: {}) => { 

  return {
    upload: (base64: string, file: File) => Promise.resolve(''),
    url: '',
    uploadStatus: 'idle',
    uploadError: null
  }
}

export default ({ formData, uiSchema, idSchema, schema, formContext }) => {
  const reactory = useReactory();
  const { 
    variant,
    className, 
    styles = {}, 
    jss = {},
    uploader = 'NullUploader',
    uploaderProps = {}
  } = uiSchema['ui:options'] || default_options;

  const { React } = reactory.getComponents<{React: React}>(['react.React']);
  const { Material } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>(['material-ui.Material']);
  const { MaterialStyles, MaterialCore } = Material;
  const jssStyles = MaterialStyles.makeStyles((theme) => jss)({ 
    formData, idSchema, schema, uiSchema, formContext 
  });

  let $uploader = reactory.getComponent<ImageUploaderHook>(uploader)
  const useUploader = uploader !== 'NullUploader' && $uploader ? $uploader : NullUploader;

  const { upload, url } = useUploader(uploaderProps);

  let Uploader = () => null;
  let ImageComponent = (<></>);

  switch (variant) {
    case 'div': {
      ImageComponent = (
        <div className={className} style={styles}></div>
      );
      break;
    }
    case 'avatar': {      
      ImageComponent = (
        <MaterialCore.Avatar 
          key={idSchema.$id} 
          src={formData} 
          className={className} 
          style={styles}>  
        </MaterialCore.Avatar>
      )
      break;
    }
    case 'img':
    default: {
      ImageComponent = (<img 
        src={formData} 
        className={className} 
        style={styles} 
        alt={schema.description || schema.title} 
      />)
      break;
    }
  }

  return (
    <>
      {ImageComponent}
      <Uploader />
    </>
  )
};