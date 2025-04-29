import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

function Home({ canvasRef, counts, resetCounts }) {
  return (
    <div>
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

function About() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>About</h2>
      <p>This web app is designed to detect Fall Armyworm infestations in corn plants using a live camera feed and machine learning.</p>
    </div>
  );
}

function Team() {
  const teamMembers = [
    {
      name: "John Doe",
      role: "Machine Learning Engineer",
      description: "Specializes in developing and optimizing machine learning models.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "Jane Smith",
      role: "Frontend Developer",
      description: "Focuses on creating user-friendly interfaces and experiences.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "Alice Johnson",
      role: "Backend Developer",
      description: "Expert in building scalable and efficient server-side applications.",
      image: "https://via.placeholder.com/150"
    },
    {
      name: "Bob Brown",
      role: "Project Manager",
      description: "Ensures timely delivery and smooth collaboration across the team.",
      image: "https://via.placeholder.com/150"
    }
  ];

  return (
    <div className="team-container">
      <h2>Meet Our Team</h2>
      <div className="team-members">
        {teamMembers.map((member, index) => (
          <div key={index} className="team-member">
            <img src={member.image} alt={`${member.name}`} className="team-member-image" />
            <h3>{member.name}</h3>
            <p className="team-member-role">{member.role}</p>
            <p className="team-member-description">{member.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Fall Armyworm (FAW) Detection System</h1>
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
        </Routes>
        <footer className="App-footer">
          <p>&copy; 2025 FAW Detection System. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
