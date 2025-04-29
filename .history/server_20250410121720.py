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
import hashlib

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

# Global variable to store detected objects
tracked_objects = set()

# Initialize SQLite database
conn = sqlite3.connect('detections.db', check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS detections
             (id INTEGER PRIMARY KEY, timestamp TEXT, class TEXT, confidence REAL)''')
conn.commit()

@app.route('/detect', methods=['POST'])
def detect_faw():
    global frame_buffer, detection_counts, last_detection_time, tracked_objects
    try:
        # Receive image from ESP32-CAM
        img_bytes = request.data
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run YOLOv8 inference
        results = model(img, imgsz=640, conf=0.5, iou=0.5)

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
            tracked_objects.clear()  # Clear tracked objects

        # Process results
        detected = False
        for box in results[0].boxes:
            class_id = int(box.cls)
            confidence = float(box.conf)
            class_name = model.names[class_id]
            x, y, w, h = box.xywh.tolist()[0]  # Bounding box coordinates

            # Generate a unique ID for the detected object
            object_id = hashlib.md5(f"{class_name}_{x}_{y}_{w}_{h}".encode()).hexdigest()

            # Check if the object is already tracked
            if object_id not in tracked_objects:
                tracked_objects.add(object_id)  # Add the object to the tracked set

                if class_name == "infested corn plant":
                    detection_counts["infested"] += 1
                    detected = True
                elif class_name == "not infested corn plant":
                    detection_counts["not_infested"] += 1
                    detected = True

                # Log the detection in the database
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

@app.route('/reset_counts', methods=['POST'])
def reset_counts():
    global detection_counts
    detection_counts = {"infested": 0, "not_infested": 0}
    return jsonify({"message": "Detection counts reset successfully"})

def stream_frames():
    """Emit base64 frames to the web app"""
    while True:
        if frame_buffer:
            socketio.emit('video_frame', {"image": frame_buffer.pop(0)})
        time.sleep(0.1)

if __name__ == '__main__':
    threading.Thread(target=stream_frames, daemon=True).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)