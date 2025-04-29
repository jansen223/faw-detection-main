import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // Import the plugin
import './Percentages.css';

// Register Chart.js components and the plugin
ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

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
    labels: ['Infested', 'Not Infested'], // Labels for the chart
    datasets: [
      {
        // data: [infestedPercentage, notInfestedPercentage],
        data: [40, 60],
        backgroundColor: ['#ffcccb', '#c8e6c9'], // Colors for the chart
        borderColor: ['#b71c1c', '#1b5e20'], // Border colors
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
    <div className="percentages-container">
      <h2>Detection Percentages</h2>
      <div className="chart-container">
        <Pie data={data} options={options} />
      </div>
      <button onClick={handleBack} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default Percentages;