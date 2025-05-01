import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function Summary() {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const { totalCorn, infestedCorn, percentageInfested } = location.state || {};

  const healthyCorn = totalCorn - infestedCorn;


  const data = {
    labels: ['Infested Corn', 'Healthy Corn'],
    datasets: [
      {
        data: [infestedCorn, healthyCorn],
        backgroundColor: ['#b71c1c', '#1b5e20'],
        hoverBackgroundColor: ['#ffcccb', '#c8e6c9'],
      },
    ],
  };

  return (
    <div className="summary-container" style={{ textAlign: 'center' }}>
      <h3>Detection Summary</h3>

      {/* Detection Cards */}
      <div
        className="detection-cards"
        style={{
          display: 'flex', // Center the cards
          textAlign: 'left', // Align text inside the cards to the left
          marginBottom: '20px',
        }}
      >
        <div className="card total">
          <h4>Total Corn Plants Detected</h4>
          <p>{totalCorn}</p>
        </div>
        <div className="card infested">
          <h4>Infested Corn Plants</h4>
          <p>{infestedCorn}</p>
        </div>
        <div className="card not-infested">
          <h4>Not Infested Corn Plants</h4>
          <p>{healthyCorn}</p>
        </div>
        <div className="card percentage">
          <h4>Percentage Infested</h4>
          <p>{percentageInfested ? percentageInfested.toFixed(2) : '0.00'}%</p>
        </div>
      </div>

      {/* Pie Chart */}
      <div
        className="chart-container"
        style={{
          width: '600px',
          height: '600px',
          margin: '50px auto', // Center horizontally
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center', // Center vertically
        }}
      >
        <h3>Infestation Breakdown</h3>
        <Pie data={data} options={{ maintainAspectRatio: false }} />
      </div>

      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')} // Navigate to the Home page
        className="back-to-home-button"
      >
        Back to Home
      </button>
    </div>
  );
}

export default Summary;