import React from 'react';
import './Summary.css';

function SummaryTable({ summaries }) {
  return (
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
          {summaries.length > 0 ? (
            summaries.map((summary) => (
              <tr key={summary.id}>
                <td>{summary.timestamp}</td>
                <td>{summary.infested_count}</td>
                <td>{summary.not_infested_count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SummaryTable;