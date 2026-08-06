# 🌾 Kisan Vaani — Multilingual AI Agricultural Voice Assistant

> Built for **10 Days of AI Voice Agents | Voice for Bharat Edition** (Farm & Field Track) by Murf AI & LiveKit.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Murf Falcon](https://img.shields.io/badge/TTS-Murf%20Falcon-6366F1)](https://murf.ai/api/docs/text-to-speech/streaming) [![LiveKit](https://img.shields.io/badge/Transport-LiveKit-002cf2)](https://docs.livekit.io) [![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.1-f55036)](https://groq.com/) [![Deepgram](https://img.shields.io/badge/STT-Deepgram-13ef95)](https://deepgram.com)

**Kisan Vaani** is an ultra-fast, real-time voice AI assistant designed to empower farmers across Bharat with instant, hands-free access to crop advice, weather updates, and local mandi prices in their native language.

---

## 🌟 Features

- **⚡ Sub-100ms Latency**: Streaming audio responses powered by Murf Falcon low-latency TTS.
- **🌐 Dynamic Language Switching**: Seamlessly switch between Hindi, Hinglish, English, Tamil, and other regional Indian languages during a live call.
- **🌾 Agricultural Intelligence**: Real-time advice for crops, soil care, weather updates, and mandi grain prices.
- **🎙️ Voice-First Dashboard**: Minimalist, dark-mode visualizer interface designed for distraction-free audio interaction.

---

## 🏗 Architecture

```mermaid
flowchart LR
    A[🎙️ Farmer Speaks] -->|Audio Stream| B[Deepgram Nova-2 STT]
    B -->|Hindi/English Text| C[Groq Llama 3.1 8B]
    C -->|Response Text| D[Murf Falcon TTS hi-IN-karan]
    D -->|Low-Latency Audio| E[LiveKit Agents WebRTC]
    E -->|Real-time Stream| F[🔊 Farmer Hears]

    style A fill:#444441,stroke:#888780,color:#fff
    style B fill:#185FA5,stroke:#85B7EB,color:#fff
    style C fill:#F55036,stroke:#FF8870,color:#fff
    style D fill:#0F6E56,stroke:#5DCAA5,color:#fff
    style E fill:#D85A30,stroke:#F0997B,color:#fff
    style F fill:#444441,stroke:#888780,color:#fff
```

---

## 🛠️ Technology Stack

- **TTS Engine**: [Murf Falcon](https://murf.ai/) (`hi-IN-karan` / `en-IN-nikhil` / `hi-IN-khyati`)
- **Speech-to-Text**: [Deepgram Nova-2](https://deepgram.com/) (`hi` / `en`)
- **LLM**: [Groq](https://groq.com/) (`llama-3.1-8b-instant`)
- **Transport**: [LiveKit Agents](https://docs.livekit.io/agents)
- **Frontend**: Next.js 15, Tailwind CSS, Lucide / Phosphor Icons

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

Open `http://localhost:3000` or `http://localhost:3001` in your browser and click **START TALKING**!

---

## 📜 License

Distributed under the MIT License. Built for the Murf AI Voice for Bharat Challenge.
