'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  useSessionContext,
  useVoiceAssistant,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Mic,
  PhoneOff,
  AlertCircle,
  Clock,
  Calendar,
  Phone,
  Sun,
  Cloud,
} from 'lucide-react';

interface KisanLightDashboardProps {
  onStartCall: () => void;
}

export function KisanLightDashboard({ onStartCall }: KisanLightDashboardProps) {
  const session = useSessionContext();
  const { isConnected, disconnect } = session;
  const { state: agentState } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();

  // Microphone track for user speaking state
  const micPublication = localParticipant?.getTrackPublication(Track.Source.Microphone);
  const isUserSpeaking = micPublication?.isMuted === false && localParticipant?.isSpeaking;

  // Real-time Date and Time State
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [callEndedState, setCallEndedState] = useState<boolean>(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync call ended state
  useEffect(() => {
    if (isConnected) {
      setCallEndedState(false);
    }
  }, [isConnected]);

  // Handle Start Call with Mic Permission Check
  const handleStartCall = async () => {
    setMicError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      onStartCall();
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      setMicError(
        'Microphone access was denied. Please allow microphone access in your browser address bar settings to talk with Kisan Vaani.'
      );
    }
  };

  const handleEndCall = () => {
    disconnect();
    setCallEndedState(true);
  };

  // Determine current Agent State (1: Ready, 2: Connecting, 3: Listening, 4: Speaking, 5: Call Ended)
  let currentStateName = 'Ready';
  let currentStateDesc = 'Kisan Vaani Ready • Click below to start call';

  if (callEndedState && !isConnected) {
    currentStateName = 'Call Ended';
    currentStateDesc = 'Conversation over • Click to start a new call';
  } else if (!isConnected && session.isConnecting) {
    currentStateName = 'Connecting';
    currentStateDesc = 'Connecting to Kisan Vaani... Please wait';
  } else if (isConnected) {
    if (agentState === 'speaking') {
      currentStateName = 'Speaking';
      currentStateDesc = 'Kisan Vaani is speaking... (किसान वाणी बोल रहे हैं)';
    } else if (agentState === 'listening' || isUserSpeaking) {
      currentStateName = 'Listening';
      currentStateDesc = 'Listening to you... (आपकी बात सुन रहे हैं)';
    } else {
      currentStateName = 'Connected';
      currentStateDesc = 'Active Call • Ask your farming query';
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-sky-300 via-sky-100 via-amber-50/70 to-emerald-100 font-sans text-slate-900 selection:bg-emerald-200">
      
      {/* ☀️ BRIGHT SUNNY DAYLIGHT SKY & BIRDS BACKGROUND LAYER */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        
        {/* Radiant Golden Sun in Upper Center-Right */}
        <div className="absolute top-8 right-24 flex items-center justify-center md:right-48">
          <div className="absolute size-36 animate-ping rounded-full bg-amber-300/30 opacity-75" />
          <div className="absolute size-28 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-100 shadow-[0_0_60px_rgba(251,191,36,0.8)]" />
          <Sun className="relative size-16 text-amber-500 animate-spin-slow" />
        </div>

        {/* Soft Fluffy Clouds */}
        <div className="absolute top-12 left-16 opacity-80">
          <Cloud className="size-20 text-white/90 drop-shadow-md" />
        </div>
        <div className="absolute top-20 right-80 opacity-70">
          <Cloud className="size-16 text-white/80 drop-shadow-sm" />
        </div>

        {/* 🕊️ 5-6 ANIMATED FLYING BIRDS IN LOOP */}
        <div className="absolute top-12 left-0 w-full z-10">
          <svg className="h-16 w-full" viewBox="0 0 1200 120" fill="none">
            <g className="animate-bird-fly-1">
              <path
                d="M 0 30 Q 15 15 30 30 Q 45 15 60 30"
                stroke="#1e293b"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 70 45 Q 82 32 95 45 Q 108 32 120 45"
                stroke="#334155"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
            <g className="animate-bird-fly-2">
              <path
                d="M 0 60 Q 12 48 25 60 Q 38 48 50 60"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 65 25 Q 75 15 85 25 Q 95 15 105 25"
                stroke="#334155"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
            <g className="animate-bird-fly-3">
              <path
                d="M 0 40 Q 18 22 35 40 Q 52 22 70 40"
                stroke="#1e293b"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </svg>
        </div>

        {/* 🌾 LUSH GREEN COUNTRYSIDE FIELDS, TRACTOR & TUBEWELL */}
        <div className="absolute right-0 bottom-0 left-0 h-80 overflow-hidden">
          {/* Back Hills */}
          <svg
            className="absolute bottom-0 w-full text-emerald-400/50"
            viewBox="0 0 1440 240"
            fill="currentColor"
          >
            <path d="M0,160L120,144C240,128,480,96,720,112C960,128,1200,192,1320,224L1440,256L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z" />
          </svg>

          {/* Front Golden Wheat Fields */}
          <svg
            className="absolute -bottom-4 w-full text-amber-500/30"
            viewBox="0 0 1440 180"
            fill="currentColor"
          >
            <path d="M0,96L80,106.7C160,117,320,139,480,133.3C640,128,800,96,960,90.7C1120,85,1280,107,1360,117.3L1440,128L1440,240L1360,240C1280,240,1120,240,960,240C800,240,640,240,480,240C320,240,160,240,80,240L0,240Z" />
          </svg>

          {/* Green Foreground Crop Rows */}
          <svg
            className="absolute -bottom-2 w-full text-emerald-600/60"
            viewBox="0 0 1440 120"
            fill="currentColor"
          >
            <path d="M0,40L120,53.3C240,67,480,93,720,85.3C960,78,1200,37,1320,16L1440,0L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" />
          </svg>

          {/* 🌊 TUBEWELL WATER PUMP ENGINE WITH GUSHING WATER (Bottom Left Center) */}
          <div className="absolute bottom-12 left-1/4 hidden flex-col items-center opacity-95 lg:flex">
            <div className="relative flex items-end gap-1.5 rounded-2xl border border-cyan-300 bg-white/80 p-3 shadow-md backdrop-blur-xs">
              {/* Engine Pump Box */}
              <div className="flex flex-col items-center">
                <div className="h-10 w-6 rounded-t-md bg-slate-800 shadow-sm" />
                <div className="h-6 w-10 bg-red-600 rounded-b-md flex items-center justify-center text-[9px] font-bold text-white">PUMP</div>
              </div>
              {/* Pipe & Water Stream */}
              <div className="relative h-12 w-28">
                <div className="absolute top-1 left-0 h-10 w-24 rounded-br-full bg-cyan-400 animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                <div className="absolute top-3 left-2 h-6 w-20 rounded-br-full bg-sky-100 animate-ping opacity-80" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-cyan-900">🌊 Tubewell Water</span>
                <span className="text-[10px] font-bold text-emerald-700">Irrigating Crops</span>
              </div>
            </div>
          </div>

          {/* 🚜 FARMER PLOUGHING FIELD WITH TRACTOR (Bottom Right Center) */}
          <div className="absolute bottom-12 right-1/4 hidden items-center opacity-95 lg:flex">
            <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-white/80 p-3 shadow-md backdrop-blur-xs">
              <span className="text-3xl animate-bounce">🚜</span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-amber-900">🚜 Ploughing Field</span>
                <span className="text-[10px] font-bold text-emerald-700">Khet Ki Jotai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔝 TOP HEADER BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-300/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md md:px-8">
        {/* Left Branding with Official Kisan Diwas Logo */}
        <div className="flex items-center gap-3">
          <div className="relative size-14 overflow-hidden rounded-full border-2 border-amber-500 shadow-md">
            <Image
              src="/kisan-logo.png"
              alt="Kisan Diwas Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-emerald-950 md:text-2xl">
                Kisan Vaani <span className="text-amber-600">(किसान वाणी)</span>
              </h1>
              <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-extrabold text-amber-900 border border-amber-400">
                Voice for Bharat Edition
              </span>
            </div>
            <p className="text-xs font-bold text-emerald-800">
              Your AI Agricultural Voice Companion • (आपका कृषि सहायक)
            </p>
          </div>
        </div>

        {/* Right Live Real-Time Date & Clock Widget */}
        <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 md:text-sm">
            <Calendar className="size-4 text-emerald-700" />
            <span>
              {currentTime
                ? currentTime.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Loading...'}
            </span>
          </div>
          <div className="h-4 w-0.5 bg-emerald-300" />
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 md:text-sm font-mono">
            <Clock className="size-4 text-amber-600 animate-pulse" />
            <span>
              {currentTime
                ? currentTime.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })
                : '00:00:00 AM'}
            </span>
          </div>
        </div>
      </header>

      {/* 🛑 MICROPHONE PERMISSION ERROR MODAL */}
      {micError && (
        <div className="relative z-50 mx-auto mt-4 max-w-xl px-4">
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-400 bg-red-50 p-4 shadow-xl text-red-950">
            <AlertCircle className="size-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold text-sm">Microphone Access Needed</h3>
              <p className="mt-1 text-xs font-medium leading-relaxed text-red-900">{micError}</p>
              <button
                onClick={() => setMicError(null)}
                className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MAIN CENTER CALL PORTAL (5 AGENT STATES) */}
      <main className="relative z-20 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pt-4 pb-36 text-center">
        
        {/* State Badge Banner */}
        <div className="mb-3 inline-flex items-center gap-2.5 rounded-full border-2 border-emerald-400 bg-white/95 px-5 py-2 shadow-md backdrop-blur-md">
          <span
            className={`size-3.5 rounded-full ${
              currentStateName === 'Speaking'
                ? 'bg-emerald-500 animate-ping'
                : currentStateName === 'Listening'
                ? 'bg-amber-500 animate-pulse'
                : currentStateName === 'Connecting'
                ? 'bg-blue-500 animate-spin'
                : currentStateName === 'Call Ended'
                ? 'bg-red-500'
                : 'bg-emerald-600'
            }`}
          />
          <span className="text-xs font-black tracking-wider uppercase text-emerald-950">
            STATE: {currentStateName}
          </span>
          <span className="text-xs font-bold text-slate-700">| {currentStateDesc}</span>
        </div>

        {/* Central Sprout Avatar Circle */}
        <div className="relative my-3 flex size-48 items-center justify-center rounded-full border-4 border-emerald-500 bg-gradient-to-tr from-emerald-100 via-amber-50 to-amber-100 shadow-2xl md:size-56">
          {currentStateName === 'Speaking' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-emerald-500 animate-ping opacity-60" />
          )}
          {currentStateName === 'Listening' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-amber-500 animate-pulse opacity-70" />
          )}

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-6xl md:text-7xl animate-bounce">🌱</span>
            <span className="mt-2 text-base font-black text-emerald-950">
              Kisan Vaani AI
            </span>
          </div>
        </div>

        {/* 🌾 TOPIC SUGGESTION PILLS (When Ready) */}
        {!isConnected && (
          <div className="my-3 flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <span className="w-full text-xs font-black text-emerald-900 uppercase tracking-widest mb-1">
              Ask Kisan Vaani About:
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              🌾 Wheat & Paddy Mandi Rates
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              🐛 Pest Control & Fertilizers
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              ☀️ Local Weather Forecast
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1.5 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              📗 PM-Kisan Schemes
            </span>
          </div>
        )}

        {/* 🎬 MAIN ACTION BUTTONS */}
        <div className="mt-2 flex flex-col items-center gap-3">
          {!isConnected ? (
            <button
              onClick={handleStartCall}
              disabled={session.isConnecting}
              className="group relative flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 px-10 py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:from-emerald-700 hover:to-green-800 active:scale-95 disabled:opacity-50"
            >
              <Phone className="size-6 animate-bounce" />
              <span>{callEndedState ? '🔄 Start New Call' : '🌾 Baat Karo / Start Call'}</span>
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-10 py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:from-red-700 hover:to-rose-700 active:scale-95"
            >
              <PhoneOff className="size-6" />
              <span>End Call (फोन काटें)</span>
            </button>
          )}

          <p className="text-xs font-extrabold text-emerald-950">
            Supports Hindi • Hinglish • English • Tamil
          </p>
        </div>
      </main>

      {/* 🇮🇳 PROMINENT DIGNITARY LEADERS STANDING ON LEFT & RIGHT */}
      
      {/* Bottom Left: Shri Shivraj Singh Chouhan */}
      <div className="fixed bottom-0 left-2 z-30 flex items-end gap-2 md:left-6">
        <div className="relative h-44 w-36 md:h-56 md:w-44 drop-shadow-2xl">
          <Image
            src="/chouhan_portrait.png"
            alt="Shri Shivraj Singh Chouhan"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
        <div className="mb-4 rounded-2xl border-2 border-emerald-400 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md max-w-[180px] md:max-w-[220px]">
          <h4 className="text-xs font-black text-emerald-950">
            Shri Shivraj Singh Chouhan
          </h4>
          <p className="text-[10px] font-extrabold leading-tight text-emerald-700">
            Hon&apos;ble Minister of Agriculture & Farmers Welfare
          </p>
        </div>
      </div>

      {/* Bottom Right: Shri Narendra Modi Ji */}
      <div className="fixed bottom-0 right-2 z-30 flex items-end gap-2 md:right-6">
        <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md max-w-[180px] md:max-w-[220px]">
          <h4 className="text-xs font-black text-amber-950 text-right">
            Shri Narendra Modi Ji
          </h4>
          <p className="text-[10px] font-extrabold leading-tight text-amber-800 text-right">
            Hon&apos;ble Prime Minister of India
          </p>
        </div>
        <div className="relative h-48 w-36 md:h-60 md:w-44 drop-shadow-2xl">
          <Image
            src="/modi_portrait.png"
            alt="Shri Narendra Modi Ji"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
      </div>

    </div>
  );
}
