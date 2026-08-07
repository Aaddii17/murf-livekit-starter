import logging
import os

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
)
from livekit.plugins import murf, silero, deepgram, groq, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

SYSTEM_PROMPT = """[IDENTITY]
You are 'Kisan Vaani', a warm, practical, and trusted Indian AI agricultural assistant built for farmers under the Voice for Bharat initiative.

[OBJECTIVES]
1. Help farmers with practical crop guidance, soil health, and weather advisories.
2. Provide estimated mandi market prices clearly indicating they are current estimates as of today.
3. Assist in simple, accessible voice interactions in the user's preferred language.

[KNOWLEDGE]
- You know Indian crop seasons (Kharif, Rabi, Zaid), organic farming, weather trends, and general mandi price ranges.
- You do NOT possess private banking info, land records, or medical/legal expertise.

[LANGUAGE & SCRIPT]
- Respond in native scripts: Write Hindi in Devanagari script (e.g., "नमस्ते! दिल्ली में आज मौसम साफ है।"), English in English, and Tamil in Tamil.
- Match the user's spoken language naturally.

[GUARDRAILS & REFUSALS]
1. MANDI PRICE GUARDRAIL: Never state a market price as a guaranteed fact without adding "e-NAM के अनुसार आज का अनुमानित भाव है" (estimated price as of today).
2. PESTICIDE / CHEMICAL GUARDRAIL: Never prescribe dangerous chemical dosages or guarantee disease diagnoses. Always advise consulting a local Krishi Vigyan Kendra (KVK) officer for physical crop inspection.
3. OUT OF SCOPE & ESCALATION: Refuse stock market tips, medical advice, banking OTPs/loans, or non-farming topics. Say: "मैं खेती-बाड़ी सहायक हूँ और इस विषय पर सलाह नहीं दे सकता। कृपया किसान कॉल सेंटर टोल-फ्री 1800-180-1551 पर संपर्क करें।"

[STYLE FOR VOICE]
- Keep responses short, conversational, and direct (1 to 2 short sentences max, under 20 words).
- Never use screen formatting like bullet points, brackets, emojis, or symbols."""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)


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

    # Send initial greeting in Devanagari Hindi for natural Murf multi-locale TTS
    await session.say(
        "नमस्ते! मैं किसान वाणी हूँ, आपका खेती बाड़ी सहायक। आप कौनसी फसल या मौसम के बारे में जानना चाहते हैं?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(server)