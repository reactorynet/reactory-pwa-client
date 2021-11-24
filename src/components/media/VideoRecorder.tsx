import React from 'react';
import { useReactory, withApi } from "@reactory/client-core/api";
import { withTheme } from '@material-ui/styles';
import { compose } from 'redux';
import { size } from 'lodash';

interface IRecording {
  id: string,
  type: string | "video" | "audio",
  data: Blob,
  url: string,
  title: string,
  saved: boolean
}

export default {
  nameSpace: 'core',
  name: 'ReactoryVideoRecorder',
  component: compose(withTheme, withApi)((props) => {

    const { reactory, theme, finalizeHook } = props;


    const { Material } = reactory.getComponents(['material-ui.Material']);
    const { palette } = theme;
    const canvas = React.useRef<HTMLCanvasElement>(null);
    const video = React.useRef<HTMLVideoElement>(null);
    //@ts-ignore
    const mediaRecorder = React.useRef<MediaRecorder>(null);
    const recordings = React.useRef<IRecording[]>([]);
    // const [recordings, setRecordings] = React.useState<any[]>([])
    const [is_recording, setIsRecording] = React.useState(false);
    const [mediaConstraint, setMediaConstraint] = React.useState<MediaStreamConstraints>({ audio: true, video: true });
    const [canvasContext, setCanvasContext] = React.useState<CanvasRenderingContext2D>(null);
    const [isPlayingKey, setIsPlayingKey] = React.useState(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [isLiveStreaming, setIsLiveStreaming] = React.useState(false);
    const [buffer, setBuffer] = React.useState<any[]>([]);
    const [version, setVersion] = React.useState(0)




    // const record = document.querySelector('.record');
    // const stop = document.querySelector('.stop');
    // const soundClips = document.querySelector('.sound-clips');
    // const mainSection = document.querySelector('.main-controls');

    const { MaterialCore } = Material;
    const { Button, Box, Paper, Grid, List, ListItem,
      ListItemText, Icon, IconButton, ListItemSecondaryAction, Typography,
      Toolbar } = MaterialCore;

    const visualize = (stream) => {

      if (!mediaRecorder.current) return;
      if (!canvasContext) return;

      if (mediaConstraint.audio === true) {
        let audioCtx = new AudioContext();


        const source = audioCtx.createMediaStreamSource(stream);

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
        analyser.connect(audioCtx.destination);



        const draw = () => {

          if (canvas && canvas.current) {
            const WIDTH = canvas.current.width;
            const HEIGHT = canvas.current.height;

            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasContext.fillStyle = 'rgb(200, 200, 200)';
            canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

            canvasContext.lineWidth = 2;
            canvasContext.strokeStyle = 'rgb(0, 0, 0)';

            canvasContext.beginPath();

            let sliceWidth = WIDTH * 1.0 / bufferLength;
            let x = 0;


            for (let i = 0; i < bufferLength; i++) {

              let v = dataArray[i] / 128.0;
              let y = v * HEIGHT / 2;

              if (i === 0) {
                canvasContext.moveTo(x, y);
              } else {
                canvasContext.lineTo(x, y);
              }

              x += sliceWidth;
            }

            canvasContext.lineTo(canvas.current.width, canvas.current.height / 2);
            canvasContext.stroke();
          }

        }


        draw()
      }


    }



    // visualiser setup - create web audio api context and canvas    

    const acquireStream = () => {
      if (navigator.mediaDevices) {

        let chunks = [];
        let markerStart = null;
        const isVideo = mediaConstraint.video === true;
        let mime = `video/mp4;`;
        mime = isVideo === true ? mime : 'audio/ogg; codecs=opus';


        navigator.mediaDevices.getUserMedia(mediaConstraint)
          .then(function (stream: MediaStream) {

            //@ts-ignore            
            const streamOptions: MediaRecorderOptions = {
              audioBitsPerSecond: props.audioBitrate || 128000,
              videoBitsPerSecond: props.videoBitrate || 2500000,
              mimeType: mime
            }
            
            //@ts-ignore
            mediaRecorder.current = new MediaRecorder(stream);

            //live video display should be property
            if (mediaConstraint.video === true) {
              try {
                video.current.srcObject = stream;
                video.current.play().then();
              } catch (err) {
                // deal with this.
              }

            } 
            
            stream.getTracks().forEach((track) => {
              if(track.kind === "audio" && mediaConstraint.audio === false) {
                track.stop();
              }

              if(track.kind === "video" && mediaConstraint.video === false) {
                track.stop();
              }
            });

            visualize(stream);
            

            mediaRecorder.current.onstart = (e) => {
              chunks = [];
              markerStart = new Date();
            };

            mediaRecorder.current.onstop = (e) => {

              reactory.log("data available after MediaRecorder.stop() called.", {}, 'debug');


              // audio.controls = true;
              

              let blobProps: BlobPropertyBag = { type: mime };
              const data = new Blob(chunks, blobProps);


              const user = reactory.$user;
              const index = recordings.current.length
              let filename = `${user.firstName}_${user.lastName}_${index}.${isVideo === true ? 'mp4' : 'ogg'}`;
              let file = new File([data], filename, { type: mime });

              const recording: any = {
                id: reactory.utils.uuid(),
                type: mediaConstraint.video === true ? 'video' : 'audio',
                title: null,
                saved: false,
                chunks: chunks,
                blob: data,
                started: markerStart,
                ended: new Date(),
                filename,
                mime,
                file,
                index: recordings.current.length,
                url: URL.createObjectURL(data)
              }

              recordings.current.push(recording);
              chunks = [];
              setIsRecording(false);
              setBuffer([]);
            }

            mediaRecorder.current.ondataavailable = function (e) {
              chunks.push(e.data);
              setBuffer(chunks);
              setVersion(version + 1);
            }

          })
          .catch(function (err) {
            reactory.createNotification('Error getting stream', { type: 'warning' });
            reactory.log('The following error occurred: ' + err, { err }, 'error');
          })
      }

    }

    const onStartRecording = () => {
      if (mediaRecorder.current && mediaRecorder.current.start && mediaRecorder.current.state !== "recording") {
        mediaRecorder.current.start();
        setIsRecording(true)
      }
    };

    const onStopRecording = () => {
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
        setIsRecording(false);
      }
    }

    const finalize = () => {
      if (mediaRecorder.current) {
        if(mediaRecorder.current.stream && mediaRecorder.current.stream.active === true) {          
          
          if (mediaRecorder.current.state === "recording" || mediaRecorder.current.state === "paused") {
            mediaRecorder.current.stop();
          }

          if(video.current) {
            video.current.pause();
            video.current.src = ""
            video.current.srcObject = null;
          }
                    
          mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });

          mediaRecorder.current = null; 
        }
      }
    }

    React.useEffect(() => {
      if (canvas.current) {
        const canvasCtx = canvas.current.getContext("2d");
        setCanvasContext(canvasCtx);
      } else {
        setCanvasContext(null);
      }

    }, [canvas.current]);


    React.useEffect(() => {
      acquireStream();
    }, [canvasContext]);

    React.useEffect(() => {

      if (mediaRecorder.current) {

        if (mediaRecorder.current.state === "recording")
          mediaRecorder.current.stop();
        
        if (video.current) {
          video.current.pause();
          video.current.src = ""
          video.current.srcObject = null;
        }

        mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
        });

        mediaRecorder.current = null;

        if(mediaConstraint.audio === true || mediaConstraint.video === true ) {
          acquireStream();
        }
      } else {
        acquireStream();
      }
    }, [mediaConstraint]);

    React.useEffect(() => {

      if(finalizeHook) {
        finalizeHook(finalize)
      }

      return () => {
        if(!finalizeHook) {
          finalize();
        }
      }
    }, [])


    const doPromptUpload = (recording, key) => {
      recording.confirmUpload = true;
      setVersion(version + 1);
    };

    const doRemoveRecording = (recording, key) => {
      reactory.utils.lodash.pullAt(recordings.current, [recording.index]);
      setVersion(version + 1);
    }


    const onSaveRecording = (recording) => {
      recording.isUploading = true;
      
      if(props.onSave) {
        props.onSave(recording, ({ errors = [], success = true }) => {
          recording.isUploading = false;
          
          if(success === false) {
            recording.errors = errors;
          } 
        })
      } else {
        // download the file locally
      } 
    }

    const onCancelSaveRecording = (recording) => {
      recording.confirmUploaded = false;
    }

    const AudioPlayer = ({ recording, key}) => {

      const audioRef = React.useRef<HTMLAudioElement>(null);

      const play = () => {
        if (audioRef.current) {
          audioRef.current.src = URL.createObjectURL(recording.blob);
          audioRef.current.play().then(() => { });
        }
      }

      React.useEffect(play, [audioRef.current])

      const upload = (
        <>          
          <Typography variant="body2">Save recording?</Typography>
          <Button color="primary" onClick={() => { onSaveRecording(recording) }}> <Icon>cloud_upload</Icon> SAVE </Button>
          <Button color="primary" onClick={() => { onCancelSaveRecording(recording) }}> <Icon>not_interested</Icon> CANCEL </Button>
        </>
      );

      return (
        <Box>
          <Paper>
            <audio src={recording.url} key={key} ref={audio => audioRef.current = audio}  controls={true}/>
          </Paper>
          <Toolbar>            
            { recording.confirmUpload === true  ? upload : (<><IconButton size="small" color="primary" onClick={() => { doPromptUpload(recording, key) }}><Icon>save</Icon></IconButton>
            <IconButton size="small" onClick={() => { doRemoveRecording(recording, key); }}><Icon style={{ color: theme.palette.error.main }}>delete</Icon></IconButton></>) }

          </Toolbar>
        </Box>
      )

    }

    const VideoPlayer = ({ recording, key }) => {
      const player = React.useRef<HTMLVideoElement>(null)
      const downloadLink = React.useRef<HTMLAnchorElement>(null);

      const play = () => {
        if(player.current) {
          player.current.src = URL.createObjectURL(recording.blob);
          player.current.play().then(() => {});
        }
      }

      const save = () => {        
        if(props.onSave) {          
          props.onSave(recording, ({ success = true, errors = [] }) => {
            //do nothing for now.
          });
        } else {
          downloadLink.current.click();
        }
      }

      const cancelSave = () => {
        recording.confirmUpload = false;
        setVersion(version + 1);
      }

      React.useEffect(() => {
        play()
      }, [player.current]);

      const upload = (
        <>
          <Typography variant="body2">Save recording?</Typography>
          <Button color="primary" onClick={save}> <Icon>cloud_upload</Icon> SAVE </Button>
          <Button color="primary" onClick={cancelSave}> <Icon>not_interested</Icon> CANCEL </Button>
        </>
      );

      const user = reactory.$user;
      const linkProps: any = {
        href: recording.url,
        download: `${user.firstName} ${user.lastName} ${recording.type}_${recording.index}.${recording.type === 'video' ? 'mp4' : 'ogg'}`,
        ref: (ref) => { downloadLink.current = ref; },
        style: { visibility: 'hidden', display: 'none' },
      }
      return (
        <Box key={key}>
          <Grid container spacing={0}>
            <Grid item xs={12} lg={12} justifyContent="center" alignItems="center" direction="row" style={{ display: 'flex', justifyContent: 'center', maxWidth: '320px', margin: 'auto' }}>
                <a {...linkProps} />
                <video ref={(vp) => { player.current = vp; }} width={180} controls={true}/>
            </Grid>  
            <Grid item xs={12} lg={12} justifyContent="center" alignItems="center" direction="row">
              <Toolbar style={{ maxWidth: '320px', margin: 'auto', justifyContent: 'center' }}>
                {recording.confirmUpload === true ? upload : ( <><IconButton size="small" color="primary" onClick={() => { doPromptUpload(recording, key) }}><Icon>save</Icon></IconButton>
                  <IconButton size="small" onClick={() => { doRemoveRecording(recording, key) }}><Icon style={{ color: theme.palette.error.main }}>delete</Icon></IconButton></>)}                
              </Toolbar>
            </Grid>        
          </Grid>                    
        </Box>
      );
    }


    let recording_icon_style = {
      color: is_recording ? palette.error.main : '#fff'
    }

    let stop_icon_style = {
      color: is_recording ? '#fff' : 'grey'
    }

    const size = (bytesize: number) => {
       const sizes: string[] = [ "B", "KB", "MB", "GB", "TB" ];
      let len: number = bytesize;
      let order: number = 0;
      while (len >= 1024 && order < sizes.length - 1){
        order++;
        len /= 1024;
      }

      return `${parseFloat(`${len}`).toFixed(2)} ${sizes[order]}`;
    }

    // <Grid>
    //   <Typography variant="label">{buffer.length} BYTES</Typography>
    // </Grid>

    return (
      <Paper elevation={2} style={{ maxWidth: '320px', display: 'flex', justifyContent: 'center', margin: 'auto' }}>
        <Grid container spacing={1} >
          <Grid>
            <video ref={(ref) => { video.current = ref }} width={320} />
          </Grid>
          <Grid item xs={12} xl={12}>
            <canvas ref={(canvasRef) => { canvas.current = canvasRef }} height="60px" width={320}></canvas>
          </Grid>
          
          <Grid item xs={12} xl={12}>
            <Toolbar>

              <IconButton size={'small'} onClick={() => {
                setMediaConstraint({ ...mediaConstraint, audio: !mediaConstraint.audio });
              }}><Icon>{mediaConstraint.audio ? 'mic' : 'mic_off'}</Icon></IconButton>
              <IconButton size={'small'} onClick={() => {
                setMediaConstraint({ ...mediaConstraint, video: !mediaConstraint.video });
              }}><Icon>{mediaConstraint.video ? 'videocam' : 'videocam_off'}</Icon></IconButton>

              <IconButton size={'small'} onClick={onStartRecording}><Icon style={recording_icon_style}>fiber_manual_record</Icon></IconButton>
              <IconButton size={'small'} enabled={is_recording === true} onClick={onStopRecording} ><Icon style={stop_icon_style}>stop</Icon></IconButton>
            </Toolbar>
          </Grid>
          <Grid item container>
              {recordings.current.map((recording, idx) => {
                return (
                  <Grid sm={12} xs={12} md={3} lg={2} xl={2} key={idx} style={{ width: '250px' }}>
                    {recording.type === 'audio' ?
                      <AudioPlayer recording={recording} key={idx} /> :
                      <VideoPlayer recording={recording} key={idx} />}
                  </Grid >
                )
              })}
          </Grid>
        </Grid>
      </Paper >
    )

  }),
  version: '1.0.0'
}