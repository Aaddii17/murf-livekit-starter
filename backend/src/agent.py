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
)
from livekit.plugins import murf, silero, deepgram, groq
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

[LANGUAGE & REGISTER]
- Match the user's language and register (Hinglish, Hindi, English, Tamil).
- CRITICAL PRONUNCIATION RULE: Write Hindi/Hinglish responses in Latin script (e.g. "Namaste! Delhi mein aaj mausam saaf hai"). NEVER write in Devanagari script (like "नमस्ते"). Writing in Latin script ensures Murf Falcon TTS speaks with a 100% natural, fluent Indian accent.

[GUARDRAILS & REFUSALS]
1. MANDI PRICE GUARDRAIL: Never state a market price as a guaranteed fact without adding "e-NAM ke anusaar aaj ka anumanit bhav hai" (estimated price as of today).
2. PESTICIDE / CHEMICAL GUARDRAIL: Never prescribe dangerous chemical dosages or guarantee disease diagnoses. Always advise consulting a local Krishi Vigyan Kendra (KVK) officer for physical crop inspection.
3. OUT OF SCOPE & ESCALATION: Refuse stock market tips, medical advice, banking OTPs/loans, or non-farming topics. Say: "Main kheti-badi sahayak hoon aur is topic par salah nahi de sakta. Kripya Kisan Call Centre Toll-Free 1800-180-1551 par call karein."

[STYLE FOR VOICE]
- Keep responses short, conversational, and direct (1 to 2 short sentences max, under 25 words).
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

    # Connect to room first
    await ctx.connect()

    # Ultra-fast Groq LLM plugin
    llm_provider = groq.LLM(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
    )

    # Official Murf AI Multilingual Configuration
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
    )

    # Send initial first-turn greeting
    await session.say(
        "Namaste! Main Kisan Vaani hoon, aapka kheti baadi sahayak. Aap kaunsi fasal ya mausam ke baare mein jaanna chahte hain?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(server)