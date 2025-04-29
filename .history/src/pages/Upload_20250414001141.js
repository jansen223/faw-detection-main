import React, { useState } from 'react';
import './Upload.css';

function UploadAndDetect() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [annotatedImage, setAnnotatedImage] = useState(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://192.168.254.129:5000/upload_image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setUploadedImage(URL.createObjectURL(file));
      setAnnotatedImage(`data:image/jpeg;base64,${data.image}`);
      setDetectionResults(data.detections);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  return (
    <div className="upload-detection-container">
      <h2>Upload Image for Detection</h2>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="upload-input"
      />
      {uploadedImage && (
        <div className="image-preview">
          <h3>Uploaded Image</h3>
          <img src={uploadedImage} alt="Uploaded" />
        </div>
      )}
      {annotatedImage && (
        <div className="image-preview">
          <h3>Detection Results</h3>
          <img src={annotatedImage} alt="Detection Results" />
        </div>
      )}
      {detectionResults.length > 0 && (
        <div className="detection-results">
          <h3>Detections</h3>
          <ul>
            {detectionResults.map((result, index) => (
              <li key={index}>
                {result.class} - {result.confidence.toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default UploadAndDetect;