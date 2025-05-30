import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import './Summary.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip);

function SummaryAndPercentages() {
  const [summaries, setSummaries] = useState([]);

  const total = counts.infested + counts.notInfested;
  const infestedPercentage = total > 0 ? ((counts.infested / total) * 100).toFixed(2) : 0;
  const notInfestedPercentage = total > 0 ? ((counts.notInfested / total) * 100).toFixed(2) : 0;

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch summaries from the backend
    fetch('http://192.168.254.108:5000/get_summaries')
      .then((response) => response.json())
      .then((data) => setSummaries(data))
      .catch((error) => console.error('Error fetching summaries:', error));

    // Fetch percentages from the backend
    fetch('http://192.168.254.108:5000/reset_counts', { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        setPercentages({
          infested: data.infested_percentage,
          notInfested: data.not_infested_percentage
        });
      })
      .catch((error) => console.error('Error fetching percentages:', error));
  }, []);

  // Data for the pie chart
  const data = {
    labels: ['Infested', 'Not Infested'],
    datasets: [
      {
        data: [infestedPercentage, notInfestedPercentage],
        backgroundColor: ['#ffcccb', '#c8e6c9'],
        borderColor: ['#b71c1c', '#1b5e20'],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false, // Disable the legend
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw}%`,
        },
      },
    },
  };

  return (
    <div className="summary-and-percentages-container">
      <div className="chart-section">
        <h2>PERCENTAGE</h2>
        <Pie data={data} />
      </div>
      <div className="summary-section">
        <h2>SUMMARY</h2>
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
      </div>
      <button onClick={() => navigate('/')} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default SummaryAndPercentages;