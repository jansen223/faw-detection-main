import React, { useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Team from './pages/Team';
import Summary from './pages/Summary';
import UploadAndDetect from './pages/UploadAndDetect'; // Import the new page
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const [counts, setCounts] = React.useState({ infested: 0, notInfested: 0 });

  const resetCounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/reset_counts', {
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
            <li><Link to="/upload-and-detect">Upload</Link></li> {/* New button */}
            <li><Link to="/about">About</Link></li>
            <li><Link to="/team">Team</Link></li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<Home canvasRef={canvasRef} counts={counts} resetCounts={resetCounts} />} />
          <Route path="/upload-and-detect" element={<UploadAndDetect />} /> {/* New route */}
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
