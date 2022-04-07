import React, { useState, useEffect, useRef } from "react";
import ReactCrop from "react-image-crop";
import {
  Button,
  ButtonGroup,
  Container,
  Icon,
  Paper,
  Typography,
  Toolbar,
  Grid,
} from '@mui/material';
import "react-image-crop/dist/ReactCrop.css";
import ReactoryApi, { useReactory } from "@reactory/client-core/api";

export interface ICropProps {
  src?: string,
  crop?: {
    unit?: string,
    width?: number,
    aspect?: number,
  },
  reactory: ReactoryApi,
  onAccept: (croppedImageUrl: string) => void,
  onCancelCrop: () => void
}

const DEFAULT_CROP = {
  unit: "px",
  width: 120,
  minHeight: 80,
  minWidth: 80,
  maxHeight: 300,
  maxWidth: 300,
  height: 120,
  aspect: 1,
}

const Cropper = (props: ICropProps) => {
  
  const { src, onAccept, onCancelCrop } = props;
  const reactory = useReactory();

  const [fileUrl, setFileUrl] = useState<string>(null);
  const [croppedImage, setCroppedImage] = useState<string>(null);
  const [imageRef, setImageRef] = useState<any>(null);
  const [crop, setCrop] = useState(props.crop || DEFAULT_CROP);

  const { StaticContent } = reactory.getComponents(["core.StaticContent"]);

  // this.onImageLoaded = this.onImageLoaded.bind(this)
  // this.onCropComplete = this.onCropComplete.bind(this)
  // this.onCropChange = this.onCropChange.bind(this)

  // If you setState the crop in here you should return false.

  
  const getCroppedImg = async (image, crop, fileName): Promise<string> => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      debugger
      canvas.toBlob((blob: Blob) => {
        if (!blob) {
          //reject(new Error('Canvas is empty'));
          console.error("Canvas is empty");
          return;
        }
        
        try {
          window.URL.revokeObjectURL(fileUrl);
          let $fileUrl = window.URL.createObjectURL(blob);
          setFileUrl(window.URL.createObjectURL(blob));
          debugger
          resolve($fileUrl);
        } catch (err) {
          reject(err);
        }        
      }, "image/png");
    });
  }

  

  const makeClientCrop = async (crop) => {
    if (imageRef && crop.width && crop.height) {
      const croppedImageUrl = await getCroppedImg(
        imageRef,
        crop,
        `${reactory.$user.id}_avatar.png`
      );
      setCroppedImage(croppedImageUrl);
    }
  }

  const onImageLoaded = (image) => {
    setImageRef(image);
  };

  const onCropComplete = (crop) => {
    makeClientCrop(crop);
  };

  const onCropChange = (crop, percentCrop) => {
    // You could also use percentCrop:
    // this.setState({ crop: percentCrop });
    setCrop(crop);
  };
      
  const acceptCrop = () => {
    if (onAccept) {      
      onAccept(croppedImage);
    }
  }

  if (typeof src === 'string' && src.trim() !== '') {
    return (
      <Container maxWidth="md">
        <Paper>

        <Grid container spacing={0}>

          <Grid item container direction="row">
            <Grid item xs={12} sm={12} md={12} lg={12} xl={12} style={{ display: 'flex', justifyContent: 'center' }}>
              <StaticContent slug={`profile-image-cropper-info`} />
            </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} xl={12} style={{ display: 'flex', justifyContent: 'center' }}>
              {src && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ReactCrop
                    src={src}
                    crop={crop}
                    onImageLoaded={onImageLoaded}
                    onComplete={onCropComplete}
                    onChange={onCropChange}
                  />
                </div>
              )}
              {(src === null || src === undefined) && (<Typography>No Image Data Available</Typography>)}
            </Grid>
              <Grid item xs={12} sm={12} md={12} lg={12} xl={12} style={{ display: 'flex', justifyContent: 'center' }}>
                <Toolbar>
                  <ButtonGroup variant="contained">
                    <Button color="primary" onClick={acceptCrop}><Icon>check</Icon></Button>
                    <Button color="secondary" onClick={() => { onCancelCrop() }}><Icon>close</Icon></Button>
                  </ButtonGroup>
                </Toolbar>
            </Grid>
          </Grid>

        </Grid>                            
        </Paper>
      </Container>
    );
  } else {
    return <Typography>No source image provided</Typography>;
  }
}

export default Cropper;