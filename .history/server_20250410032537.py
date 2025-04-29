from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from ultralytics import YOLO
import cv2
import numpy as np
import time
import base64
import sqlite3
from datetime import datetime
from multiprocessing import Pool, Manager, Process, cpu_count
from functools import partial
import torch

# Initialize multiprocessing components
manager = Manager()
frame_buffer = manager.Queue(maxsize=10)  # Shared frame buffer
detection_counts = manager.dict({"infested": 0, "not_infested": 0})
db_queue = manager.Queue()  # Database write queue

# Initialize Flask and SocketIO
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

def init_worker():
    """Initialize worker process with YOLO model"""
    global worker_model
    worker_model = YOLO("best.pt")
    if torch.cuda.is_available():
        worker_model.to('cuda')
    worker_model.classes = ["infested corn plant", "not infested corn plant"]

# Process pool configuration
NUM_WORKERS = 8  # Using 8 of 10 cores for processing
process_pool = Pool(processes=NUM_WORKERS, initializer=init_worker)

def process_frame(img_bytes):
    """Process frame in parallel worker"""
    try:
        # Decode image
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        
        # Run inference
        results = worker_model.predict(
            img,
            imgsz=320,
            conf=0.5,
            device='cuda' if torch.cuda.is_available() else 'cpu',
            half=True if torch.cuda.is_available() else False,
            workers=2,
            verbose=False
        )

        # Annotate image
        annotated_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 70])
        base64_img = base64.b64encode(buffer).decode('utf-8')

        # Update shared state
        with detection_counts.lock():
            current_counts = {"infested": 0, "not_infested": 0}
            for box in results[0].boxes:
                class_name = worker_model.names[int(box.cls)]
                if "infested" in class_name:
                    current_counts["infested"] += 1
                else:
                    current_counts["not_infested"] += 1
                
                # Batch database writes
                db_queue.put((
                    datetime.now().isoformat(),
                    class_name,
                    float(box.conf)
                ))

            # Update counts atomically
            detection_counts["infested"] += current_counts["infested"]
            detection_counts["not_infested"] += current_counts["not_infested"]

        # Add to frame buffer
        if frame_buffer.qsize() < 10:
            frame_buffer.put({
                "image": base64_img,
                "counts": dict(detection_counts)
            })

    except Exception as e:
        print(f"Processing error: {str(e)}")

@app.route('/detect', methods=['POST'])
def detect_faw():
    """Endpoint for receiving images"""
    try:
        img_bytes = request.data
        process_pool.apply_async(process_frame, (img_bytes,))
        return jsonify({"status": "processing"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reset_counts', methods=['POST'])
def reset_counts():
    """Reset detection counters"""
    with detection_counts.lock():
        detection_counts["infested"] = 0
        detection_counts["not_infested"] = 0
    return jsonify({"message": "Counts reset"})

def db_writer():
    """Dedicated database writer process"""
    conn = sqlite3.connect('detections.db', check_same_thread=False)
    c = conn.cursor()
    batch = []
    
    while True:
        try:
            while not db_queue.empty():
                batch.append(db_queue.get())
                if len(batch) >= 50:
                    c.executemany('''
                        INSERT INTO detections (timestamp, class, confidence)
                        VALUES (?, ?, ?)
                    ''', batch)
                    conn.commit()
                    batch = []
            
            time.sleep(1)
            if batch:
                c.executemany('''
                    INSERT INTO detections (timestamp, class, confidence)
                    VALUES (?, ?, ?)
                ''', batch)
                conn.commit()
                batch = []
                
        except Exception as e:
            print(f"Database error: {str(e)}")

def stream_frames():
    """WebSocket frame streaming"""
    while True:
        try:
            if not frame_buffer.empty():
                data = frame_buffer.get()
                socketio.emit('update', data)
        except Exception as e:
            print(f"Streaming error: {str(e)}")
        time.sleep(0.033)  # ~30 FPS

if __name__ == '__main__':
    # Start background processes
    db_process = Process(target=db_writer, daemon=True)
    stream_process = Process(target=stream_frames, daemon=True)
    
    db_process.start()
    stream_process.start()

    # Start Flask-SocketIO
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)