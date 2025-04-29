import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDropzone } from 'react-dropzone';
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

function UploadAndDetect() {
  const [results, setResults] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(false);

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
          .map((item) => ({
            lat: item.gps.lat,
            lng: item.gps.lon,
            infested: item.detections.some((detection) => detection.status === 'INFESTED'),
          }));
        setMapData(gpsPoints);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to process images. Please try again.');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="upload-and-detect">
      <h2>Upload and Detect</h2>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} />
        <p>Drag and drop images here, or click to select files</p>
      </div>

      {loading && <p>Processing images, please wait...</p>}

      {results.length > 0 && (
        <div className="results">
          {results.map((result, idx) => (
            <div key={idx} className="result">
              <h3>{result.image_name}</h3>
              <img src={`data:image/jpeg;base64,${result.image}`} alt="Detection Result" />
              <ul>
                {result.detections.map((detection, i) => (
                  <li key={i}>
                    {detection.status} - {detection.confidence.toFixed(2)}%
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {mapData.length > 0 && (
        <div className="map-container">
          <MapContainer center={[mapData[0].lat, mapData[0].lng]} zoom={15} style={{ height: '500px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {mapData.map((point, idx) => (
              <Marker
                key={idx}
                position={[point.lat, point.lng]}
                icon={point.infested ? redIcon : greenIcon}
              >
                <Popup>{point.infested ? 'Infested Corn Plant' : 'Not Infested Corn Plant'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

export default UploadAndDetect;