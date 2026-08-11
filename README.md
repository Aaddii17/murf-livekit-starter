# 🌾 Kisan Vaani — Multilingual AI Agricultural Voice Assistant

> Built for **10 Days of AI Voice Agents | Voice for Bharat Edition** (Farm & Field Track) by Murf AI & LiveKit.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Murf Falcon](https://img.shields.io/badge/TTS-Murf%20Falcon-6366F1)](https://murf.ai/api/docs/text-to-speech/streaming) [![LiveKit](https://img.shields.io/badge/Transport-LiveKit-002cf2)](https://docs.livekit.io) [![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3-f55036)](https://groq.com/) [![Deepgram](https://img.shields.io/badge/STT-Deepgram-13ef95)](https://deepgram.com)

**Kisan Vaani** is an ultra-fast, real-time voice AI assistant designed to empower farmers across Bharat with instant, hands-free access to crop advice, weather updates, and local mandi prices in their native language.

---

## 🌟 Day 4, Day 5 & Day 6 Capabilities

- **📞 Day 6 Proactive Outbound Call Alerts**: Initiates outbound calls to farmers with mandatory 3-part opening (Who + Why + How to Opt-out) for urgent weather warnings & mandi price spikes.
- **🛡️ Day 6 Opt-Out Tool (`opt_out_alerts`)**: Unsubscribes callers cleanly when they request "बंद करो" or "alert stop".
- **🌤️ Day 5 Live Weather Tool (`get_weather_forecast`)**: Fetches **live real-time weather data** from Open-Meteo REST API (temperature, rain probability, humidity, advisories) for any Indian district.
- **🌾 Day 5 Live Mandi Prices Tool (`get_mandi_prices`)**: Fetches **real-time e-NAM market rates** per quintal for crops (Wheat, Paddy, Mustard, Soybean, Sugarcane, Cotton) with today's date context.
- **🔗 Tool Chaining**: Automatically chains Day 4 SQLite memory with Day 5 live tools (e.g. uses saved district `Noida` to query weather and mandi rates without asking the farmer again).
- **🗄️ Day 4 Persistent SQLite Memory**: Remembers farmer profiles across calls (name, district, crops grown, land size) with explicit caller consent.
- **🛡️ Spoken Graceful Fallback**: If an external API times out or fails, Kisan Vaani speaks a polite Indian helpline advisory out loud (*"माफ़ी चाहता हूँ, मौसम सर्वर से अभी संपर्क नहीं हो पा रहा है..."*).
- **⚡ Sub-100ms Latency**: Streaming audio responses powered by Murf Falcon low-latency TTS (`Anisha`).
- **💬 Real-Time Live Transcript UI**: Displays live Hindi Devanagari speech bubbles on the visual farm cover dashboard.

---

## 🏗 Architecture

```mermaid
flowchart LR
    A[🎙️ Outbound Alert / Inbound Call] -->|Audio Stream| B[Deepgram Nova-3 STT]
    B -->|Hindi/English Text| C[Groq Llama 3.3 70B]
    C -->|Memory Tool| D1[SQLite kisan_memory.db]
    C -->|Weather Tool| D2[Open-Meteo Live Weather API]
    C -->|Mandi Tool| D3[e-NAM Mandi Price Tool]
    C -->|Opt-Out Tool| D4[Alert Unsubscribe Engine]
    D1 & D2 & D3 & D4 -->|Tool Results| C
    C -->|Native Hindi Text| E[Murf Falcon TTS Anisha]
    E -->|Low-Latency Audio| F[LiveKit Agents WebRTC]
    F -->|Real-time Stream| G[🔊 Farmer Hears Alert]
```

---

## 🛠️ Technology Stack

- **TTS Engine**: [Murf Falcon](https://murf.ai/) (`Anisha` Conversation style)
- **Speech-to-Text**: [Deepgram Nova-3](https://deepgram.com/) Multilingual (`multi`)
- **LLM**: [Groq](https://groq.com/) (`llama-3.3-70b-versatile`)
- **Transport**: [LiveKit Agents](https://docs.livekit.io/agents)
- **Live Data APIs**: Open-Meteo Geocoding & Weather REST API, e-NAM Mandi Price Engine
- **Memory & Alerts**: SQLite (`kisan_memory.db`), Outbound Alert Dispatcher
- **Frontend**: Next.js 15, Turbopack, Tailwind CSS, LiveKit Components

---

## 🚀 Quickstart Guide

### 1. Prerequisites

- **Python 3.10+** & **`uv`** package manager
- **Node.js 18+** & **npm** / **pnpm**
- Active API keys for **LiveKit Cloud**, **Murf AI**, **Deepgram**, and **Groq**

### 2. Environment Setup

Create `.env.local` in `backend/` and `frontend/`:

```env
LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
MURF_API_KEY=your_murf_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Start Backend Agent

```bash
cd backend
uv run python src/agent.py dev
```

### 4. Start Frontend UI

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser and click **📞 Trigger Outbound Call Alert**!

---

## 📜 License

Distributed under the MIT License. Built for the Murf AI Voice for Bharat Challenge.
