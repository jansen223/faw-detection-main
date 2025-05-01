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
import logging
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
from queue import Queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app and SocketIO
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app,
                    cors_allowed_origins="*",
                    async_mode='threading',
                    logger=True,
                    engineio_logger=True)

# Load YOLOv8 model
try:
    model = YOLO("best.pt")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    exit(1)

# Global buffer to store video frames (base64 strings)
frame_buffer = Queue(maxsize=10)
detection_counts = {
    "infested": 0,
    "not_infested": 0
}

# Global variable to store detected objects
tracked_objects = set()

# Initialize SQLite database
def get_db_connection():
    conn = sqlite3.connect('detections.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS detections
                     (id INTEGER PRIMARY KEY, 
                      timestamp TEXT, 
                      class TEXT, 
                      confidence REAL)''')
        conn.execute('''CREATE TABLE IF NOT EXISTS session_summaries
                     (id INTEGER PRIMARY KEY, 
                      timestamp TEXT, 
                      infested_count INTEGER, 
                      not_infested_count INTEGER)''')
        conn.commit()

init_db()

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

@app.route('/detect', methods=['POST'])
def detect_faw():
    try:
        start_time = time.time()
        
        # Read the uploaded image
        img_bytes = request.data
        if not img_bytes or len(img_bytes) == 0:
            logger.warning("No image data received")
            return {"error": "No image data received"}, 400

        try:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None or img.size == 0:
                logger.warning("Invalid or empty image data")
                return {"error": "Invalid or empty image data"}, 400
        except Exception as e:
            logger.error(f"Image decoding error: {e}")
            return {"error": "Invalid image data"}, 400

        # Run YOLOv8 inference
        try:
            results = model(img, imgsz=640, conf=0.5, iou=0.5)
            if not results or len(results) == 0:
                return jsonify({
                    'infested_count': detection_counts["infested"],
                    'not_infested_count': detection_counts["not_infested"],
                    'boxes': [],
                    'classes': [],
                    'confidences': []
                })
        except Exception as e:
            logger.error(f"Inference error: {e}")
            return {"error": "Model inference failed"}, 500

        # Process results
        boxes = []
        classes = []
        confidences = []
        current_infested = 0
        current_not_infested = 0

        if results[0].boxes is not None:
            boxes = results[0].boxes.xywhn.cpu().numpy().tolist()
            classes = results[0].boxes.cls.cpu().numpy().tolist()
            confidences = results[0].boxes.conf.cpu().numpy().tolist()

            # Update counts
            for cls in classes:
                if cls == 0:  # Assuming 0 is infested
                    current_infested += 1
                else:
                    current_not_infested += 1

            # Update global counts in a thread-safe way
            with threading.Lock():
                detection_counts["infested"] += current_infested
                detection_counts["not_infested"] += current_not_infested

            # Store detections in database
            try:
                conn = get_db_connection()
                timestamp = datetime.now().isoformat()
                for cls, conf in zip(classes, confidences):
                    conn.execute(
                        "INSERT INTO detections (timestamp, class, confidence) VALUES (?, ?, ?)",
                        (timestamp, "infested" if cls == 0 else "not_infested", float(conf))
                    )
                conn.commit()
            except Exception as e:
                logger.error(f"Database error: {e}")
            except Exception as e:
                logger.error(f"Database error: {e}")
            finally:
                conn.close()

        # Generate annotated image
        try:
            annotated_img = results[0].plot()
            _, buffer = cv2.imencode('.jpg', annotated_img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            frame_data = base64.b64encode(buffer.tobytes()).decode('utf-8')
            
            # Non-blocking frame buffer addition
            if not frame_buffer.full():
                frame_buffer.put(frame_data)
        except Exception as e:
            logger.error(f"Image processing error: {e}")

        logger.info(f"Detection completed in {time.time() - start_time:.2f}s")
        
        return jsonify({
            'infested_count': detection_counts["infested"],
            'not_infested_count': detection_counts["not_infested"],
            'boxes': boxes,
            'classes': classes,
            'confidences': confidences
        })

    except Exception as e:
        logger.error(f"Unexpected error in /detect endpoint: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500

@app.route('/reset_counts', methods=['POST'])
def reset_counts():
    try:
        with threading.Lock():
            total = detection_counts["infested"] + detection_counts["not_infested"]
            infested_percentage = (detection_counts["infested"] / total) * 100 if total > 0 else 0
            not_infested_percentage = (detection_counts["not_infested"] / total) * 100 if total > 0 else 0

            try:
                conn = get_db_connection()
                conn.execute(
                    "INSERT INTO session_summaries (timestamp, infested_count, not_infested_count) VALUES (?, ?, ?)",
                    (datetime.now().isoformat(), detection_counts["infested"], detection_counts["not_infested"]))
                conn.commit()
            except Exception as e:
                logger.error(f"Database error: {e}")
                return {"error": "Failed to save summary"}, 500
            finally:
                conn.close()

            detection_counts = {"infested": 0, "not_infested": 0}

            return jsonify({
                "message": "Detection counts reset successfully",
                "infested_percentage": infested_percentage,
                "not_infested_percentage": not_infested_percentage
            })
    except Exception as e:
        logger.error(f"Error in reset_counts: {e}")
        return {"error": "Internal server error"}, 500


@app.route('/get_summaries', methods=['GET'])
def get_summaries():
    try:
        conn = get_db_connection()
        summaries = conn.execute("SELECT * FROM session_summaries ORDER BY timestamp DESC").fetchall()
        return jsonify([dict(row) for row in summaries])
    except Exception as e:
        logger.error(f"Error fetching summaries: {e}")
        return {"error": "Failed to fetch summaries"}, 500
    finally:
        conn.close()

@app.route('/get_percentages', methods=['GET'])
def get_percentages():
    try:
        with threading.Lock():
            total = detection_counts["infested"] + detection_counts["not_infested"]
            infested_percentage = (detection_counts["infested"] / total) * 100 if total > 0 else 0
            not_infested_percentage = (detection_counts["not_infested"] / total) * 100 if total > 0 else 0

            return jsonify({
                "infested_percentage": infested_percentage,
                "not_infested_percentage": not_infested_percentage
            })
    except Exception as e:
        logger.error(f"Error in get_percentages: {e}")
        return {"error": "Internal server error"}, 500

@app.route('/delete_summary/<int:id>', methods=['DELETE'])
def delete_summary(id):
    try:
        conn = get_db_connection()
        conn.execute("DELETE FROM session_summaries WHERE id = ?", (id,))
        conn.commit()
        return jsonify({"message": f"Summary with id {id} deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting summary: {e}")
        return {"error": "Failed to delete summary"}, 500
    finally:
        conn.close()

def stream_frames():
    while True:
        try:
            if not frame_buffer.empty():
                frame_data = frame_buffer.get()
                socketio.emit('video_frame', {"image": frame_data})
            time.sleep(0.033)  # ~30fps
        except Exception as e:
            logger.error(f"Error in frame streaming: {e}")
            time.sleep(1)

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
    try:
        # Start frame streaming thread
        threading.Thread(target=stream_frames, daemon=True).start()
        
        logger.info("Starting server on http://0.0.0.0:5000")
        socketio.run(app, 
                    host='0.0.0.0', 
                    port=5000, 
                    debug=False,  # Disable debug in production
                    allow_unsafe_werkzeug=True,
                    use_reloader=False)
    
    except Exception as e:
        logger.error(f"Server error: {e}")

    init_db()
