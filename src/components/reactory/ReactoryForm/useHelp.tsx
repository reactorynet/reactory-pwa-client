import React from 'react';
import { useReactory } from '@reactory/client-core/api';
import {
  ReactoryFormHelpHook
} from './types';

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
          <h1>Report</h1>
          <p>Report content goes here</p>
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

  return {
    HelpModal,
    HelpButton,
  }
}