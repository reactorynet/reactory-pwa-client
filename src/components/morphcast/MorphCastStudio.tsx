import React from 'react';
import Reactory from '@reactory/client-core/types/reactory';
import { useMorphCAST } from './MorphCastContext';
import { IMorphCast } from './types';
import { Typography } from '@material-ui/core';
import { useReactory } from '@reactory/client-core/api';

export default {
  name: 'MorphCastStudio',
  nameSpace: 'morphcast',
  component: (props: { file: any })=>{

    const reactory = useReactory();

    const morphcast = useMorphCAST();

    const { Material } = reactory.getComponents(['material-ui.Material']);

    const { MaterialCore, MaterialStyles, MaterialLab } = Material;

    const preview = React.useRef<HTMLVideoElement>(null);
    const canvas = React.useRef<HTMLCanvasElement>(null); 

    const {
      Paper,
      Grid,
      IconButton,
      Button,
      Icon,
      Toolbar,
    } = MaterialCore;


    const onCameraData = (evt) => {
      reactory.log('New frame in input');
      const ctx = canvas.current.getContext('2d');
      const imageData = evt.detail;
      ctx.canvas.width = imageData.width;
      ctx.canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
    }

    const onEventBarrier = (evt) => {
      reactory.log('MORPHCAST: NEW EVENT', {details: evt.details});
    }

    const bindListeners = () => {
      let $CY = undefined;

      $CY = globalThis.CY;

      if (!$CY) return;

      window.addEventListener($CY.modules().CAMERA.eventName, onCameraData);
      window.addEventListener($CY.modules().EVENT_BARRIER.eventName, onEventBarrier);
      
    }

    const unbindListeners = () => {
      let $CY = undefined;

      $CY = globalThis.CY;

      if (!$CY) return;


      window.removeEventListener($CY.modules().CAMERA.eventName, onCameraData);
      window.removeEventListener($CY.modules().EVENT_BARRIER.eventName, onEventBarrier);
    }

    React.useEffect(() => {
      bindListeners();

      return unbindListeners();
    }, [])

    const start = () => {
      morphcast.start();
    }

  

    return (<>
      <Paper>
        <Grid container spacing={4}>
          <Grid item sm={12} xs={12} lg={12}>
            <Typography>Analyzing Video</Typography>
          </Grid> 
          <Grid>
            <canvas ref={(ref) => { canvas.current = ref; }}  />
            <video ref={(ref) => { 
              preview.current = ref; 
              // preview.current.src = URL.createObjectURL(props.file.url);
              // preview.current.play().then();
            }} /> 
          </Grid>
          <Grid>
            <Toolbar>
              <IconButton onClick={start}><Icon></Icon></IconButton>
            </Toolbar>
          </Grid>
        </Grid>
      </Paper>
    </>)

  },
}