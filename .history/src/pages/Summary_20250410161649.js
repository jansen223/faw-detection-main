import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Summary.css';

function Summary() {
  const [summaries, setSummaries] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch summaries from the backend
    fetch('http://192.168.254.108:5000/get_summaries')
      .then((response) => response.json())
      .then((data) => setSummaries(data))
      .catch((error) => console.error('Error fetching summaries:', error));
  }, []);

  return (
    <div className="summary-container">
      <h2>Detection Summaries</h2>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Infested Count</th>
            <th>Not Infested Count</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((summary) => (
            <tr key={summary.id}>
              <td>{summary.timestamp}</td>
              <td>{summary.infested_count}</td>
              <td>{summary.not_infested_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => navigate('/')} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default Summary;