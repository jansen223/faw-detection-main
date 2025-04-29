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
import exifread
import io
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
import exifread

# Initialize Flask app and SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Load YOLOv8 model
try:
    model = YOLO("best.pt")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    exit(1)

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
c.execute('''CREATE TABLE IF NOT EXISTS session_summaries
             (id INTEGER PRIMARY KEY, timestamp TEXT, infested_count INTEGER, not_infested_count INTEGER)''')
conn.commit()

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('corn_plants.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS corn_plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER,
        image_name TEXT,
        gps_lat REAL,
        gps_lon REAL,
        status TEXT
    )
    ''')
    conn.commit()
    conn.close()

init_db()

def save_to_database(batch_id, image_name, gps_lat, gps_lon, status):
    """Save corn plant data to the database."""
    conn = sqlite3.connect('corn_plants.db')
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO corn_plants (batch_id, image_name, gps_lat, gps_lon, status)
    VALUES (?, ?, ?, ?, ?)
    ''', (batch_id, image_name, gps_lat, gps_lon, status))
    conn.commit()
    conn.close()

def decimal_coords(coords, ref):
    """Convert GPS coordinates to decimal format."""
    decimal = float(coords[0] + coords[1] / 60 + coords[2] / 3600)
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

font = ImageFont.truetype("arialbd.ttf", 50)

@app.route('/detect', methods=['GET', 'POST'])
def detect_faw():
    global frame_buffer, detection_counts, last_detection_time, tracked_objects

    if request.method == 'GET':
        return jsonify({"status": "Server running"})

    try:
        img_bytes = request.data
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None or img.size == 0:
            return {"error": "Invalid or empty image data"}, 400

        # Run YOLOv8 inference
        results = model(img, imgsz=640, conf=0.5, iou=0.5)

        annotated_img = results[0].plot()

        # Compress and encode as base64
        _, buffer = cv2.imencode('.jpg', annotated_img)
        if len(frame_buffer) < 2:
            frame_buffer.append(base64.b64encode(buffer.tobytes()).decode('utf-8'))

        current_time = time.time()
        if current_time - last_detection_time > 60:
            detection_counts["infested"] = 0
            detection_counts["not_infested"] = 0
            tracked_objects.clear()

        detected = False
        for box in results[0].boxes:
            class_id = int(box.cls)
            confidence = float(box.conf)
            class_name = model.names[class_id]
            x, y, w, h = box.xywh.tolist()[0]

            object_id = hashlib.md5(f"{class_name}_{x}_{y}_{w}_{h}".encode()).hexdigest()

            if object_id not in tracked_objects:
                tracked_objects.add(object_id)

                if class_name == "infested corn plant":
                    detection_counts["infested"] += 1
                    detected = True
                elif class_name == "not infested corn plant":
                    detection_counts["not_infested"] += 1
                    detected = True

                try:
                    c.execute("INSERT INTO detections (timestamp, class, confidence) VALUES (?, ?, ?)",
                              (datetime.now(), class_name, confidence))
                    conn.commit()
                except sqlite3.Error as db_error:
                    print(f"Database error: {db_error}")

        if detected:
            last_detection_time = current_time

        socketio.emit('video_frame', {"image": frame_buffer.pop(0)} if frame_buffer else {})
        socketio.emit('detection_counts', {
            'infested_count': detection_counts["infested"],
            'not_infested_count': detection_counts["not_infested"]
        })

        return jsonify({
            'infested_count': detection_counts["infested"],
            'not_infested_count': detection_counts["not_infested"],
            'boxes': results[0].boxes.xywhn.tolist() if results[0].boxes is not None else [],
            'classes': results[0].boxes.cls.tolist() if results[0].boxes is not None else [],
            'confidences': results[0].boxes.conf.tolist() if results[0].boxes is not None else []
        })

    except Exception as e:
        print(f"Error in /detect endpoint: {e}")  # Log the error
        return {"error": str(e)}, 500

@app.route('/reset_counts', methods=['POST'])
def reset_counts():
    global detection_counts
    total = detection_counts["infested"] + detection_counts["not_infested"]
    infested_percentage = (detection_counts["infested"] / total) * 100 if total > 0 else 0
    not_infested_percentage = (detection_counts["not_infested"] / total) * 100 if total > 0 else 0

    c.execute("INSERT INTO session_summaries (timestamp, infested_count, not_infested_count) VALUES (?, ?, ?)",
              (datetime.now(), detection_counts["infested"], detection_counts["not_infested"]))
    conn.commit()

    detection_counts = {"infested": 0, "not_infested": 0}

    return jsonify({
        "message": "Detection counts reset successfully",
        "infested_percentage": infested_percentage,
        "not_infested_percentage": not_infested_percentage
    })

@app.route('/get_summaries', methods=['GET'])
def get_summaries():
    c.execute("SELECT * FROM session_summaries")
    summaries = c.fetchall()
    return jsonify(summaries)

