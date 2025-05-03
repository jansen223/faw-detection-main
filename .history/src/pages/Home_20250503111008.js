import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import './Summary.css';

function Home() {
  const navigate = useNavigate();
  const [totalCorn, setTotalCorn] = useState(0);
  const [infestedCorn, setInfestedCorn] = useState(0);
  const [percentageInfested, setPercentageInfested] = useState(0);
  const [isScreenCaptured, setIsScreenCaptured] = useState(false);
  const [isServerReachable, setIsServerReachable] = useState(false);
  const canvasRef = useRef(null);
  const videoCaptureRef = useRef(null);
  const iframeRef = useRef(null);
  const boxesRef = useRef([]);
  const classesRef = useRef([]);

  const statusText = isServerReachable && isScreenCaptured
    ? 'Connected ✅'
    : 'Disconnected ❌';

  useEffect(() => {
    console.log('isScreenCaptured:', isScreenCaptured);
    console.log('isServerReachable:', isServerReachable);
    console.log('statusText:', statusText);
  }, [isScreenCaptured, isServerReachable, statusText]);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:5000/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Blob([]),
        });

        if (response.ok) {
          setIsServerReachable(true);
          console.log('Server is reachable');
        } else {
          setIsServerReachable(false);
          console.log('Server is not reachable');
        }
      } catch (error) {
        console.error('Error connecting to server:', error);
        setIsServerReachable(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const videoElement = videoCaptureRef.current; // Copy ref once
  
    const captureIframeScreen = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false,
        });
  
        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play();
        }
  
        setIsScreenCaptured(true);
        console.log('Screen captured successfully');
      } catch (err) {
        console.error('Error capturing iframe screen:', err);
        setIsScreenCaptured(false);
      }
    };
  
    captureIframeScreen();
  
    return () => {
      if (videoElement) {
        const stream = videoElement.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
        }
      }
    };
  }, []);  

  useEffect(() => {
    const captureAndDetect = () => {
      const video = videoCaptureRef.current;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      if (!video || video.readyState < 2) return;

      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      tempCanvas.toBlob(async (blob) => {
        if (blob && blob.size > 0) {
          try {
            const response = await fetch('http://localhost:5000/detect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
              },
              body: blob,
            });
            const result = await response.json();
            boxesRef.current = result.boxes || [];
            classesRef.current = result.classes || [];
            updateCounts(result);

            setIsServerReachable(true);
          } catch (err) {
            console.error('Error sending frame to server:', err);
            setIsServerReachable(false);
          }
        }
      }, 'image/jpeg');
    };

    const intervalId = setInterval(captureAndDetect, 6000);
    return () => clearInterval(intervalId);
  }, []);

  // const drawBoxes = (ctx) => {
  //   const boxes = boxesRef.current;
  //   const classes = classesRef.current;

  //   ctx.lineWidth = 6;
  //   ctx.font = '26px Arial';

  //   boxes.forEach((box, idx) => {
  //     const [x_center, y_center, width, height] = box;
  //     const x = (x_center - width / 2) * ctx.canvas.width;
  //     const y = (y_center - height / 2) * ctx.canvas.height;
  //     const w = width * ctx.canvas.width;
  //     const h = height * ctx.canvas.height;

  //     ctx.strokeStyle = classes[idx] === 0 ? 'red' : 'green';
  //     ctx.fillStyle = classes[idx] === 0 ? 'red' : 'green';

  //     ctx.strokeRect(x, y, w, h);
  //     ctx.fillText(classes[idx] === 0 ? 'Infested' : 'Healthy', x, y > 20 ? y - 10 : y + 30);
  //   });
  // };

  const updateCounts = (result) => {
    const total = result.infested_count + result.not_infested_count;
    setTotalCorn(total);
    setInfestedCorn(result.infested_count);
    setPercentageInfested(total > 0 ? (result.infested_count / total) * 100 : 0);
  };

  // const saveSummary = async (infestedCount, notInfestedCount) => {
  //   if (infestedCount + notInfestedCount === 0) return;

  //   try {
  //     const response = await fetch('http://localhost:5000/save_summary', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         infested_count: infestedCount,
  //         not_infested_count: notInfestedCount,
  //       }),
  //     });

  //     const data = await response.json();
  //     console.log('Summary saved:', data.message);
  //   } catch (err) {
  //     console.error('Error saving summary:', err);
  //   }
  // };

  return (
    <>
      <div className="layout-container">
        {/* Detection Summary */}
        <div className="detection-section">
          <h3>DETECTION SUMMARY</h3>

          <div className="detection-cards">
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
              <p>{totalCorn - infestedCorn}</p>
            </div>
            <div className="card percentage">
              <h4>Percentage Infested</h4>
              <p>{percentageInfested ? percentageInfested.toFixed(2) : '0.00'}%</p>
            </div>
          </div>
        </div>

        {/* Drone Live Feed Section */}
        <div className="drone-feed-section">
          <h3>DRONE LIVE FEED</h3>

          <div className="iframe-container" style={{ position: 'relative', width: '1000px', height: '600px' }}>
            <iframe
              ref={iframeRef}
              title="Drone Live Feeds"
              src="https://vdo.ninja/?view=VZeA6ZX&autoplay=1&muted=1"
              allow="camera; microphone; autoplay; fullscreen"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'relative', zIndex: 1 }}
            />

            <video
              ref={videoCaptureRef}
              style={{ display: 'none' }}
            />

            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          </div>
        </div>
        {/* Options */}
      <div className="options">
        <button 
          onClick={() => navigate('/summary', {
            state: {
              totalCorn,
              infestedCorn,
              notInfestedCorn: totalCorn - infestedCorn,
              percentageInfested,
            }
          })}
          className="view-summary-button"
        >
          View Summary
        </button>
      </div>
      </div>
    </>
  );
}

export default Home;
