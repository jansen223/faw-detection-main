from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from ultralytics import YOLO
import cv2
import numpy as np
import time
import threading
from datetime import datetime
import sqlite3
import base64
from turbojpeg import TurboJPEG

jpeg = TurboJPEG()

# Initialize Flask app and SocketIO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load YOLOv8 model
model = YOLO("best.pt")

# Global buffer to store video frames (base64 strings)
frame_buffer = []
detection_counts = {
    "infested": 0,
    "not_infested": 0
}

# Add this global variable
last_detection_time = time.time()

# Initialize SQLite database
conn = sqlite3.connect('detections.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS detections
             (id INTEGER PRIMARY KEY, timestamp TEXT, class TEXT, confidence REAL)''')
conn.commit()

@app.route('/detect', methods=['POST'])
def detect_faw():
    global frame_buffer, detection_counts, last_detection_time
    try:
        # Receive image from ESP32-CAM
        img_bytes = request.data
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run YOLOv8 inference
        results = model(img, imgsz=640, conf=0.5)

        # Annotate the image with bounding boxes
        annotated_img = results[0].plot()

        # Compress and encode as base64
        _, buffer = cv2.imencode('.jpg', annotated_img)
        if len(frame_buffer) < 2:  # Limit buffer size
            frame_buffer.append(base64.b64encode(buffer.tobytes()).decode('utf-8'))

        # Check if a minute has passed since the last detection
        current_time = time.time()
        if current_time - last_detection_time > 60:  # 60 seconds of no detections
            detection_counts["infested"] = 0
            detection_counts["not_infested"] = 0

        # Process results
        detected = False
        for box in results[0].boxes:
            class_id = int(box.cls)
            confidence = float(box.conf)
            class_name = model.names[class_id]

            if class_name == "infested corn plant":
                detection_counts["infested"] += 1
                detected = True
            elif class_name == "not infested corn plant":
                detection_counts["not_infested"] += 1
                detected = True

            c.execute("INSERT INTO detections (timestamp, class, confidence) VALUES (?, ?, ?)",
                      (datetime.now(), class_name, confidence))

        conn.commit()

        # Update the last detection time if any corn plant was detected
        if detected:
            last_detection_time = current_time

        # Emit frame and detection counts via SocketIO
        socketio.emit('video_frame', {"image": frame_buffer.pop(0)})
        socketio.emit('detection_counts', {
            'infested_count': detection_counts["infested"],
            'not_infested_count': detection_counts["not_infested"]
        })

        return jsonify({
            'infested_count': detection_counts["infested"],
            'not_infested_count': detection_counts["not_infested"],
            'boxes': results[0].boxes.xywhn.tolist(),
            'classes': results[0].boxes.cls.tolist(),
            'confidences': results[0].boxes.conf.tolist()
        })
        
    except Exception as e:
        return {"error": str(e)}, 500
    
def emit_frames():
    last_frame = None
    while True:
        if frame_buffer:
            try:
                frame = frame_buffer[-1]  # Get latest frame only
                if frame != last_frame:
                    # Hardware-accelerated resize
                    img = cv2.imdecode(np.frombuffer(frame, np.uint8), cv2.IMREAD_COLOR)
                    resized = cv2.resize(img, (320, 240))  # Downscale
                    _, buffer = cv2.imencode('.webp', resized, [cv2.IMWRITE_WEBP_QUALITY, 50])
                    b64_frame = base64.b64encode(buffer).decode('utf-8')
                    socketio.emit('video_frame', {'image': b64_frame})
                    last_frame = frame
            except Exception as e:
                print(f"Frame error: {str(e)}")
        time.sleep(0.033)  # ~30 FPS

def stream_frames():
    """Emit base64 frames to the web app"""
    while True:
        if frame_buffer:
            socketio.emit('video_frame', {"image": frame_buffer.pop(0)})
        time.sleep(0.1)

if __name__ == '__main__':
    threading.Thread(target=stream_frames, daemon=True).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
