import React, { Component } from "react";
import ReactCrop from "react-image-crop";
import {
  Button,
  ButtonGroup,
  Container, 
  Icon,
  Paper,  
  Typography,
  Toolbar,  
} from '@material-ui/core';
import "react-image-crop/dist/ReactCrop.css";
import { flexbox } from "@material-ui/system";

export class Cropper extends Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      src: props.src || null,
      crop: {
        unit: "%",
        width: 30,
        aspect: 16 / 9
      }      
    };

    this.onImageLoaded = this.onImageLoaded.bind(this)
    this.onCropComplete = this.onCropComplete.bind(this)
    this.onCropChange = this.onCropChange.bind(this)
  }
    
  // If you setState the crop in here you should return false.
  onImageLoaded = image => {
    this.imageRef = image;
  };

  onCropComplete = crop => {
    this.makeClientCrop(crop);
  };

  onCropChange = (crop, percentCrop) => {
    // You could also use percentCrop:
    // this.setState({ crop: percentCrop });
    this.setState({ crop });
  };

  async makeClientCrop(crop) {
    if (this.imageRef && crop.width && crop.height) {
      const croppedImageUrl = await this.getCroppedImg(
        this.imageRef,
        crop,
        "newFile.jpeg"
      );
      this.setState({ croppedImageUrl });
    }
  }

  getCroppedImg(image, crop, fileName) {
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
      
      canvas.toBlob(blob => {
        if (!blob) {
          //reject(new Error('Canvas is empty'));
          console.error("Canvas is empty");
          return;
        }
        blob.name = fileName;
        window.URL.revokeObjectURL(this.fileUrl);
        this.fileUrl = window.URL.createObjectURL(blob);
        resolve(this.fileUrl);
      }, "image/jpeg");
    });
  }

  render() {
    const { crop, croppedImageUrl } = this.state;
    const { onAccept, onCancelCrop } = this.props;

    const acceptCrop = () => {
      if(onAccept) {
       //var a = new FileReader();
        //a.onload = function(e) { 
        //  onAccept(e.target.result);
       // }
        //a.readAsDataURL(croppedImageUrl);
        
        onAccept(croppedImageUrl);
      }
    }

    if(typeof this.props.src === 'string' && this.props.src.trim() !== '') {
      return (
        <Container maxWidth="md">
          <Paper>
            <Toolbar>            
              <ButtonGroup variant="contained">                
                <Button onClick={acceptCrop}><Icon>check</Icon></Button>
                <Button onCancel={onCancelCrop}><Icon>close</Icon></Button>
              </ButtonGroup>                
            </Toolbar>          
            {this.props.src && (
              <div style={{display: 'flex', justifyContent: 'center'}}>
                <ReactCrop
                  src={this.props.src}
                  crop={crop}
                  onImageLoaded={this.onImageLoaded}
                  onComplete={this.onCropComplete}
                  onChange={this.onCropChange}
                />
              </div>
            )}
            </Paper>
        </Container>      
      );
    } else {
      return null;
    }    
  }
}

export default Cropper;