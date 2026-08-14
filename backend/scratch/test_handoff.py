import asyncio
import os
import livekit.agents as agents
from livekit.plugins import groq, murf, deepgram

print("Testing LiveKit Agents handoff imports...")
assert hasattr(agents, "Agent")
assert hasattr(agents.AgentSession, "update_agent")
print("Handoff API verified successfully!")
