import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useNavigate } from 'react-router-dom';
import './Summary.css';

// Register Chart.js components and the plugin
ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

function SummaryAndPercentages() {
  const [summaries, setSummaries] = useState([]);
  const [percentages, setPercentages] = useState({ infested: 0, notInfested: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch summaries from the backend
    fetch('http://192.168.254.129:5000/get_summaries')
      .then((response) => response.json())
      .then((data) => {
        console.log('Summaries (raw):', data); // Debugging
        const formattedSummaries = data
          .map((item) => {
            const total = item[2] + item[3]; // Total count (infested + not infested)
            const infestedPercentage = total > 0 ? ((item[2] / total) * 100).toFixed(2) : 0; // Calculate infested percentage
            const notInfestedPercentage = total > 0 ? ((item[3] / total) * 100).toFixed(2) : 0; // Calculate not infested percentage
            return {
              id: item[0],
              timestamp: item[1],
              infested_count: item[2],
              not_infested_count: item[3],
              infested_percentage: infestedPercentage,
              not_infested_percentage: notInfestedPercentage,
            };
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp (latest first)
        console.log('Summaries (formatted and sorted):', formattedSummaries); // Debugging
        setSummaries(formattedSummaries);
      })
      .catch((error) => console.error('Error fetching summaries:', error));
  }, []);

  useEffect(() => {
    // Fetch percentages from the backend
    fetch('http://192.168.254.129:5000/get_percentages')
      .then((response) => response.json())
      .then((data) => {
        console.log('Percentages:', data); // Debugging
        setPercentages({
          infested: parseFloat(data.infested_percentage.toFixed(4)) || 0,
          notInfested: parseFloat(data.not_infested_percentage.toFixed(4)) || 0,
        });
      })
      .catch((error) => console.error('Error fetching percentages:', error));
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this summary?')) {
      fetch(`http://192.168.254.129:5000/delete_summary/${id}`, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data.message); // Debugging
          // Remove the deleted summary from the state
          setSummaries((prevSummaries) => prevSummaries.filter((summary) => summary.id !== id));
        })
        .catch((error) => console.error('Error deleting summary:', error));
    }
  };

  // Data for the pie chart
  const data = {
    labels: ['Infested', 'Not Infested'],
    datasets: [
      {
        data: [percentages.infested || 0, percentages.notInfested || 0],
        backgroundColor: ['#ffcccb', '#c8e6c9'],
        borderColor: ['#b71c1c', '#1b5e20'],
        borderWidth: 1,
      },
    ],
  };

  // Chart options to display labels on the chart
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
      datalabels: {
        color: '#000', // Label color
        font: {
          size: 14, // Font size
          weight: 'bold',
        },
        formatter: (value, context) => {
          const label = context.chart.data.labels[context.dataIndex];
          return `${label}: ${value}%`; // Format the label
        },
      },
    },
  };

  return (
    <div>
      <div className="summary-and-percentages-container">
        <div className="chart-section">
          <h2>PERCENTAGE</h2>
          <div className="chart-wrapper">
            {percentages.infested + percentages.notInfested > 0 ? (
              <Pie data={data} options={options} />
            ) : (
              <p>No data available to display the chart.</p>
            )}
          </div>
        </div>
        <div className="summary-section">
          <h2>SUMMARY</h2>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Infested Count</th>
                <th>Not Infested Count</th>
                <th>Infested %</th>
                <th>Not Infested %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length > 0 ? (
                summaries.map((summary) => (
                  <tr key={summary.id}>
                    <td>{summary.timestamp}</td>
                    <td>{summary.infested_count}</td>
                    <td>{summary.not_infested_count}</td>
                    <td>{summary.infested_percentage}%</td>
                    <td>{summary.not_infested_percentage}%</td>
                    <td>
                      <button
                        onClick={() => handleDelete(summary.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={() => navigate('/')} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default SummaryAndPercentages;