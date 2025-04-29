import sqlite3

# Connect to SQLite database (or create it if it doesn't exist)
conn = sqlite3.connect('corn_plants.db')
cursor = conn.cursor()

# Create a table to store corn plant data
cursor.execute('''
CREATE TABLE IF NOT EXISTS corn_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_name TEXT,
    gps_lat REAL,
    gps_lon REAL,
    status TEXT,
    confidence REAL
)
''')

print("Database and table initialized successfully.")

# Commit changes and close the connection
conn.commit()
conn.close()