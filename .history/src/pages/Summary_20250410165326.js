import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import './SummaryAndPercentages.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip);

function SummaryAndPercentages() {
  const [summaries, setSummaries] = useState([]);
  const [percentages, setPercentages] = useState({ infested: 0, notInfested: 0 });

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
        data: [percentages.infested, percentages.notInfested],
        backgroundColor: ['#ffcccb', '#c8e6c9'],
        borderColor: ['#b71c1c', '#1b5e20'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="summary-and-percentages-container">
      <div className="chart-section">
        <h2>Detection Percentages</h2>
        <Pie data={data} />
      </div>
      <div className="summary-section">
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
      </div>
    </div>
  );
}

export default SummaryAndPercentages;