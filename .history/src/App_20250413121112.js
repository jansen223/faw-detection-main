import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Home from './pages/Home';
import About from './pages/About';
import Team from './pages/Team';
import Summary from './pages/Summary';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [counts, setCounts] = React.useState({ infested: 0, notInfested: 0 });

  useEffect(() => {
    socketRef.current = io('http://192.168.43.26:5000');

    let lastRenderTime = 0;
    socketRef.current.on('video_frame', (data) => {
      const now = Date.now();
      if (now - lastRenderTime < 100) return; // Skip frames if less than 100ms
      lastRenderTime = now;

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
      const response = await fetch('http://192.168.43.26:5000/reset_counts', {
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
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Fall Armyworm (FAW) Infestation Detection System</h1>
        </header>
        <nav className="App-navbar">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/team">Team</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<Home canvasRef={canvasRef} counts={counts} resetCounts={resetCounts} />} />
          <Route path="/about" element={<About />} />
          <Route path="/team" element={<Team />} />
          <Route path="/summary" element={<Summary />} />
        </Routes>
        <footer className="App-footer">
          <p>&copy; 2025 FAW Detection System. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
