import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [counts, setCounts] = React.useState({ infested: 0, notInfested: 0 });

  useEffect(() => {
    // Connect to Flask server
    socketRef.current = io('http://192.168.0.17:5000');

    // Handle video frames
    socketRef.current.on('video_frame', (data) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${data.image}`;
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
    });

    // Handle detection counts
    socketRef.current.on('detection_counts', (data) => {
      setCounts({
        infested: data.infested_count,
        notInfested: data.not_infested_count
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const resetCounts = async () => {
    try {
      const response = await fetch('http://192.168.0.17:5000/reset_counts', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.message) {
        setCounts({ infested: 0, notInfested: 0 });
        alert(data.message);
      }
    } catch (error) {
      console.error('Error resetting counts:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Fall Armyworm (FAW) Detection System</h1>
      </header>
      <nav className="App-navbar">
        <ul>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', border: '1px solid #ccc' }} />
      <div style={{ marginTop: 20 }}>
        <h3>Detection Counts:</h3>
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
    </div>
  );
}

export default App;
