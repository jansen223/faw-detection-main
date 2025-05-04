import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './UploadAndDetect.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons
const redIcon = new L.Icon({
  iconUrl: require('../assets/red-pin.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: require('../assets/green-pin.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 24);
    }
  }, [position, map]);
  return null;
}

function UploadAndDetect() {
  const [results, setResults] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null); // For zooming to a marker
  const [selectedImage, setSelectedImage] = useState(null); // For full-screen image modal
  const [summary, setSummary] = useState([]); // For summary table
  const [loading, setLoading] = useState(false); // Loading state

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    multiple: true,
    onDrop: async (acceptedFiles) => {
      const formData = new FormData();
      acceptedFiles.forEach((file) => formData.append('images', file));

      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/detect', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(data);

        const gpsPoints = data
          .filter((item) => item.gps.lat && item.gps.lon)
          .map((item) => {
            const isInfested = item.detections.some((detection) => detection.status === 'INFESTED');
            return {
              lat: item.gps.lat,
              lng: item.gps.lon,
              infested: isInfested,
            };
          });
        setMapData(gpsPoints);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to process images. Please try again.');
      } finally {
        setLoading(false);
        fetchSummary();
      }
    },
  });

  const fetchSummary = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const deleteBatch = async (batchId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/delete_batch/${batchId || 0}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete batch ${batchId}`);
      }

      const result = await response.json();
      alert(result.message);

      // Refresh the summary table after deletion
      fetchSummary();
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete the batch. Please try again.');
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="App">
      <h3>UPLOAD IMAGES FOR MAPPING</h3>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag and drop images here, or click to select files</p>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing images, please wait...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="image-gallery">
          {results.map((result, idx) => (
            <div key={idx} className="image-item" onClick={() => setSelectedImage(result.image)}>
              <h4>Image {idx + 1}</h4>
              <img
                src={`data:image/jpeg;base64,${result.image}`}
                alt={`Processed ${idx + 1}`}
              />
              {result.detections.map((detection, i) => (
                <p key={i}>
                  Status: {detection.status}, Confidence: {detection.confidence.toFixed(2)}%
                </p>
              ))}
              {result.gps.lat && result.gps.lon && (
                <p>GPS: {result.gps.lat.toFixed(6)}, {result.gps.lon.toFixed(6)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={`data:image/jpeg;base64,${selectedImage}`} alt="Full Screen" />
          </div>
        </div>
      )}

      {mapData.length > 0 && (
        <div className="map-container">
          <MapContainer
            center={[mapData[0].lat, mapData[0].lng]}
            zoom={20}
            style={{ height: '800px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {mapData.map((point, idx) => (
              <Marker
                key={idx}
                position={[point.lat, point.lng]}
                icon={point.infested ? redIcon : greenIcon}
                eventHandlers={{
                  click: () => setSelectedPosition([point.lat, point.lng]), // Zoom to marker on click
                }}
              >
                <Popup>
                  {point.infested ? 'Infested Corn Plant' : 'Not Infested Corn Plant'}
                </Popup>
              </Marker>
            ))}
            {selectedPosition && <FlyToMarker position={selectedPosition} />}
          </MapContainer>
        </div>
      )}

      {summary.length > 0 && (
        <div className="summary-table">
          <h2>Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Infested Count</th>
                <th>Not Infested Count</th>
                <th>Percentage of Infested</th>
                <th>Percentage of Not Infested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.batch_id}</td>
                  <td>{row.infested_count}</td>
                  <td>{row.not_infested_count}</td>
                  <td>{row.infested_percentage}%</td>
                  <td>{row.not_infested_percentage}%</td>
                  <td>
                    <button onClick={() => deleteBatch(row.batch_id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UploadAndDetect;