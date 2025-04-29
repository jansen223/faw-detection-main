import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home({ canvasRef, counts, resetCounts }) {
  const navigate = useNavigate();

  const handleViewPercentages = () => {
    navigate('/percentages');
  };

  return (
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
        <button onClick={resetCounts} className="reset-button">
          Reset Counts
        </button>
        <button onClick={() => navigate('/summary')} className="view-summary-button">
          View Summary
        </button>
      </div>
      <div className="camera-section">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default Home;