import React, { useEffect, useState } from 'react';
import Percentages from './Percentages';
import SummaryTable from './SummaryTable';
import { useNavigate } from 'react-router-dom';
import './Summary.css';

function SummaryAndPercentages() {
  const [summaries, setSummaries] = useState([]);
  const [percentages, setPercentages] = useState({ infested: 0, notInfested: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch summaries from the backend
    fetch('http://192.168.0.77:5000/get_summaries')
      .then((response) => response.json())
      .then((data) => {
        console.log('Summaries:', data); // Debugging
        setSummaries(data);
      })
      .catch((error) => console.error('Error fetching summaries:', error));

    // Fetch percentages from the backend
    fetch('http://192.168.0.77:5000/get_percentages')
      .then((response) => response.json())
      .then((data) => {
        console.log('Percentages:', data); // Debugging
        setPercentages({
          infested: data.infested_percentage || 0,
          notInfested: data.not_infested_percentage || 0,
        });
      })
      .catch((error) => console.error('Error fetching percentages:', error));
  }, []);

  return (
    <div className="summary-and-percentages-container">
      <Percentages percentages={percentages} />
      <SummaryTable summaries={summaries} />
      <button onClick={() => navigate('/')} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default SummaryAndPercentages;