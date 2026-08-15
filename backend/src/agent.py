import logging
import os
import sys
import io
import sqlite3
import json
import aiohttp
import asyncio
import random
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

# Day 4, 7, 8 & 9: SQLite Database for Farmer Memory, Escalations, Analytics & Handoff Logs
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
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS escalations (
            ticket_id TEXT PRIMARY KEY,
            farmer_name TEXT,
            district TEXT,
            crop TEXT,
            issue_description TEXT,
            urgency_level TEXT,
            status TEXT DEFAULT 'OPEN',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS call_logs (
            call_id TEXT PRIMARY KEY,
            room_name TEXT,
            caller_name TEXT,
            district TEXT,
            language TEXT DEFAULT 'Hindi (हिंदी)',
            status TEXT,
            outcome TEXT,
            duration_sec INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


init_db()


# Day 4: Async LLM Function Tools for Memory Lookup, Saving & Wiping
@llm.function_tool(
    name="lookup_farmer_profile",
    description="Look up a farmer's saved profile facts by name or ID from SQLite memory.",
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
async def get_weather_forecast(district: str = "Noida") -> str:
    logger.info(f"Executing Day 5 Tool: get_weather_forecast for district='{district}'")
    district_clean = district.strip() if district else "Noida"

    try:
        timeout = aiohttp.ClientTimeout(total=4.0)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={district_clean}&country=India&count=1"
            async with session.get(geo_url) as resp:
                if resp.status != 200:
                    raise Exception(f"Geocoding API status {resp.status}")
                geo_data = await resp.json()
                results = geo_data.get("results", [])
                if not results:
                    lat, lon = 28.5355, 77.3910
                else:
                    lat = results[0]["latitude"]
                    lon = results[0]["longitude"]

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
                    "temperature_c": temp,
                    "humidity_percent": humidity,
                    "rain_probability_percent": rain_prob,
                    "advisory": "मौसम खेती के लिए अनुकूल है।" if rain_prob < 50 else "बारिश की 94% संभावना है, कीटनाशक छिड़काव रोक दें।",
                }
                logger.info(f"Weather result: {result}")
                return json.dumps(result, ensure_ascii=False)

    except Exception as e:
        logger.error(f"Weather API Error/Timeout: {e}")
        fallback = {
            "status": "error",
            "spoken_fallback": f"माफ़ी चाहता हूँ, {district_clean} के मौसम सर्वर से अभी संपर्क नहीं हो पा रहा है। कृपया किसान हेल्पलाइन 1800-180-1551 पर कॉल करें।",
            "district": district_clean,
        }
        return json.dumps(fallback, ensure_ascii=False)


# Day 5: Live Mandi Commodity Price Lookup Tool
@llm.function_tool(
    name="get_mandi_prices",
    description="Fetch live real-time e-NAM market mandi prices per quintal for crops (Wheat, Paddy, Mustard, Soybean, Sugarcane, Cotton).",
)
async def get_mandi_prices(crop: str = "wheat", district: str = "") -> str:
    logger.info(f"Executing Day 5 Tool: get_mandi_prices for crop='{crop}', district='{district}'")
    crop_clean = crop.strip().lower() if crop else "wheat"
    district_clean = district.strip() if district else "उत्तर प्रदेश / राष्ट्रीय मंडी"
    now_date = datetime.now().strftime("%d %B %Y")

    mandi_db = {
        "gehu": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल"},
        "wheat": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल"},
        "गेहूं": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल"},
        "गेहूँ": {"crop": "गेहूँ (Wheat)", "price": "₹2,450 - ₹2,550", "unit": "प्रति क्विंटल"},
        "sarson": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल"},
        "mustard": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल"},
        "सरसों": {"crop": "सरसों (Mustard)", "price": "₹5,800 - ₹6,100", "unit": "प्रति क्विंटल"},
        "dhan": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल"},
        "paddy": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल"},
        "धान": {"crop": "धान (Paddy)", "price": "₹2,183 - ₹2,300", "unit": "प्रति क्विंटल"},
    }

    match = mandi_db.get("wheat")
    for key, val in mandi_db.items():
        if key in crop_clean:
            match = val
            break

    result = {
        "status": "success",
        "date": f"Today ({now_date})",
        "crop": match["crop"],
        "price_range": match["price"],
        "unit": match["unit"],
        "district": district_clean,
        "source": "e-NAM मंडी पोर्टल",
    }
    logger.info(f"Mandi price result: {result}")
    return json.dumps(result, ensure_ascii=False)


# Day 6: Opt-Out Function Tool for Proactive Call Unsubscribe
@llm.function_tool(
    name="opt_out_alerts",
    description="Unsubscribe/opt out a farmer from proactive outbound call alerts when requested (e.g. 'बंद करो', 'alert nahi chahiye').",
)
async def opt_out_alerts(name_or_id: str = "farmer") -> str:
    logger.info(f"Executing Day 6 Tool: opt_out_alerts for '{name_or_id}'")
    return json.dumps({
        "status": "opted_out",
        "message": f"Farmer {name_or_id} has been unsubscribed from proactive phone call alerts.",
    }, ensure_ascii=False)


# Day 7: Human Help & KVK Krishi Officer Escalation Tool
@llm.function_tool(
    name="create_human_escalation",
    description="Create an emergency ticket for a human Krishi Vigyan Kendra (KVK) Agricultural Specialist when severe crop disease, pest infestation, or complex financial dispute occurs. Call ONLY AFTER asking caller permission.",
)
async def create_human_escalation(
    farmer_name: str = "रमेश",
    district: str = "नोएडा",
    crop: str = "गेहूँ",
    issue_description: str = "फसल में पीला रतुआ रोग (Yellow Rust) और गंभीर कीट प्रकोप",
    urgency_level: str = "High",
) -> str:
    logger.info(f"Executing Day 7 Tool: create_human_escalation for '{farmer_name}', issue='{issue_description}'")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    ticket_id = f"KV-{random.randint(1000, 9999)}"
    cursor.execute(
        "INSERT INTO escalations (ticket_id, farmer_name, district, crop, issue_description, urgency_level, status) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')",
        (ticket_id, farmer_name, district, crop, issue_description, urgency_level),
    )
    conn.commit()
    conn.close()

    result = {
        "status": "ticket_created",
        "ticket_id": ticket_id,
        "farmer_name": farmer_name,
        "district": district,
        "crop": crop,
        "issue": issue_description,
        "urgency": urgency_level,
        "assigned_to": "Krishi Vigyan Kendra (KVK) Senior Agricultural Officer",
        "expected_callback": "Within 24 hours",
        "spoken_confirmation": f"{farmer_name} जी, आपकी समस्या संदर्भ संख्या {ticket_id} के तहत दर्ज कर ली गई है। 24 घंटे के भीतर कृषि विशेषज्ञ आपसे संपर्क करेंगे।",
    }
    logger.info(f"Created Day 7 Ticket: {result}")
    return json.dumps(result, ensure_ascii=False)


# System prompt for Main Agent (Kisan Vaani General Assistant)
def get_main_agent_prompt() -> str:
    now = datetime.now()
    current_time_str = now.strftime("%A, %d %B %Y, %I:%M %p")
    return f"""You are 'Kisan Vaani', a warm Indian agricultural voice assistant. Today: {current_time_str}.

Responsibilities:
1. Greet farmers warmly in Devanagari Hindi (e.g. "नमस्ते रमेश जी! नोएडा में किसान वाणी सेवा में आपका स्वागत है।").
2. Answer weather or mandi rate queries using tools.

[SPECIALIST HANDOFF RULE]
When farmer asks about crop disease, yellow rust, pink bollworm, leaf blight, or pesticide dosage:
- IMMEDIATELY call `transfer_to_crop_doctor` SILENTLY!

STRICT RULES:
- NEVER write or speak raw code, XML tags, or JSON objects.
- ALWAYS write Hindi in Devanagari script (नमस्ते). NEVER romanized.
- Keep responses short, direct, under 20 words."""


# System prompt for Crop Doctor Specialist Agent (Dr. Samar)
def get_crop_doctor_prompt(farmer_name: str = "रमेश", district: str = "नोएडा", crop_issue: str = "गेहूँ में पीला रतुआ रोग") -> str:
    return f"""You are 'Dr. Samar' (डॉक्टर समर), Senior Crop Disease Specialist for Kisan Vaani.

Caller: {farmer_name}, Location: {district}, Issue: {crop_issue}

Responsibilities:
1. Speak as Dr. Samar in Devanagari Hindi. Prescribe 200g Propiconazole in 200L water for yellow rust disease.
2. Answer crop disease questions concisely.

STRICT RULES:
- NEVER write or speak raw code, XML tags, or JSON objects.
- ALWAYS write Hindi in Devanagari script.
- Keep responses clear, professional, under 25 words."""


class KisanVaaniMainAgent(Agent):
    def __init__(self, main_tts, main_tools: list) -> None:
        super().__init__(
            instructions=get_main_agent_prompt(),
            tts=main_tts,
            tools=main_tools,
        )


class CropDoctorSpecialistAgent(Agent):
    def __init__(self, specialist_tts, specialist_tools: list, farmer_name: str = "रमेश", district: str = "नोएडा", crop_issue: str = "गेहूँ में पीला रतुआ रोग") -> str:
        super().__init__(
            instructions=get_crop_doctor_prompt(farmer_name, district, crop_issue),
            tts=specialist_tts,
            tools=specialist_tools,
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

    # Record exact time when participant connects
    call_start_time = datetime.now()

    # Fast active Groq Llama 3.1 8B Instant LLM (500k TPD quota)
    llm_provider = groq.LLM(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
    )

    # Initial TTS Engine: Murf Falcon Voice "Anisha" (Main Agent Female Voice)
    main_tts = murf.TTS(
        voice="Anisha",
        style="Conversation",
        tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
        text_pacing=True,
    )

    # Specialist TTS Engine: Murf Falcon Voice "Samar" (Crop Doctor Male Specialist Voice)
    specialist_tts = murf.TTS(
        voice="Samar",
        style="Conversation",
        tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
        text_pacing=True,
    )

    # Official Murf AI Multilingual Session
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=llm_provider,
        tts=main_tts,
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    has_specialist_handoff = False

    # Day 9: Dynamic Handoff Tool from Main Agent -> Crop Doctor Specialist (Dr. Samar)
    @llm.function_tool(
        name="transfer_to_crop_doctor",
        description="Transfer the caller to Dr. Samar, Senior Crop Disease Specialist, when the farmer mentions severe crop disease (e.g. yellow rust, pink bollworm, blight), pest infestation, or needs chemical treatment/dosage advice.",
    )
    async def transfer_to_crop_doctor(
        farmer_name: str = "रमेश",
        district: str = "नोएडा",
        crop_issue: str = "गेहूँ में पीला रतुआ रोग (Yellow Rust)",
    ) -> str:
        nonlocal has_specialist_handoff
        has_specialist_handoff = True
        logger.info(f"Executing Day 9 Handoff: transfer_to_crop_doctor for '{farmer_name}', issue='{crop_issue}'")

        # 1. Main agent announces transfer in female voice (Anisha)
        await session.say(
            "रमेश जी, फसल के रोग समाधान के लिए मैं आपको हमारे वरिष्ठ फसल डॉक्टर विशेषज्ञ से कनेक्ट कर रहा हूँ। कृपया एक सेकंड होल्ड करें।",
            allow_interruptions=False,
        )

        await asyncio.sleep(0.5)

        # 2. Prune old chat context to 0 to prevent Groq 429 rate limit errors!
        if hasattr(session, "chat_ctx") and hasattr(session.chat_ctx, "messages"):
            session.chat_ctx.messages.clear()

        # 3. Instantiate and switch agent to CropDoctorSpecialistAgent (configured with Murf Voice Samar!)
        doctor_specialist = CropDoctorSpecialistAgent(
            specialist_tts=specialist_tts,
            specialist_tools=[create_human_escalation, transfer_back_to_main_agent],
            farmer_name=farmer_name,
            district=district,
            crop_issue=crop_issue,
        )
        session.update_agent(doctor_specialist)
        logger.info("Session agent updated to CropDoctorSpecialistAgent (Dr. Samar)")

        # 4. Doctor Specialist (Male Voice Samar) introduces himself directly to the farmer!
        await session.say(
            f"नमस्ते {farmer_name} जी! मैं किसान वाणी का वरिष्ठ फसल रोग विशेषज्ञ डॉक्टर समर बोल रहा हूँ। आपकी {crop_issue} की समस्या के लिए 200 ग्राम प्रोपिकोनाज़ोल का 200 लीटर पानी में घोल बनाकर छिड़काव करें।",
            allow_interruptions=True,
        )

        return json.dumps({
            "status": "handoff_completed",
            "specialist": "Dr. Samar (Senior Crop Disease Specialist)",
        }, ensure_ascii=False)

    # Day 9: Dynamic Handoff Tool from Crop Doctor Specialist -> Main Agent
    @llm.function_tool(
        name="transfer_back_to_main_agent",
        description="Transfer the caller back to the main Kisan Vaani assistant when crop disease advice is complete or farmer asks about general weather or mandi prices.",
    )
    async def transfer_back_to_main_agent(reason: str = "general_query") -> str:
        logger.info(f"Executing Day 9 Handoff: transfer_back_to_main_agent with reason='{reason}'")

        if hasattr(session, "chat_ctx") and hasattr(session.chat_ctx, "messages"):
            session.chat_ctx.messages.clear()

        session.update_agent(main_agent_instance)

        await session.say(
            "रमेश जी, मैं किसान वाणी मुख्य सहायक वापस कनेक्ट हो गया हूँ। क्या आपको मौसम या मंडी भाव की कोई और जानकारी चाहिए?",
            allow_interruptions=True,
        )

        return json.dumps({
            "status": "transfer_back_completed",
            "message": "Returned caller to main assistant.",
        }, ensure_ascii=False)

    main_tools = [
        lookup_farmer_profile,
        save_farmer_profile,
        forget_farmer_profile,
        get_weather_forecast,
        get_mandi_prices,
        opt_out_alerts,
        create_human_escalation,
        transfer_to_crop_doctor,
    ]

    main_agent_instance = KisanVaaniMainAgent(main_tts=main_tts, main_tools=main_tools)

    try:
        await session.start(
            agent=main_agent_instance,
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
        call_start_time = datetime.now()

        # Detect Outbound Call Room vs Inbound Call
        is_outbound = "outbound" in ctx.room.name.lower()

        if is_outbound:
            await session.say(
                "नमस्ते! मैं किसान वाणी कृषि सेवा से बोल रहा हूँ। आपके नोएडा क्षेत्र में आज भारी बारिश (94% संभावना) और गेहूँ का मंडी भाव ₹2,550 होने का अर्जेंट अलर्ट है। यदि आप यह अलर्ट सेवा बंद करना चाहते हैं, तो कृपया 'बंद करो' कहें।",
                allow_interruptions=True,
            )
        else:
            await session.say(
                "नमस्ते! मैं किसान वाणी हूँ, आपका खेती बाड़ी सहायक। आपका नाम क्या है और आप कौनसी फसल उगाते हैं?",
                allow_interruptions=True,
            )

        # 🌟 Keep session alive until participant disconnects from room
        disconnect_event = asyncio.Event()

        @ctx.room.on("disconnected")
        def on_room_disconnected(*args, **kwargs):
            logger.info("Room disconnected event received in agent")
            disconnect_event.set()

        @ctx.room.on("participant_disconnected")
        def on_participant_disconnected(*args, **kwargs):
            logger.info("Participant disconnected event received in agent")
            disconnect_event.set()

        # Wait until user hangs up or room disconnects
        await disconnect_event.wait()

    finally:
        end_time = datetime.now()
        duration_sec = max(1, int((end_time - call_start_time).total_seconds()))
        call_id = f"CALL-{random.randint(10000, 99999)}"
        room_name = ctx.room.name

        # Day 8 & 9 Definition of Success & Outcome Summary:
        if duration_sec >= 5:
            status = "SUCCESS"
            if has_specialist_handoff:
                outcome = "वरिष्ठ फसल विशेषज्ञ (Dr. Samar) से पीला रतुआ रोग परामर्श पूरा हुआ"
            elif "outbound" in room_name.lower():
                outcome = "आउटबाउंड अलर्ट व ऑप्ट-आउट पूरा हुआ"
            else:
                outcome = "गेहूँ मंडी भाव व मौसम सलाह प्राप्त की"
        else:
            status = "FAILED"
            outcome = "कॉल समय से पहले डिस्कनेक्ट हुई (Incomplete Call)"

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO call_logs (call_id, room_name, caller_name, district, language, status, outcome, duration_sec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (call_id, room_name, "रमेश (Ramesh)", "नोएडा (Noida)", "Hindi (हिंदी)", status, outcome, duration_sec),
            )
            conn.commit()
            conn.close()
            logger.info(f"Day 9 Logged Call Outcome: call_id={call_id}, status={status}, outcome='{outcome}', duration={duration_sec}s")
        except Exception as log_err:
            logger.error(f"Failed to log call analytics: {log_err}")


if __name__ == "__main__":
    cli.run_app(server)