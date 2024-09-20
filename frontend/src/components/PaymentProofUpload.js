import React, { useState } from 'react';
import { usePayments } from '../services/payments';

const PaymentProofUpload = ({ contributionId }) => {
    const [file, setFile] = useState(null);
    const { uploadPaymentProof } = usePayments();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        try {
            await uploadPaymentProof(contributionId, file);
            alert('Payment proof uploaded successfully!');
            setFile(null);
        } catch (error) {
            alert('Error uploading payment proof: ' + error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3>Upload Payment Proof</h3>
            <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" />
            <button type="submit" disabled={!file}>
                Upload Proof
            </button>
        </form>
    );
};

export default PaymentProofUpload;
