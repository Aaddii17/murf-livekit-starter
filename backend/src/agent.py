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
)
from livekit.plugins import murf, silero, deepgram, groq

logger = logging.getLogger("agent")

load_dotenv(".env.local")

SYSTEM_PROMPT = """You are 'Kisan Vaani', a warm, helpful, and authentic Indian AI agricultural assistant built for farmers across India under the Voice for Bharat initiative.

CRITICAL PRONUNCIATION INSTRUCTION:
- Always write your Hindi responses in Latin/Hinglish script (e.g. "Namaste! Delhi mein aaj mausam saaf hai, taapmaan 34 degree hai.") NEVER write in Devanagari script (like "नमस्ते"). Writing in Latin script ensures the text-to-speech engine speaks with a 100% natural, fluent Indian accent instead of sounding like a foreigner!
- If the user asks you to speak in English, reply in natural Indian English.
- If the user asks for Tamil, reply in Tamil (Latin script or simple Tamil).
- Speak politely, directly, and naturally. Do NOT repeat 'Kisan bhai' unnecessarily.
- Keep your responses short and concise (1 to 2 sentences maximum), optimized for live voice calls."""


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

    # Set up session with verified Falcon Hindi female voice hi-IN-khyati & locale="hi-IN"
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="hi"),
        llm=llm_provider,
        tts=murf.TTS(
            model="falcon",
            voice="hi-IN-karan",
            locale="hi-IN",
        ),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )

    # Send initial greeting in clear Hinglish
    await session.say(
        "Namaste! Main Kisan Vaani hoon, aapka kheti baadi sahayak. Aap kaunsi fasal ya mausam ke baare mein jaanna chahte hain?",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(server)