import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")
key = os.getenv("MURF_API_KEY")

# Try fetching falcon voices
for endpoint in [
    "https://global.api.murf.ai/v1/speech/voices?model=falcon",
    "https://global.api.murf.ai/v1/speech/voices?model=falcon2",
    "https://global.api.murf.ai/v1/speech/voices",
]:
    print(f"\n=== Trying: {endpoint} ===")
    r = requests.get(endpoint, headers={"api-key": key})
    print(f"Status: {r.status_code}")
    if r.ok:
        data = r.json()
        voices = data if isinstance(data, list) else data.get("voices", [])
        print(f"Total voices: {len(voices)}")
        for v in voices:
            locale = str(v.get("locale",""))
            if "IN" in locale or "in" in locale.lower() or "india" in locale.lower():
                print(f"  ID: {v.get('voice_id')} | Name: {v.get('display_name')} | Locale: {locale}")
        break
    else:
        print(f"Error: {r.text[:300]}")
