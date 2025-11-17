import React from 'react';
import { MobileFabsProps } from '../../types';
import { createFileInput } from '../../utils';

interface ExtendedMobileFabsProps extends MobileFabsProps {
  reactory: Reactory.Client.ReactorySDK;
}

const MobileFabs: React.FC<ExtendedMobileFabsProps> = ({
  mobileView,
  onFileUpload,
  onToggleView,
  reactory
}) => {
  const {
    Material
  } = reactory.getComponents<{
    Material: Reactory.Client.Web.IMaterialModule
  }>(["material-ui.Material"]);

  const { Fab } = Material.MaterialCore;
  const { CloudUpload, InsertDriveFile, Folder } = Material.MaterialIcons;

  const handleUploadClick = () => {
    createFileInput(
      (files) => {
        if (files) {
          onFileUpload(files);
        }
      }
    );
  };

  return (
    <>
      {/* Mobile FAB for quick upload */}
      <Fab
        color="primary"
        aria-label="Upload file"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: { 
            xs: mobileView === 'folders' ? 'flex' : 'none', 
            md: 'none' 
          },
          zIndex: 10
        }}
        onClick={handleUploadClick}
      >
        <CloudUpload />
      </Fab>

      {/* Mobile Toggle FAB for switching between folders and files */}
      <Fab
        color="secondary"
        aria-label="Toggle view"
        sx={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          display: { xs: 'flex', md: 'none' },
          zIndex: 10
        }}
        onClick={onToggleView}
      >
        {mobileView === 'folders' ? <InsertDriveFile /> : <Folder />}
      </Fab>
    </>
  );
};

export default MobileFabs;
