import React, { useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import Webcam from 'react-webcam';

function FaceValidation({ formData, handleFormChange }) {
    const webcamRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);

    const capture = React.useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setCapturedImage(imageSrc);
        handleFormChange('faceImage', imageSrc);
    }, [webcamRef, handleFormChange]);

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Face Validation
            </Typography>
            {!capturedImage ? (
                <>
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width="100%"
                    />
                    <Button variant="contained" onClick={capture} sx={{ mt: 2 }}>
                        Capture
                    </Button>
                </>
            ) : (
                <>
                    <img src={capturedImage} alt="captured" style={{ width: '100%' }} />
                    <Button variant="contained" onClick={() => setCapturedImage(null)} sx={{ mt: 2 }}>
                        Retake
                    </Button>
                </>
            )}
        </Box>
    );
}

export default FaceValidation;
