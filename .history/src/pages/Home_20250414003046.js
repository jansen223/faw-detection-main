import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home({ canvasRef, counts, resetCounts }) {
  const navigate = useNavigate();

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