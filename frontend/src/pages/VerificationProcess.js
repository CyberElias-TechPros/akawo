import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const VerificationProcess = () => {
    const [facialImage, setFacialImage] = useState(null);
    const [livenessVideo, setLivenessVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!facialImage || !livenessVideo) {
            setError('Please provide both facial image and liveness video');
            return;
        }

        const formData = new FormData();
        formData.append('facialImage', facialImage);
        formData.append('livenessVideo', livenessVideo);

        setLoading(true);
        try {
            await api.post('/verification/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/verification-pending');
        } catch (err) {
            setError(err.response?.data?.error || 'Verification submission failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="verification-process">
            <h2>Account Verification</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="facialImage">Facial Image:</label>
                    <input
                        type="file"
                        id="facialImage"
                        accept="image/*"
                        onChange={(e) => setFacialImage(e.target.files[0])}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="livenessVideo">Liveness Video:</label>
                    <input
                        type="file"
                        id="livenessVideo"
                        accept="video/*"
                        onChange={(e) => setLivenessVideo(e.target.files[0])}
                        required
                    />
                </div>
                <button type="submit">Submit Verification</button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default VerificationProcess;
