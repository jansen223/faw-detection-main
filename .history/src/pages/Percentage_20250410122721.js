import React from 'react';
import './Percentage.css';

function Percentages({ counts }) {
  const total = counts.infested + counts.notInfested;
  const infestedPercentage = total > 0 ? ((counts.infested / total) * 100).toFixed(2) : 0;
  const notInfestedPercentage = total > 0 ? ((counts.notInfested / total) * 100).toFixed(2) : 0;

  return (
    <div className="percentages-container">
      <h2>Detection Percentages</h2>
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
    </div>
  );
}

export default Percentages;