import React, { Children, useContext, createContext } from 'react';
import { useReactory } from "@reactory/client-core/api"
import { IMorphCast } from './types';
import MorphCASTContext from './MorphCastContext';


export default {
  name: 'MorphCastProvider',
  nameSpace: 'morphcast',
  version: '1.0.0',
  component: (props) => {


    // "FACE_AGE"

    const morph_modules = ["FACE_DETECTOR", "FACE_POSE", "DATA_AGGREGATOR"]


    const reactory = useReactory();
    const { useEffect, useRef, useState } = React;
    const $morphcast = useRef<IMorphCast>();
    const [loaded, setLoaded] = useState<boolean>(false);
    const [error, setError] = useState<Error>(null);
    const [isMorphing, setIsMorphing] = useState<boolean>(false);
    const [moduleConfigs, setModuleConfigs] = useState<any>({
      FACE_DETECTOR: { maxInputFrameSize: 320, multiFace: true },
      FACE_POSE: { smoothness: 0.65 },
      FACE_AGE: { rawOutput: false },
      FACE_EMOTION: { smoothness: 0.40, enableBalancer: false },
      FACE_GENDER: { smoothness: 0.95, threshold: 0.70 },
    })
    const [modules, setModules] = useState<string[]>(morph_modules);
    const [version, setVersion] = useState<number>(0);
    // const eventStream = React.useRef([]);
    const [eventStream, setEventStream] = useState([]);
    let isClosing = false;

    const { Material } = reactory.getComponents(['material-ui.Material']);

    const { MaterialCore, MaterialStyles, MaterialLab } = Material;

    const preview = React.useRef<HTMLVideoElement>(null);
    const canvas = React.useRef<HTMLCanvasElement>(null);
    const downloadLink = React.useRef<HTMLAnchorElement>(null);

    const {
      Paper,
      Grid,
      IconButton,
      Button,
      Icon,
      Toolbar,
      Typography,
    } = MaterialCore;



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



    const waitForSdk = () => {
      //@ts-ignore

      if (isClosing === true) return;

      let $CY = undefined;

      $CY = globalThis.CY;
      //@ts-ignore
      if ($CY === null || $CY === undefined) $CY = window.CY;
      //@ts-ignore
      if ($CY === null || $CY === undefined) $CY = globalThis.CY;

      if ($CY === undefined || $CY === null) {
        setTimeout(waitForSdk, 1500);
        return;
      }

      setLoaded(true);
      let loader = $CY.loader()
        .licenseKey(props.license);

      const CY_MODULES = $CY.modules();

      modules.forEach((module) => {
        loader.addModule(CY_MODULES[module].name, moduleConfigs[module] || {});
      });

      if (props.videoURL) {
        loader.source($CY.createSource.fromVideoElement(preview.current));
      }

      bindListeners();

      loader.load()
        .then((morphcast: IMorphCast) => {
          setLoaded(true);
          $morphcast.current = morphcast;
          start()          
        }).catch((error) => {
          setLoaded(true);
          setError(error);
        })

    };

    const initMorphCAST = () => {
      waitForSdk();
    }

    useEffect(() => {

      reactory.utils.injectResources([
        { id: 'morphcastsdk', type: 'script', uri: 'https://sdk.morphcast.com/mphtools/v1.0/mphtools.js' },
        { id: 'morphcastai', type: 'script', uri: 'https://ai-sdk.morphcast.com/v1.15/ai-sdk.js' }
      ]);


      return () => {
        isClosing = true;
        unbindListeners();
      }
    }, []);



    if (error) {
      return (
        <span>Error Loading MorphCast. {error.message}</span>
      )
    }


    const onCameraData = (evt) => {
      if (isClosing === true || canvas.current === null || canvas.current === undefined) return;
      reactory.log('New frame in input');
      const ctx = canvas.current.getContext('2d');
      const imageData = evt.detail;
      ctx.canvas.width = imageData.width;
      ctx.canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
    }

    const onEventBarrier = (evt) => {
      setEventStream([...eventStream, evt.detail])
    }


    const watchMorphing = () => {
      if ($morphcast.current && $morphcast.current.stopped === false) {
        setTimeout(watchMorphing, 1500);
      } else {
        if (isMorphing === true) setIsMorphing(false);
      }
    };

    const start = () => {
      if ($morphcast.current.stopped === true) {
        setEventStream([]);
        $morphcast.current.start();
        setIsMorphing(true);
        watchMorphing();
        setVersion(version + 1);
      }
    }

    const stop = () => {
      if ($morphcast.current.stopped === false) {
        $morphcast.current.terminate();
        setVersion(version + 1);
      }
    }

    const save = () => {
      if (props.onSave) {
        props.onSave(eventStream);
      } else {
        downloadLink.current.click();
      }
    }

    const anchor: any = {
      href: `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(eventStream))}`,
      download: `${props.title}_MORPHCAST.json`,
      ref: (ref) => { downloadLink.current = ref; },
      style: { visibility: 'hidden', display: 'none' },
    }

    return (

      <Paper>
        <Grid container spacing={4}>
          <Grid item sm={12} xs={12} lg={12}>
            <Typography>Analyzing Video {props.title}</Typography>
          </Grid>
          <Grid item sm={12} xs={12} lg={12}>
            <Grid item sm={12} xs={12} md={12} lg={6} xl={6}>
              <video crossOrigin="anonymous" controls={true} ref={(ref) => {
                if (ref === null) return;
                if(preview.current === null) {
                  preview.current = ref;
                  preview.current.src = props.videoURL;
                  if ($morphcast.current === null || $morphcast.current === undefined) {
                    initMorphCAST();
                  }
                }                 
              }} />

              <a {...anchor} />

            </Grid>

            <Grid item sm={12} xs={12} md={12} lg={6} xl={6}>
              <canvas ref={(ref) => { 
                if(canvas.current == null) canvas.current = ref; 
              }} />
            </Grid>
          </Grid>
          <Grid>
            <Toolbar>
              {isMorphing === false && <IconButton onClick={start}><Icon>insights</Icon></IconButton>}
              {isMorphing === true && <IconButton onClick={stop}><Icon>stop</Icon></IconButton>}
              <IconButton onClick={save}><Icon>save</Icon></IconButton>
            </Toolbar>
          </Grid>
        </Grid>
      </Paper>
    );


  }
}

