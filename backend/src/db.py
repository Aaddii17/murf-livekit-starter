import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "kisan_memory.db")

def init_db():
    """Initialize SQLite database for storing farmer memories."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmer_profiles (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            district TEXT,
            crops_grown TEXT,
            land_size TEXT,
            irrigation_type TEXT,
            language_preference TEXT DEFAULT 'Hindi',
            last_topic TEXT,
            consent_given INTEGER DEFAULT 1,
            last_interaction TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_farmer(user_id: str = "default_farmer"):
    """Retrieve farmer profile from SQLite DB."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM farmer_profiles WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_farmer(
    user_id: str = "default_farmer",
    name: str = "",
    district: str = "",
    crops_grown: str = "",
    land_size: str = "",
    irrigation_type: str = "",
    language_preference: str = "Hindi",
    last_topic: str = "",
    consent_given: int = 1
):
    """Save or update farmer profile in SQLite DB after obtaining consent."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO farmer_profiles (
            user_id, name, district, crops_grown, land_size, irrigation_type, language_preference, last_topic, consent_given, last_interaction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            name = coalesce(nullif(EXCLUDED.name, ''), name),
            district = coalesce(nullif(EXCLUDED.district, ''), district),
            crops_grown = coalesce(nullif(EXCLUDED.crops_grown, ''), crops_grown),
            land_size = coalesce(nullif(EXCLUDED.land_size, ''), land_size),
            irrigation_type = coalesce(nullif(EXCLUDED.irrigation_type, ''), irrigation_type),
            language_preference = coalesce(nullif(EXCLUDED.language_preference, ''), language_preference),
            last_topic = coalesce(nullif(EXCLUDED.last_topic, ''), last_topic),
            consent_given = EXCLUDED.consent_given,
            last_interaction = EXCLUDED.last_interaction
    """, (user_id, name, district, crops_grown, land_size, irrigation_type, language_preference, last_topic, consent_given, now_str))
    conn.commit()
    conn.close()
    return True

def delete_farmer(user_id: str = "default_farmer"):
    """Wipe farmer profile from SQLite DB if farmer requests to be forgotten."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM farmer_profiles WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True
