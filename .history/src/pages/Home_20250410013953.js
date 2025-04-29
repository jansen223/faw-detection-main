import React from 'react';
import './Home.css';

function Home({ canvasRef, counts, resetCounts }) {
  return (
    <div className="layout-container">
      {/* Detection Section */}
      <div className="detection-section">
        <h3>DETECTION COUNTS:</h3>
        <div className="detection-cards">
          <div className="card infested">
            <h4>Infested Corn Plant</h4>
            <p>{counts.infested}</p>
          </div>
          <div className="card not-infested">
            <h4>Not Infested Corn Plant</h4>
            <p>{counts.notInfested}</p>
          </div>
        </div>
        <button onClick={resetCounts} className="reset-button">
          Reset Counts
        </button>
      </div>

      {/* Camera Section */}
      <div className="camera-section">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default Home;