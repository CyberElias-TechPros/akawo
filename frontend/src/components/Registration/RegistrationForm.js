import React, { useState, useEffect } from 'react';
import { Stepper, Step, StepLabel, Button, Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import BasicInfo from './BasicInfo';
import BVNVerification from './BVNVerification';
import EmailVerification from '../EmailVerification';
import PhoneVerification from './PhoneVerification';
import FaceValidation from '../FaceValidation';
import IllustratedStep from '../IllustratedStep';
import SkeletonLoader from '../SkeletonLoader';

const steps = ['Basic Info', 'BVN Verification', 'Email Verification', 'Phone Verification', 'Face Validation'];

function RegistrationForm() {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        bvn: '',
        phoneNumber: '',
        faceImage: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading delay
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleFormChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return <BasicInfo formData={formData} handleFormChange={handleFormChange} />;
            case 1:
                return <BVNVerification formData={formData} handleFormChange={handleFormChange} />;
            case 2:
                return <EmailVerification formData={formData} handleFormChange={handleFormChange} />;
            case 3:
                return <PhoneVerification formData={formData} handleFormChange={handleFormChange} />;
            case 4:
                return <FaceValidation formData={formData} handleFormChange={handleFormChange} />;
            default:
                return 'Unknown step';
        }
    };

    return (
        <IllustratedStep step={steps[activeStep]}>
            <Box sx={{ width: '100%', maxWidth: 600, margin: 'auto', p: 3 }}>
                {loading ? (
                    <SkeletonLoader />
                ) : (
                    <>
                        <Stepper activeStep={activeStep} alternativeLabel>
                            {steps.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                        <Box sx={{ mt: 4 }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeStep}
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {getStepContent(activeStep)}
                                </motion.div>
                            </AnimatePresence>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Button
                                    color="inherit"
                                    disabled={activeStep === 0}
                                    onClick={handleBack}
                                    sx={{ mr: 1 }}
                                >
                                    Back
                                </Button>
                                <Button onClick={handleNext} variant="contained">
                                    {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                                </Button>
                            </Box>
                        </Box>
                    </>
                )}
            </Box>
        </IllustratedStep>
    );
}

export default RegistrationForm;
