import asyncio
import os
import sys
import json
import logging
from dotenv import load_dotenv
from livekit import api

load_dotenv(".env.local")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound_call")


async def make_outbound_call(
    farmer_name: str = "Ramesh",
    district: str = "Noida",
    crop: str = "Wheat",
    phone_number: str = "+919876543210",
):
    livekit_url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not all([livekit_url, api_key, api_secret]):
        logger.error("Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET in .env.local")
        return

    lk_api = api.LiveKitAPI(livekit_url, api_key, api_secret)

    room_name = f"outbound_room_{os.urandom(4).hex()}"
    logger.info(f"Creating Outbound Alert Room: {room_name} for Farmer '{farmer_name}' ({district})")

    metadata = json.dumps({
        "call_type": "outbound",
        "user_name": farmer_name,
        "district": district,
        "crop": crop,
        "phone_number": phone_number,
    }, ensure_ascii=False)

    # 1. Create Room with Outbound Metadata
    room = await lk_api.room.create_room(
        api.CreateRoomRequest(
            name=room_name,
            metadata=metadata,
            empty_timeout=300,
        )
    )
    logger.info(f"Room Created Successfully: {room.name}")

    # 2. Dispatch Agent to Outbound Room
    dispatch = await lk_api.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            room=room_name,
            agent_name="",
            metadata=metadata,
        )
    )
    logger.info(f"Outbound Agent Dispatched: Dispatch ID={dispatch.id}")
    await lk_api.aclose()
    print(f"\n✅ Outbound Call Dispatched Successfully!")
    print(f"📌 Room: {room_name}")
    print(f"🌾 Farmer: {farmer_name} | District: {district} | Crop: {crop}\n")


if __name__ == "__main__":
    farmer = sys.argv[1] if len(sys.argv) > 1 else "Ramesh"
    dist = sys.argv[2] if len(sys.argv) > 2 else "Noida"
    asyncio.run(make_outbound_call(farmer_name=farmer, district=dist))
