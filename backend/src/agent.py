import logging
import os
import sys
import io
import sqlite3
import json
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
)
from livekit.plugins import murf, silero, deepgram, groq, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

# Day 4: SQLite Database for Persistent Farmer Memory
DB_PATH = os.path.join(os.path.dirname(__file__), "kisan_memory.db")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmers (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            district TEXT,
            crops_grown TEXT,
            land_size TEXT,
            irrigation_type TEXT,
            last_topic TEXT,
            consent_given INTEGER DEFAULT 0,
            last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_db()


# Day 4: LLM Function Tools for Memory Lookup & Saving
class KisanMemoryTools(llm.FunctionContext):
    def __init__(self):
        super().__init__()

    @llm.ai_callable(
        description="Look up a farmer's saved profile facts by name or ID from SQLite memory."
    )
    def lookup_farmer_profile(self, name_or_id: str) -> str:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        search = f"%{name_or_id.strip()}%"
        cursor.execute(
            "SELECT user_id, name, district, crops_grown, land_size, irrigation_type, last_topic, consent_given FROM farmers WHERE LOWER(name) LIKE LOWER(?) OR user_id = ?",
            (search, name_or_id.strip().lower().replace(" ", "_")),
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            profile = {
                "found": True,
                "user_id": row[0],
                "name": row[1],
                "district": row[2],
                "crops_grown": row[3],
                "land_size": row[4],
                "irrigation_type": row[5],
                "last_topic": row[6],
                "consent_given": bool(row[7]),
            }
            logger.info(f"Loaded memory for farmer: {profile}")
            return json.dumps(profile, ensure_ascii=False)
        return json.dumps({"found": False, "message": "No caller profile found."})

    @llm.ai_callable(
        description="Save or update a farmer's profile facts in SQLite memory ONLY AFTER asking and receiving explicit caller consent."
    )
    def save_farmer_profile(
        self,
        name: str,
        district: str = "",
        crops_grown: str = "",
        land_size: str = "",
        irrigation_type: str = "",
        last_topic: str = "",
    ) -> str:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        user_id = name.strip().lower().replace(" ", "_")
        cursor.execute(
            """
            INSERT INTO farmers (user_id, name, district, crops_grown, land_size, irrigation_type, last_topic, consent_given, last_interaction)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                district=CASE WHEN EXCLUDED.district != '' THEN EXCLUDED.district ELSE district END,
                crops_grown=CASE WHEN EXCLUDED.crops_grown != '' THEN EXCLUDED.crops_grown ELSE crops_grown END,
                land_size=CASE WHEN EXCLUDED.land_size != '' THEN EXCLUDED.land_size ELSE land_size END,
                irrigation_type=CASE WHEN EXCLUDED.irrigation_type != '' THEN EXCLUDED.irrigation_type ELSE irrigation_type END,
                last_topic=CASE WHEN EXCLUDED.last_topic != '' THEN EXCLUDED.last_topic ELSE last_topic END,
                consent_given=1,
                last_interaction=CURRENT_TIMESTAMP
        """,
            (user_id, name, district, crops_grown, land_size, irrigation_type, last_topic),
        )
        conn.commit()
        conn.close()
        logger.info(f"Saved memory for farmer: {name}")
        return json.dumps({"status": "success", "message": f"Saved profile for {name}"})

    @llm.ai_callable(
        description="Wipe/forget a farmer's saved profile from SQLite memory when requested by the caller."
    )
    def forget_farmer_profile(self, name_or_id: str) -> str:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        user_id = name_or_id.strip().lower().replace(" ", "_")
        cursor.execute(
            "DELETE FROM farmers WHERE user_id = ? OR LOWER(name) = LOWER(?)",
            (user_id, name_or_id.strip()),
        )
        conn.commit()
        conn.close()
        logger.info(f"Wiped memory for farmer: {name_or_id}")
        return json.dumps({"status": "deleted", "message": f"Wiped all records for {name_or_id}"})


def get_kisan_system_prompt() -> str:
    now = datetime.now()
    current_time_str = now.strftime("%A, %d %B %Y, %I:%M %p")
    return f"""[IDENTITY]
You are 'Kisan Vaani', a warm, practical, and trusted Indian AI agricultural assistant built for farmers under the Voice for Bharat initiative.

[CURRENT DATE & TIME CONTEXT]
Today's local date and time in India is: {current_time_str}.

[DAY 4 PERSISTENT MEMORY & CONSENT RULES]
1. LOOKUP CALLER: When a caller introduces themselves or shares their name (e.g., "मेरा नाम रमेश है"), call `lookup_farmer_profile(name_or_id)` immediately.
2. RETURNING CALLER GREETING: If `lookup_farmer_profile` returns a saved profile, greet them warmly by name, mention their saved crops/land size/location from last time, and ask how you can help today! Example: "नमस्ते रमेश जी! किसान वाणी में स्वागत है। पिछली बार हमने आपके 5 एकड़ खेत और ट्यूबवेल सिंचाई के बारे में बात की थी। आज क्या सहायता चाहिए?"
3. CONSENT BEFORE SAVING: BEFORE saving any new facts (name, crops, land size, district, irrigation), YOU MUST EXPLICITLY ASK PERMISSION: "क्या मैं आपकी यह जानकारी भविष्य के लिए याद रख सकता हूँ?"
   - If caller says YES ➔ Call `save_farmer_profile(...)`.
   - If caller says NO ➔ DO NOT call `save_farmer_profile`. Politely respect their decision.
4. FORGET ME TOOL: If caller asks to delete or forget their memory ("मेरी जानकारी मिटा दो"), call `forget_farmer_profile(...)` and confirm deletion.

[OBJECTIVES]
1. Help farmers with practical crop guidance, soil health, and weather advisories.
2. Provide estimated mandi market prices clearly indicating they are current estimates as of today.

[LANGUAGE & SCRIPT - CRITICAL]
Always write every language in its own native script.
- Hindi → Devanagari script (e.g., "नमस्ते! मैं किसान वाणी हूँ।"), NEVER romanized (never "namaste").
- Match the user's spoken language naturally.

[GUARDRAILS & REFUSALS]
1. MANDI PRICE GUARDRAIL: Never state a market price as a guaranteed fact without adding "e-NAM के अनुसार आज का अनुमानित भाव है".
2. PESTICIDE / CHEMICAL GUARDRAIL: Never prescribe dangerous chemical dosages. Always advise consulting a local Krishi Vigyan Kendra (KVK) officer.
3. OUT OF SCOPE & ESCALATION: Refuse stock market tips, medical advice, banking OTPs/loans, or non-farming topics. Say: "मैं खेती-बाड़ी सहायक हूँ और इस विषय पर सलाह नहीं दे सकता। कृपया किसान कॉल सेंटर टोल-फ्री 1800-180-1551 पर संपर्क करें।"

[STYLE FOR VOICE]
- Keep responses short, conversational, and direct (1 to 2 short sentences max, under 25 words).
- Never use screen formatting like bullet points, brackets, emojis, or symbols."""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=get_kisan_system_prompt(),
            fnc_ctx=KisanMemoryTools(),
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

    # Official Murf AI Multilingual Session
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

    await ctx.connect()

    # Initial Devanagari greeting
    await session.say(
        "नमस्ते! मैं किसान वाणी हूँ, आपका खेती बाड़ी सहायक। आपका नाम क्या है और आप कौनसी फसल उगाते हैं?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(server)