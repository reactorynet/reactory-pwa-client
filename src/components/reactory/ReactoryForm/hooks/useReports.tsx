import React, { useState } from 'react';
import { useReactory } from '@reactory/client-core/api';


/**
 * 
 * @returns 
 */
// const getPdfWidget = () => {
//   const { ReportViewer, FullScreenModal } = componentDefs;
//   const formDef = formDefinition();
//   let _activeReportDefinition = activeReportDefinition || formDef.defaultPdfReport;
//   if (_activeReportDefinition === null || _activeReportDefinition === undefined) return null;

//   const closeReport = () => {
//     setShowReportModal(false);
//     setActiveReportDefinition(null);
//   }

//   let data = { ...formData }
//   if (_activeReportDefinition && _activeReportDefinition.dataMap) {
//     data = reactory.utils.objectMapper(data, _activeReportDefinition.dataMap);
//   }

//   return (
//     <FullScreenModal open={showReportModal === true} onClose={closeReport}>
//       {activeReportDefinition ? (
//         <ReportViewer
//           {...{ ...activeReportDefinition, data }}
//         />) : null}
//     </FullScreenModal>
//   )
// };

interface ReportComponents {
  FullScreenModal: React.FC<{ 
    open: boolean,
    onClose: () => void 
  }>;
  DropDownMenu: React.FC<{ 
    menus: any[],
    onSelect: (evt: any, menuItem: any) => void,
    icon: string
  }>;
  Material: Reactory.Client.Web.IMaterialModule;
}

const DEPENDENCIES = [ 
  'core.FullScreenModal',
  'core.DropDownMenu',
  'material-ui.Material'
];

export const useReports = (props) => { 
  const { formDefinition } = props;
  const reactory = useReactory();
  const { 
    getComponents
  } = reactory;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [reportDefintion, setReportDefinition] = useState<Reactory.Forms.IReactoryPdfReport>(null);
  const components = getComponents<ReportComponents>(DEPENDENCIES);
  const {
    FullScreenModal,
    DropDownMenu,
    Material,
  } = components;

  const ReportModal = () => { 
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

  let ReportButton = null;

  if (reactory.utils.lodash.isArray(formDefinition.reports) === true && formDefinition.reports.length > 0) {

    const onDropDownSelect = (evt, menuItem: any) => {
      reactory.log('Report Item Selected', { evt, menuItem });
      // setShowReport(menuItem.data);
    };

    let reportMenus = formDefinition.reports.map((reportDef: any, index) => {
      return {
        title: reportDef.title,
        icon: reportDef.icon,
        key: index,
        id: `exportButton_${index}`,
        data: reportDef,
        disabled: reactory.utils.template(reportDef.disabled || "false")({ props: props }) === 'true',
      }
    });      
    ReportButton = reportMenus.length > 0 ? 
    // @ts-ignore
    (<DropDownMenu menus={reportMenus} onSelect={onDropDownSelect} icon={"print"} />) : null;
  }

  const toggleReport = () => {
    setIsOpen(!isOpen);
  }

  return {
    ReportButton,
    ReportModal,
    toggleReport,
  }
};