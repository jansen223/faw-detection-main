import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './Percentages.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function Percentages({ counts }) {
  const navigate = useNavigate();

  const total = counts.infested + counts.notInfested;
  const infestedPercentage = total > 0 ? ((counts.infested / total) * 100).toFixed(2) : 0;
  const notInfestedPercentage = total > 0 ? ((counts.notInfested / total) * 100).toFixed(2) : 0;

  const handleBack = () => {
    navigate('/');
  };

  // Data for the pie chart
  const data = {
    labels: ['Infested Corn Plants', 'Not Infested Corn Plants'],
    datasets: [
      {
        // data: [infestedPercentage, notInfestedPercentage],
        data: [60, 40],
        backgroundColor: ['#ffcccb', '#c8e6c9'], // Colors for the chart
        borderColor: ['#b71c1c', '#1b5e20'], // Border colors
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="percentages-container">
      <h2>DETECTION PERCENTAGES</h2>
      <div className="chart-container">
        <Pie data={data} />
      </div>
      <button onClick={handleBack} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default Percentages;