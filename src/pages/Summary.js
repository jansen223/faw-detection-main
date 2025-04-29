import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useNavigate, useLocation } from 'react-router-dom';
import './Summary.css';

ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

function SummaryAndPercentages() {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState([]);
  const [percentages, setPercentages] = useState({ infested: 0, notInfested: 0 });
  const navigate = useNavigate();
  const location = useLocation();

  const { totalCorn, infestedCorn, percentageInfested } = location.state || {};

  useEffect(() => {
    // Fetch both summaries and percentages at the same time
    Promise.all([
      fetch('http://192.168.254.113:5000/get_summaries').then((res) => res.json()),
      fetch('http://192.168.254.113:5000/get_percentages').then((res) => res.json())
    ])
      .then(([summariesData, percentagesData]) => {
        // Handle summaries
        const formattedSummaries = summariesData
          .map((item) => {
            const total = item[2] + item[3];
            const infestedPercentage = total > 0 ? ((item[2] / total) * 100).toFixed(2) : 0;
            const notInfestedPercentage = total > 0 ? ((item[3] / total) * 100).toFixed(2) : 0;
            return {
              id: item[0],
              timestamp: item[1],
              infested_count: item[2],
              not_infested_count: item[3],
              infested_percentage: infestedPercentage,
              not_infested_percentage: notInfestedPercentage,
            };
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSummaries(formattedSummaries);

        // Handle percentages
        setPercentages({
          infested: isNaN(percentagesData.infested_percentage) ? 0 : parseFloat(percentagesData.infested_percentage.toFixed(2)),
          notInfested: isNaN(percentagesData.not_infested_percentage) ? 0 : parseFloat(percentagesData.not_infested_percentage.toFixed(2)),
        });

        setLoading(false); // ✅ Now set loading false after both are done
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false); // Even on error, stop loading
      });
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this summary?')) {
      fetch(`http://192.168.254.113:5000/delete_summary/${id}`, {
        method: 'DELETE',
      })
        .then((response) => response.json())
        .then(() => {
          setSummaries((prevSummaries) => prevSummaries.filter((summary) => summary.id !== id));
        })
        .catch((error) => console.error('Error deleting summary:', error));
    }
  };

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

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.label}: ${tooltipItem.raw}%`,
        },
      },
      datalabels: {
        color: '#000',
        font: { size: 14, weight: 'bold' },
        formatter: (value, context) => {
          const label = context.chart.data.labels[context.dataIndex];
          return `${label}: ${value}%`;
        },
      },
    },
  };

  return (
    <div>
      <div className="summary-and-percentages-container">
        {/* ✅ Live Summary Section */}
        {totalCorn !== undefined && (
          <div className="live-summary">
            <h2>Live Detection Summary</h2>
            <div className="detection-cards">
              <div className="card total">
                <h4>Total Corn Plants Detected</h4>
                <p>{totalCorn}</p>
              </div>
              <div className="card infested">
                <h4>Infested Corn Plants</h4>
                <p>{infestedCorn}</p>
              </div>
              <div className="card percentage">
                <h4>Percentage Infested</h4>
                <p>{percentageInfested !== undefined ? percentageInfested.toFixed(2) : '0.00'}%</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Chart Section */}
        <div className="chart-section">
          <h2>PERCENTAGE</h2>
          <div className="chart-wrapper">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>
                Loading chart...
              </div>
            ) : percentages.infested + percentages.notInfested > 0 ? (
              <Pie data={data} options={options} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>
                No data available to display the chart.
              </div>
            )}
          </div>
        </div>

        {/* ✅ Summaries Table */}
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
              {loading ? (
                <tr>
                  <td colSpan="6">Loading summaries...</td>
                </tr>
              ) : summaries.length > 0 ? (
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
                  <td colSpan="6">No data available in the database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Back Button */}
      <button onClick={() => navigate('/')} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default SummaryAndPercentages;
