import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './Percentages.css';

// Register Chart.js components and the plugin
ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

function Percentages({ percentages }) {
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
    <div className="chart-section">
      <h2>PERCENTAGES</h2>
      {percentages.infested + percentages.notInfested > 0 ? (
        <Pie data={data} options={options} />
      ) : (
        <p>No data available to display the chart.</p>
      )}
    </div>
  );
}

export default Percentages;