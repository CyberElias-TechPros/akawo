import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useVerification } from '../services/verification';

const Verification = () => {
    const [facialImage, setFacialImage] = useState(null);
    const [livenessVideo, setLivenessVideo] = useState(null);
    const { user } = useAuth();
    const { submitVerification } = useVerification();
    const navigate = useNavigate();

    const handleFacialImageUpload = (e) => {
        setFacialImage(e.target.files[0]);
    };

    const handleLivenessVideoUpload = (e) => {
        setLivenessVideo(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!facialImage || !livenessVideo) {
            alert('Please upload both facial image and liveness video.');
            return;
        }

        try {
            await submitVerification(user.id, facialImage, livenessVideo);
            alert('Verification submitted successfully. Please wait for admin approval.');
            navigate('/dashboard');
        } catch (error) {
            alert('Verification submission failed: ' + error.message);
        }
    };

    if (user.isVerified) {
        return <div>You are already verified.</div>;
    }

    return (
        <div className="verification">
            <h2>Verification</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="facial-image">Facial Image:</label>
                    <input
                        type="file"
                        id="facial-image"
                        accept="image/*"
                        onChange={handleFacialImageUpload}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="liveness-video">Liveness Video:</label>
                    <input
                        type="file"
                        id="liveness-video"
                        accept="video/*"
                        onChange={handleLivenessVideoUpload}
                        required
                    />
                </div>
                <button type="submit">Submit Verification</button>
            </form>
        </div>
    );
};

export default Verification;
