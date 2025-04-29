import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="camera-section">
      <img src="http://<ESP32_IP>/stream" alt="Camera Feed" style={{ maxWidth: '100%' }} />
    </div>
  );
}

export default Home;