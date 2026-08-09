import logging
import os
import sys
import io
import sqlite3
from datetime import datetime

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    tokenize,
    room_io,
    llm,
    function_tool,
)
from livekit.plugins import murf, silero, deepgram, groq, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# =====================================================================
# STEP 1: SQLITE PERSISTENT DATABASE SYSTEM (kisan_memory.db)
# =====================================================================
DB_PATH = "kisan_memory.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmers (
            farmer_id TEXT PRIMARY KEY,
            name TEXT,
            district TEXT,
            crops_grown TEXT,
            land_size TEXT,
            irrigation_type TEXT,
            last_topic TEXT,
            last_interaction TEXT
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Kisan Vaani SQLite memory database initialized.")


init_db()


def db_lookup_farmer(search_term: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT farmer_id, name, district, crops_grown, land_size, irrigation_type, last_topic, last_interaction FROM farmers WHERE LOWER(name) LIKE ? OR farmer_id = ?",
        (f"%{search_term.lower()}%", search_term),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "farmer_id": row[0],
            "name": row[1],
            "district": row[2],
            "crops_grown": row[3],
            "land_size": row[4],
            "irrigation_type": row[5],
            "last_topic": row[6],
            "last_interaction": row[7],
        }
    return None


def db_save_farmer(name: str, district: str = "", crops_grown: str = "", land_size: str = "", irrigation_type: str = "", last_topic: str = "") -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    farmer_id = f"FARMER_{name.upper().replace(' ', '_')}"
    timestamp = datetime.now().strftime("%d %B %Y, %I:%M %p")
    cursor.execute(
        """
        INSERT INTO farmers (farmer_id, name, district, crops_grown, land_size, irrigation_type, last_topic, last_interaction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(farmer_id) DO UPDATE SET
            district=excluded.district,
            crops_grown=excluded.crops_grown,
            land_size=excluded.land_size,
            irrigation_type=excluded.irrigation_type,
            last_topic=excluded.last_topic,
            last_interaction=excluded.last_interaction
    """,
        (farmer_id, name, district, crops_grown, land_size, irrigation_type, last_topic, timestamp),
    )
    conn.commit()
    conn.close()
    logger.info(f"Saved farmer memory record for: {name}")
    return True


def db_forget_farmer(name_or_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM farmers WHERE LOWER(name) LIKE ? OR farmer_id = ?",
        (f"%{name_or_id.lower()}%", name_or_id),
    )
    count = cursor.rowcount
    conn.commit()
    conn.close()
    logger.info(f"Wiped farmer memory record for: {name_or_id} (rows deleted: {count})")
    return count > 0


