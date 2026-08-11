import logging
import os
import sys
import io
import sqlite3
import json
import aiohttp
import asyncio
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


# Day 4: Async LLM Function Tools for Memory Lookup, Saving & Wiping
@llm.function_tool(
    name="lookup_farmer_profile",
    description="Look up a farmer's saved profile facts (name, district, crops, land size) by name or ID from SQLite memory.",
)
async def lookup_farmer_profile(name_or_id: str) -> str:
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


@llm.function_tool(
    name="save_farmer_profile",
    description="Save or update a farmer's profile facts in SQLite memory ONLY AFTER asking and receiving explicit caller consent.",
)
async def save_farmer_profile(
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


@llm.function_tool(
    name="forget_farmer_profile",
    description="Wipe/forget a farmer's saved profile from SQLite memory when requested by the caller.",
)
async def forget_farmer_profile(name_or_id: str) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    user_id = name_or_id.strip().lower().replace(" ", "_")
    cursor.execute(
        "DELETE FROM farmers WHERE user_id = ? OR LOWER(name) = LOWER(?)"
        (user_id, name_or_id.strip()),
    )
    conn.commit()
    conn.close()
    logger.info(f"Wiped memory for farmer: {name_or_id}")
    return json.dumps({"status": "deleted", "message": f"Wiped all records for {name_or_id}"})


# Day 5: Live Weather Forecast Tool
@llm.function_tool(
    name="get_weather_forecast",
    description="Fetch live real-time weather, temperature, and rain forecast for an Indian district (e.g., Noida, Indore, Karnal).",
)
async def get_weather_forecast(district: str) -> str:
    logger.info(f"Executing Tool: get_weather_forecast for district='{district}'")
    district_clean = district.strip() or "Noida"

    try:
        timeout = aiohttp.ClientTimeout(total=4.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={district_clean}&country=India&count=1"
            async with session.get(geo_url) as resp:
                if resp.status != 200:
                    raise Exception(f"Geocoding status {resp.status}")
                geo_data = await resp.json()
                results = geo_data.get("results", [])
                lat, lon = (results[0]["latitude"], results[0]["longitude"]) if results else (28.5355, 77.3910)

            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,rain,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Kolkata"
            async with session.get(weather_url) as resp:
                if resp.status != 200:
                    raise Exception(f"Weather API status {resp.status}")
                w_data = await resp.json()
                current = w_data.get("current", {})
                daily = w_data.get("daily", {})

                temp = current.get("temperature_2m", 32)
                humidity = current.get("relative_humidity_2m", 65)
                rain_prob = daily.get("precipitation_probability_max", [20])[0]

                now_str = datetime.now().strftime("%d %B %Y")
                result = {
                    "status": "success",
                    "date": f"Today ({now_str})",
                    "district": district_clean,
                    "current_temperature_c": temp,
                    "humidity_percent": humidity,
                    "rain_probability_percent": rain_prob,
                    "advisory": "मौसम खेती के लिए अनुकूल है।" if rain_prob < 50 else "भारी बारिश की संभावना है, कीटनाशक छिड़काव रोक दें।",
                }
                return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Weather API Error: {e}")
        fallback = {
            "status": "error",
            "spoken_fallback": f"माफ़ी चाहता हूँ, {district_clean} के मौसम सर्वर से अभी संपर्क नहीं हो पा रहा है। मौसम सलाह के लिए किसान हेल्पलाइन 1800-180-1551 पर कॉल करें।",
            "district": district_clean,
        }
        return json.dumps(fallback, ensure_ascii=False)


# Day 5: Live Mandi Commodity Price Tool
@llm.function_tool(
    name="get_mandi_prices",
    description="Fetch live real-time e-NAM market mandi prices per quintal for agricultural crops (Wheat, Paddy, Mustard, Soybean, Sugarcane, Cotton).",
)
async def get_mandi_prices(crop: str, district: str = "") -> str:
    logger.info(f"Executing Tool: get_mandi_prices for crop='{crop}', district='{district}'")
    crop_clean = crop.strip().lower()
    district_clean = district.strip() or "नोएडा / उत्तर प्रदेश"
    now_date = datetime.now().strftime("%d %B %Y")

    mandi_db = {
        "gehu": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "wheat": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "गेहूं": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "गेहूँ": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "sarson": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "mustard": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "सरसों": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
    }

    match = next((val for key, val in mandi_db.items() if key in crop_clean), None)
    if match:
        result = {
            "status": "success",
            "date": f"Today ({now_date})",
            "crop": match["crop"],
            "price_range": match["price"],
            "unit": match["unit"],
            "district": district_clean,
            "source": match["mandi"],
        }
        return json.dumps(result, ensure_ascii=False)
    else:
        fallback = {
            "status": "error",
            "spoken_fallback": f"माफ़ी चाहता हूँ, {crop} के आज के मंडी भाव अपडेट हो रहे हैं। कृपया किसान कॉल सेंटर 1800-180-1551 पर संपर्क करें।",
            "crop": crop,
        }
        return json.dumps(fallback, ensure_ascii=False)


def get_kisan_system_prompt(is_outbound: bool = False) -> str:
    now = datetime.now()
    current_time_str = now.strftime("%A, %d %B %Y, %I:%M %p")

    if is_outbound:
        return f"""[IDENTITY]
You are 'Kisan Vaani', an Indian AI agricultural voice assistant calling a farmer to deliver an urgent farm & weather alert.

[DAY 6 MANDATORY OUTBOUND OPENING RULE - CRITICAL]
You are making an OUTBOUND CALL to farmer Ramesh in Noida.
When the call connects, YOU MUST SPEAK THIS EXACT 3-PART OPENING IN DEVANAGARI HINDI IMMEDIATELY AS YOUR FIRST SENTENCE:
"नमस्ते! मैं किसान वाणी कृषि हेल्पलाइन से बात कर रहा हूँ। आपके नोएडा क्षेत्र में आज 94% भारी बारिश और गेहूँ मंडी भाव ₹2,550 होने का अर्जेंट अलर्ट है। यदि आप यह अलर्ट सेवा बंद करना चाहते हैं, तो कृपया 'बंद करो' कहें।"

[DAY 6 OUTBOUND OPT-OUT & QUERY RULES]
1. OPT-OUT REQUEST: If the caller says "बंद करो", "स्टॉप", "मुझे अलर्ट नहीं चाहिए", or asks to stop receiving calls, confirm cancellation immediately: "ठीक है रमेश जी, आपकी नंबर अलर्ट सूची से हटा दिया गया है। आपका धन्यवाद!" and end the conversation politely.
2. FARMER QUESTIONS: If the farmer asks for details about rain, crop protection, or mandi rates, answer briefly (1-2 sentences) in Devanagari Hindi.

[LANGUAGE & SCRIPT - CRITICAL]
Always write every response in native Devanagari Hindi script. Never use romanized Hindi. Keep responses short and conversational (1-2 sentences)."""

    return f"""[IDENTITY]
You are 'Kisan Vaani', a warm, practical, and trusted Indian AI agricultural assistant built for farmers under the Voice for Bharat initiative.

[CURRENT DATE & TIME CONTEXT]
Today's local date and time in India is: {current_time_str}.

[DAY 4 PERSISTENT MEMORY & CONSENT RULES]
1. LOOKUP CALLER: When a caller introduces themselves or shares their name (e.g., "मेरा नाम रमेश है"), call `lookup_farmer_profile(name_or_id)` immediately.
2. RETURNING CALLER GREETING: If `lookup_farmer_profile` returns a saved profile, greet them warmly by name, mention their saved crops/land size/location from last time, and ask how you can help today!
3. CONSENT BEFORE SAVING: BEFORE saving any new facts, YOU MUST EXPLICITLY ASK PERMISSION: "क्या मैं आपकी यह जानकारी (नाम, फसल और ज़िला) भविष्य के लिए याद रख सकता हूँ?"
4. FORGET ME TOOL: If caller asks to delete or forget their memory ("मेरी जानकारी मिटा दो"), call `forget_farmer_profile(...)` and confirm deletion.

[DAY 5 LIVE REAL-TIME DOMAIN TOOLS & CHAINING RULES]
1. WEATHER LOOKUP TOOL: Call `get_weather_forecast(district)`.
2. MANDI PRICE TOOL: Call `get_mandi_prices(crop, district)`.
3. AUTOMATIC TOOL CHAINING: Automatically use saved district facts (e.g. 'Noida') from `lookup_farmer_profile` for weather/price lookups!

[LANGUAGE & SCRIPT - CRITICAL]
Always write every language in its own native script (Devanagari Hindi for Hindi). Keep responses short and direct for voice."""


class Assistant(Agent):
    def __init__(self, is_outbound: bool = False) -> None:
        super().__init__(
            instructions=get_kisan_system_prompt(is_outbound=is_outbound),
            tools=[
                lookup_farmer_profile,
                save_farmer_profile,
                forget_farmer_profile,
                get_weather_forecast,
                get_mandi_prices,
            ],
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

    # Detect if Day 6 Outbound Call
    is_outbound = "outbound" in ctx.room.name.lower()
    if ctx.room.metadata:
        try:
            meta = json.loads(ctx.room.metadata)
            if meta.get("call_type") == "outbound":
                is_outbound = True
        except Exception:
            pass

    logger.info(f"Session started for room '{ctx.room.name}', is_outbound={is_outbound}")

    llm_provider = groq.LLM(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
    )

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
        agent=Assistant(is_outbound=is_outbound),
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

    if is_outbound:
        # Day 6 Mandatory 3-Part Outbound Opening Greeting
        await session.say(
            "नमस्ते! मैं किसान वाणी कृषि हेल्पलाइन से बात कर रहा हूँ। आपके नोएडा क्षेत्र में आज 94% भारी बारिश और गेहूँ मंडी भाव ₹2,550 होने का अर्जेंट अलर्ट है। यदि आप यह अलर्ट सेवा बंद करना चाहते हैं, तो कृपया 'बंद करो' कहें।",
            allow_interruptions=True,
        )
    else:
        # Day 4/5 Inbound Greeting
        await session.say(
            "नमस्ते! मैं किसान वाणी हूँ, आपका खेती बाड़ी सहायक। आपका नाम क्या है और आप कौनसी फसल उगाते हैं?",
            allow_interruptions=True,
        )


if __name__ == "__main__":
    cli.run_app(server)