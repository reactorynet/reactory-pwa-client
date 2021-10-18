import React from 'react';
import { useReactory, withApi } from "@reactory/client-core/api";
import { withTheme } from '@material-ui/styles';
import { compose } from 'redux';

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

    const { reactory, theme } = props;


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




    // const record = document.querySelector('.record');
    // const stop = document.querySelector('.stop');
    // const soundClips = document.querySelector('.sound-clips');
    // const mainSection = document.querySelector('.main-controls');

    const { MaterialCore } = Material;
    const { Button, Box, Paper, Grid, List, ListItem,
      ListItemText, Icon, IconButton, ListItemSecondaryAction,
      Toolbar } = MaterialCore;

    const visualize = (stream) => {

      if (!mediaRecorder.current) return;
      if (!canvasContext) return;

      if (mediaConstraint.video === true) {
        if (video.current) {
          video.current.src = URL.createObjectURL(stream);
          video.current.load();
          video.current.play().then(() => {
            setIsLiveStreaming(true)
          }).catch((err) => {
            setIsLiveStreaming(false)
          });
        }
      }

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
        console.log('getUserMedia supported.');

        let chunks = [];

        navigator.mediaDevices.getUserMedia(mediaConstraint)
          .then(function (stream) {

            //@ts-ignore
            mediaRecorder.current = new MediaRecorder(stream);

            if (mediaConstraint.video === true) {
              try {
                video.current.srcObject = stream;
                video.current.play();
              } catch (err) {
                // deal with this.
              }

            } else {
              visualize(stream);
            }

            mediaRecorder.current.onstart = (e) => {
              chunks = [];
            };

            mediaRecorder.current.onstop = function (e) {
              video.current.srcObject = null;

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

              let blobProps: BlobPropertyBag = mediaConstraint.video === true ? { type: 'video/mp4' } : { 'type': 'audio/ogg; codecs=opus' };
              const data = new Blob(chunks, blobProps);
              const recording: any = {
                id: reactory.utils.uuid(),
                type: mediaConstraint.video === true ? 'video' : 'audio',
                title: null,
                saved: false,
                chunks: chunks,
                data: data,
                url: URL.createObjectURL(data)
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
      if (mediaRecorder.current && mediaRecorder.current.stop && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
        setIsRecording(false)
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

        acquireStream();
      }
    }, [mediaConstraint]);

    React.useEffect(() => {
      return () => {
        if (mediaRecorder.current) {
          if (mediaRecorder.current.state !== "inactive") {
            mediaRecorder.current.stop();
          }
        }
      }
    }, [])


    const doPromptUpload = (recording, key) => {

    };

    const doRemoveRecording = (recording, key) => {

      reactory.utils.lodash.pullAt(recordings.current, [key])

    }


    const AudioPlayer = (recording: any, key: string) => {

      const audioRef = React.useRef<HTMLAudioElement>(null);

      return (
        <Box>
          <Paper>
            <audio src={recording.url} key={key} ref={audio => audioRef.current = audio} />
          </Paper>
          <Toolbar>
            <IconButton size={'small'} onClick={() => {
              if (isPlayingKey === key) {
                if (audioRef.current.paused === false) {
                  audioRef.current.pause();
                  setIsPlaying(true);
                }
                else {
                  audioRef.current.pause();
                  setIsPlaying(false);
                }
              } else {
                audioRef.current.srcObject = recording.data;
                audioRef.current.play();
                setIsPlayingKey(key);
                setIsPlaying(true);
              }
            }}><Icon>{isPlayingKey === key && isPlaying === true ? 'stop' : 'play_arrow'}</Icon></IconButton>

            <IconButton size="small" color="primary" onClick={() => { doPromptUpload(recording, key) }}><Icon>save</Icon></IconButton>
            <IconButton size="small" onClick={() => { doRemoveRecording(recording, key) }}><Icon style={{ color: theme.palette.error.main }}>delete</Icon></IconButton>

          </Toolbar>
        </Box>
      )

    }

    const VideoPlayer = (recording, key) => {
      const player = React.useRef<HTMLVideoElement>(null)

      return (
        <Box>
          <Paper>
            <video ref={ref => {
              player.current = ref;
              player.current.src = recording.url;
              player.current.load();
            }} width={200} />
          </Paper>
          <Toolbar>
            <IconButton size={'small'} onClick={() => {
              if (player.current.paused === false) {
                player.current.pause();
              }
              else {
                player.current.play().then(() => {
                });
              }
            }}><Icon>{isPlayingKey === key && isPlaying === true ? 'stop' : 'play_arrow'}</Icon></IconButton>

            <IconButton size="small" color="primary" onClick={() => { doPromptUpload(recording, key) }}><Icon>save</Icon></IconButton>
            <IconButton size="small" onClick={doRemoveRecording(recording, key)}><Icon style={{ color: theme.palette.error.main }}>delete</Icon></IconButton>

          </Toolbar>
        </Box>
      );
    }


    let recording_icon_style = {
      color: is_recording ? palette.error.main : 'grey'
    }

    return (
      <Paper elevation={2}>
        <Grid container spacing={2}>
          <Grid>
            <video ref={(ref) => { video.current = ref }} width={320} />
          </Grid>
          <Grid item xs={12} xl={12}>
            <canvas ref={(canvasRef) => { canvas.current = canvasRef }} height="60px"></canvas>
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
              <IconButton size={'small'} onClick={onStopRecording}><Icon>stop</Icon></IconButton>
            </Toolbar>
          </Grid>
          <Grid>
            <List>
              {recordings.current.map((recording, idx) => {
                return (
                  <ListItem key={idx} style={{ width: '250px' }}>
                    {recording.type === 'audio' ?
                      <AudioPlayer recording={recording} key={idx} /> :
                      <VideoPlayer recording={recording} key={idx} />}
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