# =====================================================================
# SYSTEM PROMPT WITH DAY 4 MEMORY & CONSENT RULES
# =====================================================================
def get_kisan_system_prompt() -> str:
    now = datetime.now()
    current_time_str = now.strftime("%A, %d %B %Y, %I:%M %p")
    return f"""[IDENTITY]
You are 'Kisan Vaani', a warm, practical, and trusted Indian AI agricultural assistant built for farmers under the Voice for Bharat initiative.

[CURRENT DATE & TIME CONTEXT]
Today's local date and time in India is: {current_time_str}.

[DAY 4 MEMORY & CONSENT RULES]
1. LOOKUP CALLER: When a caller tells you their name (e.g. Ramesh), call 'lookup_farmer' to check if you remember them.
2. RETURNING CALLER GREETING: If 'lookup_farmer' finds a record (e.g., Ramesh from Noida growing wheat on 5 acres), welcome them back warmly by name in Devanagari Hindi! Reference their saved facts (e.g. "नमस्ते रमेश जी! किसान वाणी में आपका पुनः स्वागत है। पिछली बार हमने आपके 5 एकड़ गेहूँ के खेत के बारे में बात की थी।")
3. CONSENT BEFORE SAVING (MANDATORY RULE): When a caller shares facts (Name, District, Crops, Land Size, Irrigation), ALWAYS ASK FOR PERMISSION BEFORE SAVING!
   Example: "क्या मैं आपकी यह जानकारी (नाम, फसल और सिंचाई) भविष्य के लिए याद रख सकता हूँ?"
   - If caller says YES ➔ Call 'save_farmer_profile' function immediately!
   - If caller says NO ➔ Do NOT save any data!
4. FORGET ME TOOL: If caller asks to be forgotten ("forget me" or "मेरी जानकारी डिलीट कर दो"), call 'forget_farmer' and confirm that their memory has been deleted.

[OBJECTIVES]
1. Help farmers with practical crop guidance, soil health, and weather advisories.
2. Provide estimated mandi market prices clearly indicating they are current estimates as of today.

[LANGUAGE & SCRIPT]
- ALWAYS write Hindi in Devanagari script (e.g., "नमस्ते! मैं किसान वाणी हूँ।"), never romanized (never write "namaste").
- Same rule for all non-English languages.

[GUARDRAILS & REFUSALS]
1. MANDI PRICE GUARDRAIL: Add "e-NAM के अनुसार आज का अनुमानित भाव है".
2. OUT OF SCOPE: Say "मैं खेती-बाड़ी सहायक हूँ और इस विषय पर सलाह नहीं दे सकता। कृपया किसान कॉल सेंटर टोल-फ्री 1800-180-1551 पर संपर्क करें।"

[STYLE FOR VOICE]
- Keep responses short, conversational, and direct (1 to 2 short sentences max).
- Never use screen formatting like bullet points, brackets, emojis, or symbols."""


# =====================================================================
# STEP 3: FUNCTION CALLING TOOLS FOR KISAN VAANI MEMORY
# =====================================================================
@function_tool(description="Look up existing farmer profile from database by name or ID")
def lookup_farmer(farmer_name: str) -> str:
    record = db_lookup_farmer(farmer_name)
    if record:
        return f"FOUND RECORD: Name={record['name']}, District={record['district']}, Crops={record['crops_grown']}, LandSize={record['land_size']}, Irrigation={record['irrigation_type']}, LastTopic={record['last_topic']}, LastInteraction={record['last_interaction']}"
    return f"NO RECORD FOUND for farmer name: {farmer_name}. This is a new caller."


@function_tool(description="Save farmer profile facts to database ONLY AFTER farmer gives explicit consent")
def save_farmer_profile(
    name: str,
    district: str = "Unknown",
    crops_grown: str = "Unknown",
    land_size: str = "Unknown",
    irrigation_type: str = "Unknown",
    last_topic: str = "General farming guidance",
) -> str:
    success = db_save_farmer(name, district, crops_grown, land_size, irrigation_type, last_topic)
    if success:
        return f"Successfully saved memory for {name} ({district}, Crops: {crops_grown}, Land: {land_size}, Irrigation: {irrigation_type})."
    return "Failed to save profile."


@function_tool(description="Wipe farmer profile from database if caller asks to be forgotten ('forget me' or 'मेरी जानकारी हटा दो')")
def forget_farmer(farmer_name: str) -> str:
    wiped = db_forget_farmer(farmer_name)
    if wiped:
        return f"Memory for {farmer_name} has been completely wiped from database."
    return f"No memory record found for {farmer_name} to delete."


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=get_kisan_system_prompt(),
            tools=[lookup_farmer, save_farmer_profile, forget_farmer],
        )


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session()
async def my_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Ultra-fast Groq LLM plugin
    llm_provider = groq.LLM(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
    )

    # Official Murf AI Multilingual Configuration from starter repo
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=llm_provider,
        tts=murf.TTS(
            voice="Anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    # Connect to room
    await ctx.connect()

    # Initial greeting
    await session.say(
        "नमस्ते! मैं किसान वाणी हूँ, आपका खेती बाड़ी सहायक। आपका क्या नाम है और आप कौनसी फसल उगा रहे हैं?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(server)