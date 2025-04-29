import React, { useEffect, useRef } from 'react';
import io from 'socket.io-client';

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [counts, setCounts] = React.useState({ infested: 0, notInfested: 0 });

  useEffect(() => {
    // Connect to Flask server
    socketRef.current = io('http://192.168.0.17:5000');

    // Handle video frames
    socketRef.current.on('video_frame', (data) => {
      console.log('Received video frame:', data);
      const img = new Image();
      img.src = `data:image/jpeg;base64,${data.image}`;
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('Canvas not found');
          return;
        }
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>FAW Detection</h1>
      </header>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', border: '1px solid #ccc' }} />
      <div style={{ marginTop: 20 }}>
        <h3>Detection Counts:</h3>
        <p>Infested: {counts.infested}</p>
        <p>Not Infested: {counts.notInfested}</p>
      </div>
    </div>
  );
}

export default App;
