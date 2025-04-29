import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home({ canvasRef, counts, resetCounts }) {
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://192.168.254.113:5000/upload_image', {
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
    <div className="home-container">
      <header>
        <h2>Welcome to the FAW Detection System</h2>
      </header>
      <div className="upload-section">
        <h3>Upload an Image for Detection</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="upload-input"
        />
      </div>
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
      <div className="layout-container">
        <div className="detection-section">
          <h3>DETECTION COUNTS</h3>
          <div className="detection-cards">
            <div className="card infested">
              <h4>Infested Corn Plants</h4>
              <p>{counts.infested}</p>
            </div>
            <div className="card not-infested">
              <h4>Not Infested Corn Plants</h4>
              <p>{counts.notInfested}</p>
            </div>
          </div>
          <div className="options">
            <button onClick={resetCounts} className="reset-button">
              Reset Counts
            </button>
            <button onClick={() => navigate('/summary')} className="view-summary-button">
              View Summary
            </button>
          </div>
        </div>
        <div className="camera-section">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

export default Home;