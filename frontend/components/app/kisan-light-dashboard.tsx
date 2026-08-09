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
  PhoneOff,
  AlertCircle,
  Clock,
  Calendar,
  Phone,
  Sun,
  Moon,
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

  // Determine Day vs Night (Day: 6 AM to 6 PM, Night: 6 PM to 6 AM)
  const currentHour = currentTime ? currentTime.getHours() : 12;
  const isDayTime = currentHour >= 6 && currentHour < 18;

  // Calculate Sun / Moon position (0% at 6am/6pm to 100% at 6pm/6am across screen)
  const sunMoonProgress = isDayTime
    ? ((currentHour - 6) / 12) * 100
    : (((currentHour >= 18 ? currentHour - 18 : currentHour + 6) / 12) * 100);

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
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-slate-900 selection:bg-emerald-200">
      
      {/* ☀️ UPPER DYNAMIC SKY BACKGROUND (REAL-TIME SUN / MOON SYSTEM) */}
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-1000 ${
          isDayTime
            ? 'bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200'
            : 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900'
        }`}
      >
        {/* Dynamic Trajectory Sun or Moon */}
        <div
          className="absolute top-6 transition-all duration-1000 z-10"
          style={{ left: `${Math.max(8, Math.min(84, sunMoonProgress))}%` }}
        >
          {isDayTime ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute size-36 animate-ping rounded-full bg-amber-300/40 opacity-75" />
              <div className="absolute size-28 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-100 shadow-[0_0_80px_rgba(251,191,36,0.9)]" />
              <Sun className="relative size-16 text-amber-500 animate-spin-slow" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="absolute size-32 animate-pulse rounded-full bg-slate-200/30 opacity-60" />
              <div className="size-20 rounded-full bg-slate-200 shadow-[0_0_50px_rgba(226,232,240,0.8)]" />
              <Moon className="absolute size-12 text-slate-400" />
            </div>
          )}
        </div>

        {/* Fluffy Clouds */}
        <div className="absolute top-8 left-12 opacity-85">
          <Cloud className={`size-24 ${isDayTime ? 'text-white/95' : 'text-slate-400/40'} drop-shadow-md`} />
        </div>
        <div className="absolute top-16 right-64 opacity-75">
          <Cloud className={`size-20 ${isDayTime ? 'text-white/90' : 'text-slate-500/30'} drop-shadow-sm`} />
        </div>

        {/* 🕊️ ANIMATED WHITE DOVES / PIGEONS FLYING IN FORMATION */}
        <div className="absolute top-6 left-0 w-full z-15">
          <svg className="h-24 w-full" viewBox="0 0 1200 120" fill="none">
            <g className="animate-bird-fly-1">
              <path
                d="M 0 35 Q 15 15 30 35 Q 45 15 60 35 Q 45 38 30 35 Q 15 38 0 35 Z"
                fill={isDayTime ? '#ffffff' : '#e2e8f0'}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <path
                d="M 70 50 Q 82 32 95 50 Q 108 32 120 50 Q 108 53 95 50 Q 82 53 70 50 Z"
                fill={isDayTime ? '#ffffff' : '#cbd5e1'}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            </g>
            <g className="animate-bird-fly-2">
              <path
                d="M 0 65 Q 12 48 25 65 Q 38 48 50 65 Q 38 68 25 65 Q 12 68 0 65 Z"
                fill={isDayTime ? '#ffffff' : '#e2e8f0'}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <path
                d="M 65 30 Q 75 16 85 30 Q 95 16 105 30 Q 95 33 85 30 Q 75 33 65 30 Z"
                fill={isDayTime ? '#f8fafc' : '#cbd5e1'}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            </g>
            <g className="animate-bird-fly-3">
              <path
                d="M 0 45 Q 18 22 35 45 Q 52 22 70 45 Q 52 48 35 45 Q 18 48 0 45 Z"
                fill={isDayTime ? '#ffffff' : '#f1f5f9'}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* 🌾 EXACT FARM FIELD BACKGROUND IMAGE (SEAMLESSLY BLENDED INTO SKY) */}
      <div className="pointer-events-none absolute inset-0 z-5 flex items-end">
        <div className="relative h-[72%] w-full">
          <Image
            src="/kisan_farm_bg.png"
            alt="Kisan Farm Field & Tractor Background"
            fill
            className="object-cover object-bottom"
            priority
          />
          {/* Top Edge Feather Mask (Removes white seam line completely!) */}
          <div className="absolute top-0 left-0 h-16 w-full bg-gradient-to-b from-sky-300/90 via-sky-200/50 to-transparent" />
        </div>
      </div>

      {/* 🔝 TOP HEADER BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-sky-300/60 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-md md:px-8">
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
        <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-white/95 px-4 py-1.5 shadow-sm">
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
      <main className="relative z-20 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pt-2 pb-44 text-center">
        
        {/* State Badge Banner */}
        <div className="mb-2 inline-flex items-center gap-2.5 rounded-full border-2 border-emerald-400 bg-white/95 px-5 py-1.5 shadow-md backdrop-blur-md">
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
        <div className="relative my-2 flex size-44 items-center justify-center rounded-full border-4 border-emerald-500 bg-gradient-to-tr from-emerald-100 via-amber-50 to-amber-100 shadow-2xl md:size-48">
          {currentStateName === 'Speaking' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-emerald-500 animate-ping opacity-60" />
          )}
          {currentStateName === 'Listening' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-amber-500 animate-pulse opacity-70" />
          )}

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-5xl md:text-6xl animate-bounce">🌱</span>
            <span className="mt-2 text-sm font-black text-emerald-950">
              Kisan Vaani AI
            </span>
          </div>
        </div>

        {/* 🌾 TOPIC SUGGESTION PILLS (When Ready) */}
        {!isConnected && (
          <div className="my-2 flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <span className="w-full text-xs font-black text-emerald-950 uppercase tracking-widest mb-0.5 shadow-xs bg-white/80 rounded-full py-0.5 px-3 w-max">
              Ask Kisan Vaani About:
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              🌾 Wheat & Paddy Mandi Rates
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              🐛 Pest Control & Fertilizers
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              ☀️ Local Weather Forecast
            </span>
            <span className="rounded-full bg-white/95 border-2 border-emerald-300 px-3.5 py-1 text-xs font-extrabold text-emerald-950 shadow-sm hover:bg-emerald-100 transition-colors">
              📗 PM-Kisan Schemes
            </span>
          </div>
        )}

        {/* 🎬 MAIN ACTION BUTTONS */}
        <div className="mt-2 flex flex-col items-center gap-2">
          {!isConnected ? (
            <button
              onClick={handleStartCall}
              disabled={session.isConnecting}
              className="group relative flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 px-10 py-3.5 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:from-emerald-700 hover:to-green-800 active:scale-95 disabled:opacity-50"
            >
              <Phone className="size-6 animate-bounce" />
              <span>{callEndedState ? '🔄 Start New Call' : '🌾 Baat Karo / Start Call'}</span>
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-10 py-3.5 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:from-red-700 hover:to-rose-700 active:scale-95"
            >
              <PhoneOff className="size-6" />
              <span>End Call (फोन काटें)</span>
            </button>
          )}

          <p className="text-xs font-extrabold text-emerald-950 bg-white/80 px-3 py-0.5 rounded-full shadow-xs">
            Supports Hindi • Hinglish • English • Tamil
          </p>
        </div>
      </main>

      {/* 🇮🇳 EXACT TRANSPARENT LEADER CUTOUTS & BADGES (FROM YOUR VIDEO) */}
      
      {/* Bottom Left: Shri Shivraj Singh Chouhan Cutout & Badge */}
      <div className="fixed bottom-0 left-0 z-30 flex flex-col items-start pointer-events-none">
        <div className="relative h-72 w-60 md:h-[380px] md:w-72 drop-shadow-2xl">
          <Image
            src="/chouhan_transparent.png"
            alt="Shri Shivraj Singh Chouhan"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto ml-2 mb-2 relative h-11 w-64 md:h-12 md:w-72">
          <Image
            src="/chouhan_badge.png"
            alt="Shri Shivraj Singh Chouhan Badge"
            fill
            className="object-contain object-left"
          />
        </div>
      </div>

      {/* Bottom Right: Shri Narendra Modi Ji Cutout & Badge */}
      <div className="fixed bottom-0 right-0 z-30 flex flex-col items-end pointer-events-none">
        <div className="relative h-72 w-64 md:h-[380px] md:w-80 drop-shadow-2xl">
          <Image
            src="/modi_transparent.png"
            alt="Shri Narendra Modi Ji"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto mr-2 mb-2 relative h-11 w-64 md:h-12 md:w-72">
          <Image
            src="/modi_badge.png"
            alt="Shri Narendra Modi Ji Badge"
            fill
            className="object-contain object-right"
          />
        </div>
      </div>

    </div>
  );
}
