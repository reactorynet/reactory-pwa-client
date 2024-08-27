import React, { useState } from 'react';
import { useReactory } from '@reactory/client-core/api';
import {  
  ReactoryFormExportHook
} from '../types';


/**
 * 
 * @returns 
 */
// const getExcelWidget = () => {
//   const { ReportViewer, FullScreenModal } = componentDefs;
//   const formDef: Reactory.Forms.IReactoryForm = formDefinition();
//   if (formDef !== undefined) {
//     const closeReport = (e: React.SyntheticEvent): void => { setShowExportModal(false); }
//     return (
//       <FullScreenModal open={showExportModal === true} onClose={closeReport}>
//         <ReportViewer
//           engine={'excel'}
//           formDef={formDef}
//           exportDefinition={activeExportDefinition || formDef.defaultExport}
//           useClient={true}
//           data={formData}
//         />
//       </FullScreenModal>
//     )
//   }
// };

interface ExportComponents {
  FullScreenModal: React.FC<{ 
    open: boolean,
    onClose: () => void 
  }>;
  Material: Reactory.Client.Web.IMaterialModule;
}

export const useExports: ReactoryFormExportHook = ({ formDefinition, formData }) => {
  const reactory = useReactory();

  const {
    FullScreenModal,
    Material
  } = reactory.getComponents<ExportComponents>([
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

  const [exportDefinition, setxportDefinition] = useState<Reactory.Forms.IExport>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const ExportModal = () => { 
    return (<FullScreenModal 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        >
        <div>
          <h1>Export</h1>
          <p>Export / Data extract window goes here</p>
        </div>
        </FullScreenModal>)
  }

  const ExportButton = () => { 
    return (<Button 
      variant="text" 
      onClick={() => { setIsOpen(!isOpen) }} 
      color="secondary">
        <Icon>file</Icon>
      </Button>);
  }

  return {
    ExportModal,
    ExportButton,
  }
}
