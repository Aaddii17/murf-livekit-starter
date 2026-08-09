import logging
import io
import sys
import os
from datetime import datetime
from dotenv import load_dotenv
from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    WorkerOptions,
    AutoSubscribe,
    cli,
    llm,
    tokenize,
)
from livekit.plugins import deepgram, google, murf, silero
from livekit.plugins.turn_detector import MultilingualModel

import db

# Force UTF-8 encoding for stdout/stderr to prevent Windows console cp1252 Devanagari crash
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

load_dotenv(dotenv_path=".env.local")
logger = logging.getLogger("kisan-vaani")
logger.setLevel(logging.INFO)

# Initialize SQLite database schema
db.init_db()

# Define LiveKit LLM Tools for Kisan Vaani SQLite Memory Persistence (Day 4 Requirement)
@llm.ai_callable(description="Look up stored farmer profile and facts from SQLite memory database.")
def lookup_farmer_profile(user_id: str = "default_farmer") -> str:
    profile = db.get_farmer(user_id)
    if profile and profile.get("name"):
        return (
            f"FOUND FARMER RECORD in SQLite:\n"
            f"Name: {profile.get('name')}\n"
            f"District: {profile.get('district')}\n"
            f"Crops: {profile.get('crops_grown')}\n"
            f"Land Size: {profile.get('land_size')}\n"
            f"Irrigation: {profile.get('irrigation_type')}\n"
            f"Last Topic: {profile.get('last_topic')}\n"
            f"Last Interaction: {profile.get('last_interaction')}"
        )
    return "NO PRIOR RECORD FOUND in SQLite memory. This is a new caller."

@llm.ai_callable(
    description="Save or update farmer details into SQLite database. ALWAYS ASK EXPLICIT CONSENT BEFORE CALLING THIS FUNCTION!"
)
def save_farmer_profile(
    name: str,
    district: str = "",
    crops_grown: str = "",
    land_size: str = "",
    irrigation_type: str = "",
    last_topic: str = "",
    user_id: str = "default_farmer"
) -> str:
    db.save_farmer(
        user_id=user_id,
        name=name,
        district=district,
        crops_grown=crops_grown,
        land_size=land_size,
        irrigation_type=irrigation_type,
        last_topic=last_topic,
        consent_given=1
    )
    return f"SUCCESS: Saved farmer profile for {name} to SQLite memory database."

@llm.ai_callable(description="Forget caller data and wipe farmer record from SQLite database if requested by farmer.")
def forget_farmer_profile(user_id: str = "default_farmer") -> str:
    db.delete_farmer(user_id)
    return "SUCCESS: Caller profile completely erased from SQLite memory database."


def get_kisan_system_prompt(existing_profile: dict = None) -> str:
    now_str = datetime.now().strftime("%A, %d %B %Y, %I:%M %p")
    
    profile_context = ""
    if existing_profile and existing_profile.get("name"):
        profile_context = (
            f"\n\nRETURNING CALLER MEMORY DETECTED (SQLite DB):\n"
            f"- Farmer Name: {existing_profile.get('name')}\n"
            f"- District: {existing_profile.get('district', 'N/A')}\n"
            f"- Crops Grown: {existing_profile.get('crops_grown', 'N/A')}\n"
            f"- Land Size: {existing_profile.get('land_size', 'N/A')}\n"
            f"- Irrigation Type: {existing_profile.get('irrigation_type', 'N/A')}\n"
            f"- Last Spoken Topic: {existing_profile.get('last_topic', 'N/A')}\n"
            f"INSTRUCTION FOR RETURNING CALLER: Greet them warmly by name in Hindi (e.g. 'नमस्ते {existing_profile.get('name')} जी!'), welcome them back, and mention their crops/last topic!"
        )

    return f"""You are Kisan Vaani (किसान वाणी), an expert, empathetic, and friendly AI Agricultural Voice Companion built for Indian farmers as part of the Voice for Bharat initiative.

CURRENT DATE & TIME: {now_str}{profile_context}

YOUR CORE DUTIES & DAY 4 MEMORY RULES:
1. GREETING & IDENTIFICATION:
   - For new callers (no memory): Warmly greet, introduce yourself as Kisan Vaani, and ask their name, district, and crop details.
   - For returning callers: Welcome them back by name, mention their crop/district from memory, and ask how you can help today.

2. EXPLICIT CONSENT BEFORE SAVING (DAY 4 MANDATORY RULE):
   - BEFORE saving any farmer information, ALWAYS ask for explicit permission in Hindi!
   - Ask: "क्या मैं आपकी यह जानकारी (नाम, फसल और क्षेत्र) भविष्य के लिए याद रख सकता हूँ?"
   - IF the farmer says YES -> Call `save_farmer_profile` tool with their details.
   - IF the farmer says NO -> DO NOT call `save_farmer_profile`. Respect their privacy completely!

3. FORGET ME TOOL (DAY 4 ADVANCED RULE):
   - IF the farmer asks "Meri jankari bhool jao" or "Delete my data", call `forget_farmer_profile` tool and confirm to them that their record has been wiped.

4. SCOPE & DOMAIN:
   - Provide advisory on Wheat (गेहूँ), Paddy (धान), Cotton, Mandi Rates (e-NAM), Weather, Pest Control, Fertilizers, and Government Schemes (PM-Kisan).
   - If asked non-agricultural questions (e.g. train tickets, movies), politely decline: "मैं केवल कृषि संबंधी विषयों में आपकी सहायता कर सकता हूँ।"

5. LANGUAGE & SCRIPT (MANDATORY):
   - ALWAYS write Hindi in Devanagari script (e.g., नमस्ते, गेहूँ, मंडी), NEVER in English/Romanized Hindi (never "namaste").
   - Speak in clear, warm, concise 1 to 2 sentences so responses remain fast and natural.
"""


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Day 4: Check SQLite DB for existing farmer profile
    farmer_profile = db.get_farmer("default_farmer")
    if farmer_profile and farmer_profile.get("name"):
        logger.info(f"Loaded existing farmer profile for: {farmer_profile['name']}")
    else:
        logger.info("No prior farmer profile found in SQLite DB.")

    system_prompt = get_kisan_system_prompt(farmer_profile)

    # Initial Greeting
    if farmer_profile and farmer_profile.get("name"):
        greeting_text = f"नमस्ते {farmer_profile['name']} जी! किसान वाणी में आपका पुनः स्वागत है। पिछली बार हमने आपके {farmer_profile.get('crops_grown', 'फ़सल')} के बारे में बात की थी। आज मैं आपकी क्या सहायता कर सकता हूँ?"
    else:
        greeting_text = "नमस्ते! मैं किसान वाणी हूँ, आपका खेती-बाड़ी सहायक। आपका शुभ नाम क्या है और आप कौन सी फ़सल उगाते हैं?"

    # Configure Day 4 Multilocale Speech Pipeline Agent Session
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=google.LLM(model="gemini-2.5-flash"),
        tts=murf.TTS(
            voice="Anisha",
            style="Conversation",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
        tools=[lookup_farmer_profile, save_farmer_profile, forget_farmer_profile],
        preemptive_generation=True,
    )

    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=system_prompt,
            greeting=greeting_text,
        ),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))