import React from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ReactoryFormHelpHook
} from '../types';



// const getHelpScreen = () => {

//   const { HelpMe } = componentDefs;
//   let topics = [];
//   if (formDefinition.helpTopics) topics = [...formDefinition.helpTopics]
//   if (props.helpTopics) topics = [...props.helpTopics, ...topics];
//   const closeHelp = e => setShowHelpModal(false);

//   const allowSupportRequest = () => {
//     uiSchema;
//     if (uiSchema && uiSchema['ui:form'] && uiSchema['ui:form'].allowSupportRequest === false) return false;
//     return true;
//   }

//   return (
//     <HelpMe
//       topics={topics}
//       tags={formDefinition.tags}
//       title={props.helpTitle || formDefinition.title}
//       open={showHelpModal === true}
//       allowSupportRequest={allowSupportRequest()}
//       onClose={closeHelp}>
//     </HelpMe>
//   )
// };

interface HelpComponents {
  FullScreenModal: React.FC<{ 
    open: boolean,
    onClose: () => void 
  }>;
  Material: Reactory.Client.Web.IMaterialModule;
}

export const useHelp: ReactoryFormHelpHook = ({ formDefinition }) => {
  const {
    useState
  } = React;
  const reactory = useReactory();
  const {
    FullScreenModal,
    Material
  } = reactory.getComponents<HelpComponents>([
    'core.FullScreenModal',
    'material-ui.Material'
  ]);

  const { 
    MaterialCore, 
    MaterialIcons 
  } = Material;

  const { 
    Button, 
    Icon 
  } = MaterialCore;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [helpDefinition, setHelpDefinition] = useState<unknown>(null);

  const HelpModal = () => { 
    return (<FullScreenModal 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        >
        <div>
          <h1>Help</h1>
          <p>Help content goes here</p>
        </div>
        </FullScreenModal>)
  }

  const HelpButton = () => { 
    return (<Button 
      variant="text" 
      onClick={() => { setIsOpen(!isOpen) }} 
      color="secondary">
        <Icon>print</Icon>
      </Button>);
  }

  const toggleHelp = () => { 
    setIsOpen(!isOpen);
  }

  return {
    toggleHelp,
    HelpModal,
    HelpButton,
  }
}