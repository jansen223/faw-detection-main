import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Percentages.css';

function Percentages({ counts }) {
  const navigate = useNavigate();

  const total = counts.infested + counts.notInfested;
  const infestedPercentage = total > 0 ? ((counts.infested / total) * 100).toFixed(2) : 0;
  const notInfestedPercentage = total > 0 ? ((counts.notInfested / total) * 100).toFixed(2) : 0;

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="percentages-container">
      <h2>DETECTION PERCENTAGES</h2>
      <div className="percentages">
        <div className="percentage infested">
          <h3>Infested Corn Plants</h3>
          <p>{infestedPercentage}%</p>
        </div>
        <div className="percentage not-infested">
          <h3>Not Infested Corn Plants</h3>
          <p>{notInfestedPercentage}%</p>
        </div>
      </div>
      <button onClick={handleBack} className="back-button">
        Back to Home
      </button>
    </div>
  );
}

export default Percentages;