@app.route('/get_percentages', methods=['GET'])
def get_percentages():
    global detection_counts
    total = detection_counts["infested"] + detection_counts["not_infested"]
    infested_percentage = (detection_counts["infested"] / total) * 100 if total > 0 else 0
    not_infested_percentage = (detection_counts["not_infested"] / total) * 100 if total > 0 else 0

    return jsonify({
        "infested_percentage": infested_percentage,
        "not_infested_percentage": not_infested_percentage
    })

@app.route('/delete_summary/<int:id>', methods=['DELETE'])
def delete_summary(id):
    c.execute("DELETE FROM session_summaries WHERE id = ?", (id,))
    conn.commit()
    return jsonify({"message": f"Summary with id {id} deleted successfully"})

def stream_frames():
    while True:
        if frame_buffer:
            socketio.emit('video_frame', {"image": frame_buffer.pop(0)})
        time.sleep(0.1)

@app.route('/api/detect', methods=['POST'])
def detect():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500

    if 'images' not in request.files:
        return jsonify({'error': 'No images uploaded'}), 400

    images = request.files.getlist('images')
    results = []

    # Generate a unique batch_id for this upload
    batch_id = int(time.time())  # Use the current timestamp as the batch_id

    for image_file in images:
        try:
            img_bytes = image_file.read()
            image_name = image_file.filename

            # Extract GPS data
            gps_data = {}
            tags = exifread.process_file(io.BytesIO(img_bytes), details=False)
            if 'GPS GPSLatitude' in tags and 'GPS GPSLongitude' in tags:
                lat = decimal_coords(tags['GPS GPSLatitude'].values, tags['GPS GPSLatitudeRef'].values)
                lon = decimal_coords(tags['GPS GPSLongitude'].values, tags['GPS GPSLongitudeRef'].values)
                gps_data = {'lat': lat, 'lon': lon}

            # Process image
            img = Image.open(io.BytesIO(img_bytes))
            draw = ImageDraw.Draw(img)
            detection_results = model(img)

            image_detections = []  # Store all detections for this image

            for result in detection_results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Extract bounding box and confidence
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        confidence = float(box.conf.item()) * 100  # Convert to percentage
                        class_id = int(box.cls.item())
                        status = 'INFESTED' if class_id == 0 else 'NOT INFESTED'

                        # Filter out low-confidence detections (optional)
                        if confidence < 50:
                            continue

                        # Add detection to the list
                        image_detections.append({
                            'bounding_box': [x1, y1, x2, y2],
                            'status': status,
                            'confidence': confidence
                        })

                        # Set bounding box color based on status
                        color = "red" if status == "INFESTED" else "green"
                        draw.rectangle([x1, y1, x2, y2], outline=color, width=5)

                        # Adjust text position to ensure visibility
                        text_x = x1
                        text_y = y1 - 70 if y1 > 70 else y2 + 10  # Place above the box if there's space, otherwise below

                        # Add label with bold status and confidence
                        draw.text((text_x, text_y), f"{status} ({confidence:.2f}%)", fill=color, font=font)

                        # Save to database
                        save_to_database(batch_id, image_name, gps_data.get('lat'), gps_data.get('lon'), status)

            # Convert image with bounding boxes to Base64
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG")
            base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # Append the image and its detections to the results
            results.append({
                'image': base64_image,
                'image_name': image_name,
                'gps': gps_data,
                'detections': image_detections
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify(results)

@app.route('/api/summary', methods=['GET'])
def summary():
    conn = sqlite3.connect('corn_plants.db')
    cursor = conn.cursor()

    # Query for summary data grouped by batch_id
    cursor.execute('''
    SELECT 
        batch_id,
        SUM(CASE WHEN status = 'INFESTED' THEN 1 ELSE 0 END) AS infested_count,
        SUM(CASE WHEN status = 'NOT INFESTED' THEN 1 ELSE 0 END) AS not_infested_count,
        COUNT(*) AS total
    FROM corn_plants
    GROUP BY batch_id
    ''')
    summary_data = cursor.fetchall()

    # Format the response
    summary = []
    for row in summary_data:
        batch_id, infested_count, not_infested_count, total = row
        infested_percentage = (infested_count / total) * 100 if total > 0 else 0
        not_infested_percentage = (not_infested_count / total) * 100 if total > 0 else 0
        summary.append({
            'batch_id': batch_id,
            'infested_count': infested_count,
            'not_infested_count': not_infested_count,
            'infested_percentage': round(infested_percentage, 2),
            'not_infested_percentage': round(not_infested_percentage, 2)
        })

    conn.close()
    return jsonify(summary)

@app.route('/api/delete_batch/<int:batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    """Delete a batch of data based on batch_id."""
    try:
        conn = sqlite3.connect('corn_plants.db')
        cursor = conn.cursor()

        if batch_id == 0:  # Special case for rows with NULL batch_id
            cursor.execute('DELETE FROM corn_plants WHERE batch_id IS NULL')
        else:
            cursor.execute('DELETE FROM corn_plants WHERE batch_id = ?', (batch_id,))

        conn.commit()
        conn.close()

        return jsonify({'message': f'Batch {batch_id} deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    threading.Thread(target=stream_frames, daemon=True).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
