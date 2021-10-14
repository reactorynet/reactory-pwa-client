import React from 'react';
import { useReactory, withApi } from "@reactory/client-core/api";
import { withTheme } from '@material-ui/styles';
import { compose } from 'redux';


export default {
  nameSpace: 'core',
  name: 'ReactoryVideoRecorder',
  component: compose(withTheme, withApi)((props) => {

    const { reactory, theme } = props;


    const { Material } = reactory.getComponents(['material-ui.Material']);
    const { palette } = theme;
    const canvas = React.useRef<HTMLCanvasElement>(null);
    //@ts-ignore
    const mediaRecorder = React.useRef<MediaRecorder>(null);
    const recordings = React.useRef<any[]>([])
    const [is_recording, setIsRecording] = React.useState(false);
    const [canvasContext, setCanvasContext] = React.useState<CanvasRenderingContext2D>(null);



    // const record = document.querySelector('.record');
    // const stop = document.querySelector('.stop');
    // const soundClips = document.querySelector('.sound-clips');
    // const mainSection = document.querySelector('.main-controls');

    const { MaterialCore } = Material;
    const { Button, Paper, Grid, List, ListItem, ListItemText, Icon } = MaterialCore;

    const visualize = (stream) => {

      if(!mediaRecorder.current) return;
      if(!canvasContext) return;

      let audioCtx = new AudioContext();

      const source = audioCtx.createMediaStreamSource(stream);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      //analyser.connect(audioCtx.destination);



      const draw = () => {
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

      
      draw()
    }



    // visualiser setup - create web audio api context and canvas    

    const acquireStream = () => {
      if (navigator.mediaDevices) {
        console.log('getUserMedia supported.');

        var constraints = { audio: true };
        let chunks = [];
        navigator.mediaDevices.getUserMedia(constraints)
          .then(function (stream) {

            //@ts-ignore
            mediaRecorder.current = new MediaRecorder(stream);
          

            visualize(stream);

            mediaRecorder.current.onstart = (e) => {
              chunks = [];
            };

            mediaRecorder.current.onstop = function (e) {
              debugger
              reactory.log("data available after MediaRecorder.stop() called.");


              // var clipContainer = document.createElement('article');
              // var clipLabel = document.createElement('p');
              // var audio = document.createElement('audio');
              // var deleteButton = document.createElement('button');

              // clipContainer.classList.add('clip');
              // audio.setAttribute('controls', '');
              // deleteButton.innerHTML = "Delete";
              // clipLabel.innerHTML = clipName;

              // clipContainer.appendChild(audio);
              // clipContainer.appendChild(clipLabel);
              // clipContainer.appendChild(deleteButton);
              // soundClips.appendChild(clipContainer);



              // audio.controls = true;


              const recording: any = {
                id: reactory.utils.uuid(),
                type: 'audio',
                title: null,
                saved: false,
                chunks: chunks,
                data: new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' }),
                url: URL.createObjectURL(new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' }))
              }

              recordings.current.push(recording);
              chunks = [];
              setIsRecording(false);
            }

            mediaRecorder.current.ondataavailable = function (e) {
                chunks.push(e.data);
            }

          })
          .catch(function (err) {
            reactory.createNotification('Error getting stream', { type: 'warning'});
            reactory.log('The following error occurred: ' + err, { err }, 'error');
          })
      }

    }



    const onStartRecording = () => {
      if (mediaRecorder.current && mediaRecorder.current.start && mediaRecorder.current.state !== "recording")  {
        setIsRecording(true)
        mediaRecorder.current.start();
      }
    };

    const onStopRecording = () => {
      debugger

      if (mediaRecorder.current && mediaRecorder.current.stop && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
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
      return () => {
        if(mediaRecorder.current) {
          if (mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();            
          }          
        }
      }
    }, [])

    const AudioPlayer = (recording: any, key: string) => {      
      return <audio src={recording.url} key={key}/>
    }

    const VideoPlayer = (recording, key) => {
      return (<video src={recording.url} controls={true} width={240} height={240} key={key} />)
    }


    let recording_icon_style = {
      color: is_recording ? palette.error.main : 'grey'
    }

    return (
      <Paper elevation={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} xl={12}>
            <canvas ref={(canvasRef) => { canvas.current = canvasRef }} className="visualizer" height="60px"></canvas>
          </Grid>
          <Grid item xs={12} xl={12}>
            <Icon style={recording_icon_style}>fiber_manual_record</Icon>
            <Button className="record" onClick={onStartRecording}>Record</Button>
            <Button className="stop" onClick={onStopRecording}>Stop</Button>
          </Grid>
          <Grid>
            <List>
              {recordings.current && recordings.current.map((recording, idx) => {
                return (
                  <ListItem key={idx}>
                    {recording.type === 'audio' ? <audio src={recording.url} key={idx} controls={true} /> : <VideoPlayer recording={recording} key={idx} />}
                  </ListItem >
                )
              })}
            </List>
          </Grid>
        </Grid>
      </Paper >
    )

  }),
  version: '1.0.0'
}