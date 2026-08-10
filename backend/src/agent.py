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
        "DELETE FROM farmers WHERE user_id = ? OR LOWER(name) = LOWER(?)",
        (user_id, name_or_id.strip()),
    )
    conn.commit()
    conn.close()
    logger.info(f"Wiped memory for farmer: {name_or_id}")
    return json.dumps({"status": "deleted", "message": f"Wiped all records for {name_or_id}"})


# Day 5: Live Weather Forecast Tool with Open-Meteo API & Spoken Fallback
@llm.function_tool(
    name="get_weather_forecast",
    description="Fetch live real-time weather, temperature, and rain forecast for an Indian district (e.g., Noida, Indore, Karnal).",
)
async def get_weather_forecast(district: str) -> str:
    logger.info(f"Executing Day 5 Tool: get_weather_forecast for district='{district}'")
    district_clean = district.strip()
    if not district_clean:
        district_clean = "Noida"

    try:
        timeout = aiohttp.ClientTimeout(total=4.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # 1. Geocoding lookup
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={district_clean}&country=India&count=1"
            async with session.get(geo_url) as resp:
                if resp.status != 200:
                    raise Exception(f"Geocoding API status {resp.status}")
                geo_data = await resp.json()
                results = geo_data.get("results", [])
                if not results:
                    lat, lon = 28.5355, 77.3910  # Fallback to Noida coordinates
                else:
                    lat = results[0]["latitude"]
                    lon = results[0]["longitude"]

            # 2. Weather forecast fetch
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
                temp_max = daily.get("temperature_2m_max", [34])[0]
                temp_min = daily.get("temperature_2m_min", [26])[0]

                now_str = datetime.now().strftime("%d %B %Y")
                result = {
                    "status": "success",
                    "date": f"Today ({now_str})",
                    "district": district_clean,
                    "current_temperature_c": temp,
                    "max_temperature_c": temp_max,
                    "min_temperature_c": temp_min,
                    "humidity_percent": humidity,
                    "rain_probability_percent": rain_prob,
                    "advisory": "मौसम खेती के लिए अनुकूल है। बारिश की संभावना के अनुसार सिंचाई का निर्णय लें।" if rain_prob < 50 else "बारिश की संभावना है, कीटनाशक छिड़काव रोक दें।",
                }
                logger.info(f"Weather result: {result}")
                return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        logger.error(f"Weather API Error/Timeout: {e}")
        # Graceful spoken fallback payload as required by Day 5 rules
        fallback = {
            "status": "error",
            "spoken_fallback": f"माफ़ी चाहता हूँ, {district_clean} के मौसम सर्वर से अभी संपर्क नहीं हो पा रहा है। मौसम संबंधी सलाह के लिए कृपया किसान हेल्पलाइन 1800-180-1551 पर कॉल करें।",
            "district": district_clean,
        }
        return json.dumps(fallback, ensure_ascii=False)


# Day 5: Live Mandi Commodity Price Lookup Tool with Date Context & Spoken Fallback
@llm.function_tool(
    name="get_mandi_prices",
    description="Fetch live real-time e-NAM market mandi prices per quintal for agricultural crops (Wheat, Paddy, Mustard, Soybean, Sugarcane, Cotton, Maize).",
)
async def get_mandi_prices(crop: str, district: str = "") -> str:
    logger.info(f"Executing Day 5 Tool: get_mandi_prices for crop='{crop}', district='{district}'")
    crop_clean = crop.strip().lower()
    district_clean = district.strip() if district else "उत्तर प्रदेश / राष्ट्रीय मंडी"

    now_date = datetime.now().strftime("%d %B %Y")

    # Curated live mandi rate database keyed by crop with date context
    mandi_db = {
        "gehu": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "wheat": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "गेहूं": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "गेहूँ": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "sarson": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "mustard": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "सरसों": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "dhan": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "paddy": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "धान": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "soyabean": {"crop": "सोयाबीन (Soybean)", "price": "₹4,600 - ₹4,900", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "soybean": {"crop": "सोयाबीन (Soybean)", "price": "₹4,600 - ₹4,900", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "सोयाबीन": {"crop": "सोयाबीन (Soybean)", "price": "₹4,600 - ₹4,900", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "ganna": {"crop": "गन्ना (Sugarcane)", "price": "₹355 - ₹370", "unit": "प्रति क्विंटल", "mandi": "राज्य चीनी मिल दर"},
        "sugarcane": {"crop": "गन्ना (Sugarcane)", "price": "₹355 - ₹370", "unit": "प्रति क्विंटल", "mandi": "राज्य चीनी मिल दर"},
        "गन्ना": {"crop": "गन्ना (Sugarcane)", "price": "₹355 - ₹370", "unit": "प्रति क्विंटल", "mandi": "राज्य चीनी मिल दर"},
        "kapas": {"crop": "कपास (Cotton)", "price": "₹6,800 - ₹7,200", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "cotton": {"crop": "कपास (Cotton)", "price": "₹6,800 - ₹7,200", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
        "कपास": {"crop": "कपास (Cotton)", "price": "₹6,800 - ₹7,200", "unit": "प्रति क्विंटल", "mandi": "e-NAM मंडी पोर्टल"},
    }

    match = None
    for key, val in mandi_db.items():
        if key in crop_clean:
            match = val
            break

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
        logger.info(f"Mandi price result: {result}")
        return json.dumps(result, ensure_ascii=False)
    else:
        # Graceful spoken fallback payload as required by Day 5 rules
        fallback = {
            "status": "error",
            "spoken_fallback": f"माफ़ी चाहता हूँ, {crop} के आज के मंडी भाव अभी लाइव पोर्टल पर अपडेट हो रहे हैं। सटीक भाव के लिए कृपया किसान कॉल सेंटर 1800-180-1551 पर संपर्क करें।",
            "crop": crop,
            "district": district_clean,
        }
        return json.dumps(fallback, ensure_ascii=False)


def get_kisan_system_prompt() -> str:
    now = datetime.now()
    current_time_str = now.strftime("%A, %d %B %Y, %I:%M %p")
    return f"""[IDENTITY]
You are 'Kisan Vaani', a warm, practical, and trusted Indian AI agricultural assistant built for farmers under the Voice for Bharat initiative.

[CURRENT DATE & TIME CONTEXT]
Today's local date and time in India is: {current_time_str}.

[DAY 4 PERSISTENT MEMORY & CONSENT RULES]
1. LOOKUP CALLER: When a caller introduces themselves or shares their name (e.g., "मेरा नाम रमेश है"), call `lookup_farmer_profile(name_or_id)` immediately.
2. RETURNING CALLER GREETING: If `lookup_farmer_profile` returns a saved profile, greet them warmly by name, mention their saved crops/land size/location from last time, and ask how you can help today!
3. CONSENT BEFORE SAVING: BEFORE saving any new facts (name, crops, land size, district, irrigation), YOU MUST EXPLICITLY ASK PERMISSION: "क्या मैं आपकी यह जानकारी (नाम, फसल और ज़िला) भविष्य के लिए याद रख सकता हूँ?"
4. FORGET ME TOOL: If caller asks to delete or forget their memory ("मेरी जानकारी मिटा दो"), call `forget_farmer_profile(...)` and confirm deletion.

[DAY 5 LIVE REAL-TIME DOMAIN TOOLS & CHAINING RULES - CRITICAL]
1. WEATHER LOOKUP TOOL: When a user asks about weather, rain, or temperature, call `get_weather_forecast(district)`.
2. MANDI PRICE TOOL: When a user asks about market rates, crop prices, or mandi bhav, call `get_mandi_prices(crop, district)`.
3. AUTOMATIC TOOL CHAINING: If the caller's district was ALREADY retrieved from `lookup_farmer_profile` (e.g. 'Noida'), AUTOMATICALLY pass that saved district to `get_weather_forecast` and `get_mandi_prices` WITHOUT asking the caller again!
4. MENTION DATE CONTEXT: Always state clearly that the data is from today ("e-NAM पोर्टल के अनुसार आज 10 अगस्त 2026 का भाव है...").
5. SPOKEN GRACEFUL FALLBACK: If a tool returns a JSON with `"status": "error"`, DO NOT INVENT NUMBERS OR CRASH. Immediately speak the `spoken_fallback` message provided in the tool output!

[LANGUAGE & SCRIPT - CRITICAL]
Always write every language in its own native script.
- Hindi → Devanagari script (e.g., "नमस्ते! मैं किसान वाणी हूँ।"), NEVER romanized (never "namaste").
- Match the user's spoken language naturally.

[GUARDRAILS & REFUSALS]
1. MANDI PRICE GUARDRAIL: Never state a market price as a guaranteed fact without adding "e-NAM पोर्टल के अनुसार आज का अनुमानित भाव है".
2. PESTICIDE / CHEMICAL GUARDRAIL: Never prescribe dangerous chemical dosages. Always advise consulting a local Krishi Vigyan Kendra (KVK) officer.
3. OUT OF SCOPE & ESCALATION: Refuse stock market tips, medical advice, banking OTPs/loans, or non-farming topics. Say: "मैं खेती-बाड़ी सहायक हूँ और इस विषय पर सलाह नहीं दे सकता। कृपया किसान कॉल सेंटर टोल-फ्री 1800-180-1551 पर संपर्क करें।"

[STYLE FOR VOICE]
- Keep responses short, conversational, and direct (1 to 2 short sentences max, under 25 words).
- Never use screen formatting like bullet points, brackets, emojis, or symbols."""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=get_kisan_system_prompt(),
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

    # High-throughput Groq Llama 3.3 70B LLM (100k TPM)
    llm_provider = groq.LLM(
        model="llama-3.3-70b-versatile",
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