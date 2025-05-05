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
  const trackedObjectsRef = useRef([]);
  const nextObjectId = useRef(1); // Use useRef to persist the ID counter
  const infestedPlantIdsRef = useRef(new Set()); // Stores IDs of plants ever marked as infested

  const statusText = isServerReachable && isScreenCaptured
    ? 'Connected ✅'
    : 'Disconnected ❌';

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:5000/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Blob([]),
        });
        setIsServerReachable(response.ok);
      } catch {
        setIsServerReachable(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const captureIframeScreen = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false,
        });
        const video = videoCaptureRef.current;
        video.srcObject = stream;
        await video.play();
        setIsScreenCaptured(true);
      } catch {
        setIsScreenCaptured(false);
      }
    };

    captureIframeScreen();
    return () => {
      const video = videoCaptureRef.current;
      const stream = video?.srcObject;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let animationFrameId;
    let isMounted = true;
    const drawVideo = () => {
      if (!isMounted) return;
      const video = videoCaptureRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animationFrameId = requestAnimationFrame(drawVideo);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(drawVideo);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawBoxes(ctx);
      animationFrameId = requestAnimationFrame(drawVideo);
    };
    animationFrameId = requestAnimationFrame(drawVideo);
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
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
              headers: { 'Content-Type': 'application/octet-stream' },
              body: blob,
            });
            const result = await response.json();
            const newDetections = (result.boxes || []).map((box, index) => ({
              box: box,
              class: (result.classes || [])[index],
            }));
            updateTrackedObjects(newDetections); // Update tracked objects
            updateCounts(); // Update counts based on tracked objects
            setIsServerReachable(true);
          } catch (err) {
            setIsServerReachable(false);
          }
        }
      }, 'image/jpeg');
    };

    const intervalId = setInterval(captureAndDetect, 2000);
    return () => clearInterval(intervalId);
  }, []);

  // Function to calculate Intersection over Union (IoU)
  const iou = (boxA, boxB) => {
    const [xA, yA, wA, hA] = boxA;
    const [xB, yB, wB, hB] = boxB;

    const xA1 = xA - wA / 2, yA1 = yA - hA / 2;
    const xA2 = xA + wA / 2, yA2 = yA + hA / 2;
    const xB1 = xB - wB / 2, yB1 = yB - hB / 2;
    const xB2 = xB + wB / 2, yB2 = yB + hB / 2;

    const interX1 = Math.max(xA1, xB1);
    const interY1 = Math.max(yA1, yB1);
    const interX2 = Math.min(xA2, xB2);
    const interY2 = Math.min(yA2, yB2);

    const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
    const boxAArea = (xA2 - xA1) * (yA2 - yA1);
    const boxBArea = (xB2 - xB1) * (yB2 - yB1);

    const unionArea = boxAArea + boxBArea - interArea;
    return unionArea > 0 ? interArea / unionArea : 0; // Avoid division by zero
  };

  // Function to update tracked objects
  const updateTrackedObjects = (newDetections) => {
    const now = Date.now();
    const updatedTrackedObjects = [];
    const matchedIndices = new Set();

    // Try to match new detections with existing tracked objects
    newDetections.forEach((detection) => {
      let bestMatch = null;
      let highestIou = 0.4; // IoU threshold (Increased from 0.3)

      trackedObjectsRef.current.forEach((obj, index) => {
        if (!matchedIndices.has(index)) { // Only consider unmatched tracked objects
          const iouValue = iou(obj.box, detection.box);
          if (iouValue > highestIou) {
            highestIou = iouValue;
            bestMatch = { ...obj, index }; // Store index to mark as matched
          }
        }
      });

      if (bestMatch) {
        // Update the matched object
        bestMatch.box = detection.box;
        bestMatch.timestamp = now;
        bestMatch.class = detection.class; // Update class
        updatedTrackedObjects.push(bestMatch);
        matchedIndices.add(bestMatch.index); // Mark this tracked object index as matched
        // Add to cumulative infested set if it's infested
        if (bestMatch.class === 0) {
          infestedPlantIdsRef.current.add(bestMatch.id);
        }
      } else {
        // Assign a new ID and add as a new object
        const newObj = {
          id: nextObjectId.current++,
          box: detection.box,
          timestamp: now,
          class: detection.class,
        };
        updatedTrackedObjects.push(newObj);
        // Add to cumulative infested set if it's infested
        if (newObj.class === 0) {
          infestedPlantIdsRef.current.add(newObj.id);
        }
      }
    });

    // Add back any existing tracked objects that weren't matched but are not stale
    trackedObjectsRef.current.forEach((obj, index) => {
      // Keep objects that weren't matched if they are not stale (Increased timeout to 10s)
      if (!matchedIndices.has(index) && now - obj.timestamp < 1000) {
        updatedTrackedObjects.push(obj);
      }
    });

    // Update the ref with the new list of tracked objects
    trackedObjectsRef.current = updatedTrackedObjects;
  };

  // Updated drawBoxes function to use tracked objects and show IDs
  const drawBoxes = (ctx) => {
    const trackedObjects = trackedObjectsRef.current;

    // Clear previous drawings
    // ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clearing is handled by drawVideo loop

    ctx.lineWidth = 4; // Increased thickness of bounding boxes
    ctx.font = '24px Arial'; // Increased font size for labels

    trackedObjects.forEach((obj) => {
      const [x_center, y_center, width, height] = obj.box;
      // Ensure box dimensions are valid numbers
      if ([x_center, y_center, width, height].some(isNaN)) {
        console.warn("Skipping drawing invalid box:", obj);
        return;
      }

      const x = (x_center - width / 2) * ctx.canvas.width;
      const y = (y_center - height / 2) * ctx.canvas.height;
      const w = width * ctx.canvas.width;
      const h = height * ctx.canvas.height;

      // Ensure calculated coordinates are valid
      if ([x, y, w, h].some(isNaN)) {
        console.warn("Skipping drawing invalid calculated box:", { x, y, w, h, obj });
        return;
      }

      ctx.strokeStyle = obj.class === 0 ? 'red' : 'green';
      ctx.strokeRect(x, y, w, h);

      // Display the unique ID and classification text
      const idText = `ID: ${obj.id}`;
      const classText = obj.class === 0 ? 'INFESTED' : 'HEALTHY';
      const textYPosition = y > 40 ? y - 5 : y + 25; // Adjust base position if box is near top

      ctx.fillStyle = 'yellow'; // Text color
      ctx.fillText(idText, x, textYPosition);
      ctx.fillText(classText, x, textYPosition + 30); // Place classification text below ID
    });
  };

  // Updated updateCounts function for cumulative total and cumulative infested
  const updateCounts = () => {
    const cumulativeTotalCount = nextObjectId.current - 1; // Total unique plants ever detected
    const cumulativeInfestedCount = infestedPlantIdsRef.current.size;
  
    setTotalCorn(cumulativeTotalCount);
    setInfestedCorn(cumulativeInfestedCount);
  
    if (cumulativeTotalCount > 0) {
      const percentage = (cumulativeInfestedCount / cumulativeTotalCount) * 100;
      setPercentageInfested(percentage);
    } else {
      setPercentageInfested(0);
    }
  };
  

  return (
    <>
      <div className="layout-container">
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
              {/* Use state variables which hold the cumulative counts */}
              <p>{totalCorn - infestedCorn}</p>
            </div>
            <div className="card percentage">
              <h4>Percentage Infested</h4>
              <p>{percentageInfested.toFixed(2)}%</p>
            </div>
          </div>
        </div>

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
            <video ref={videoCaptureRef} style={{ display: 'none' }} />
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
