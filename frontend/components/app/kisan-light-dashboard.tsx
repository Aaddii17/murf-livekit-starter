'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  useSessionContext,
  useVoiceAssistant,
  useTrackTranscription,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  AlertCircle,
  Clock,
  Calendar,
  Volume2,
  Phone,
  RefreshCw,
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
  const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant();
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

  // Determine Day vs Night for Sky
  const currentHour = currentTime ? currentTime.getHours() : 12;
  const isDayTime = currentHour >= 6 && currentHour < 18;

  // Sun / Moon Position (6 AM -> 0%, 12 PM -> 50%, 6 PM -> 100%)
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
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-emerald-50 via-amber-50/40 to-green-100 font-sans text-slate-800 selection:bg-emerald-200">
      {/* ☀️ DYNAMIC REAL-TIME DAY/NIGHT SKY ANIMATION LAYER */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Sky Gradient */}
        <div
          className={`absolute inset-0 transition-colors duration-1000 ${
            isDayTime
              ? 'bg-gradient-to-b from-sky-200/70 via-emerald-100/50 to-transparent'
              : 'bg-gradient-to-b from-slate-900/80 via-indigo-950/60 to-emerald-950/40'
          }`}
        />

        {/* Dynamic Sun / Moon Element */}
        <div
          className="absolute top-10 transition-all duration-1000"
          style={{ left: `${Math.max(10, Math.min(85, sunMoonProgress))}%` }}
        >
          {isDayTime ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute size-24 animate-ping rounded-full bg-amber-300/30 opacity-75" />
              <div className="size-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_40px_rgba(251,191,36,0.6)]" />
              <Sun className="absolute size-10 text-amber-600 animate-spin-slow" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="size-14 rounded-full bg-slate-200 shadow-[0_0_30px_rgba(226,232,240,0.5)]" />
              <Moon className="absolute size-8 text-slate-400" />
            </div>
          )}
        </div>

        {/* 🕊️ 5-6 ANIMATED FLYING BIRDS IN LOOP */}
        <div className="absolute top-16 left-0 w-full">
          <svg className="h-12 w-full" viewBox="0 0 1000 100" fill="none">
            <g className="animate-bird-fly-1 opacity-70">
              <path
                d="M 0 40 Q 15 25 30 40 Q 45 25 60 40"
                stroke="#334155"
                strokeWidth="2"
                fill="none"
              />
            </g>
            <g className="animate-bird-fly-2 opacity-60">
              <path
                d="M 50 20 Q 62 8 75 20 Q 88 8 100 20"
                stroke="#475569"
                strokeWidth="2"
                fill="none"
              />
            </g>
            <g className="animate-bird-fly-3 opacity-80">
              <path
                d="M 120 50 Q 132 38 145 50 Q 158 38 170 50"
                stroke="#1e293b"
                strokeWidth="2"
                fill="none"
              />
            </g>
          </svg>
        </div>

        {/* 🌾 COUNTRYSIDE FIELD & ANIMATED TUBEWELL WATER PUMP SCENE */}
        <div className="absolute right-0 bottom-0 left-0 h-64 overflow-hidden">
          {/* Rolling Hills Background */}
          <svg
            className="absolute bottom-0 w-full text-emerald-300/40"
            viewBox="0 0 1440 200"
            fill="currentColor"
          >
            <path d="M0,128L80,117.3C160,107,320,85,480,96C640,107,800,149,960,154.7C1120,160,1280,128,1360,112L1440,96L1440,200L1360,200C1280,200,1120,200,960,200C800,200,640,200,480,200C320,200,160,200,80,200L0,200Z" />
          </svg>

          {/* Green Crops Foreground */}
          <svg
            className="absolute -bottom-2 w-full text-emerald-600/30"
            viewBox="0 0 1440 120"
            fill="currentColor"
          >
            <path d="M0,64L120,80C240,96,480,128,720,112C960,96,1200,32,1320,16L1440,0L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" />
          </svg>

          {/* 🌊 Animated Tubewell Water Stream (Left Side) */}
          <div className="absolute bottom-6 left-8 flex items-end gap-2 opacity-85 md:left-20">
            <div className="flex flex-col items-center">
              <div className="h-10 w-4 rounded-t-lg bg-slate-700 shadow-md" />
              <div className="h-6 w-8 bg-slate-800" />
            </div>
            <div className="relative h-12 w-24">
              <div className="absolute top-2 left-0 h-10 w-20 rounded-br-full bg-cyan-400/80 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              <div className="absolute top-4 left-2 h-6 w-16 rounded-br-full bg-sky-200 animate-ping opacity-75" />
            </div>
            <span className="mb-1 text-xs font-semibold text-emerald-800">
              🌊 Tubewell Irrigation
            </span>
          </div>

          {/* 🚜 Tractor Ploughing Field Motif (Right Side) */}
          <div className="absolute right-8 bottom-6 flex items-center gap-2 opacity-85 md:right-24">
            <span className="text-2xl animate-bounce">🚜</span>
            <span className="text-xs font-semibold text-emerald-800">
              Ploughing Green Fields
            </span>
          </div>
        </div>
      </div>

      {/* 🔝 TOP HEADER BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-200/60 bg-white/80 px-4 py-3 shadow-xs backdrop-blur-md md:px-8">
        {/* Left Branding with Logo */}
        <div className="flex items-center gap-3">
          <div className="relative size-12 overflow-hidden rounded-full border-2 border-amber-500 shadow-md">
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
              <h1 className="text-xl font-extrabold tracking-tight text-emerald-900 md:text-2xl">
                Kisan Vaani <span className="text-amber-600">(किसान वाणी)</span>
              </h1>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
                Voice for Bharat Edition
              </span>
            </div>
            <p className="text-xs font-medium text-emerald-700">
              Your AI Agricultural Voice Companion • (आपका कृषि सहायक)
            </p>
          </div>
        </div>

        {/* Right Live Real-Time Date & Clock Widget */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/80 bg-emerald-50/90 px-4 py-2 shadow-xs backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 md:text-sm">
            <Calendar className="size-4 text-emerald-600" />
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
          <div className="h-4 w-px bg-emerald-300" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 md:text-sm font-mono">
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
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 shadow-lg text-red-900">
            <AlertCircle className="size-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm">Microphone Access Needed</h3>
              <p className="mt-1 text-xs leading-relaxed text-red-800">{micError}</p>
              <button
                onClick={() => setMicError(null)}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MAIN CENTER CALL PORTAL (5 AGENT STATES) */}
      <main className="relative z-20 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pt-6 pb-32 text-center">
        {/* State Badge Banner */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-md">
          <span
            className={`size-3 rounded-full ${
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
          <span className="text-xs font-bold tracking-wide uppercase text-emerald-950">
            State: {currentStateName}
          </span>
          <span className="text-xs text-slate-500">| {currentStateDesc}</span>
        </div>

        {/* Central Sprout Avatar & Visualizer Circle */}
        <div className="relative my-4 flex size-44 items-center justify-center rounded-full border-4 border-emerald-400 bg-gradient-to-tr from-emerald-100 to-amber-100 shadow-xl md:size-52">
          {currentStateName === 'Speaking' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-emerald-500 animate-ping opacity-50" />
          )}
          {currentStateName === 'Listening' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-amber-400 animate-pulse opacity-60" />
          )}

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-5xl md:text-6xl animate-bounce">🌱</span>
            <span className="mt-2 text-sm font-extrabold text-emerald-900">
              Kisan Vaani AI
            </span>
          </div>
        </div>

        {/* 🌾 TOPIC SUGGESTION PILLS (When Ready) */}
        {!isConnected && (
          <div className="my-4 flex flex-wrap items-center justify-center gap-2 max-w-lg">
            <span className="w-full text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Ask Kisan Vaani About:
            </span>
            <span className="rounded-full bg-white/90 border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-100 transition-colors">
              🌾 Wheat & Paddy Mandi Rates
            </span>
            <span className="rounded-full bg-white/90 border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-100 transition-colors">
              🐛 Pest Control & Fertilizers
            </span>
            <span className="rounded-full bg-white/90 border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-100 transition-colors">
              ☀️ Local Weather Forecast
            </span>
            <span className="rounded-full bg-white/90 border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs hover:bg-emerald-100 transition-colors">
              📗 PM-Kisan Schemes
            </span>
          </div>
        )}

        {/* 🎬 MAIN ACTION BUTTONS */}
        <div className="mt-4 flex flex-col items-center gap-4">
          {!isConnected ? (
            <button
              onClick={handleStartCall}
              disabled={session.isConnecting}
              className="group relative flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:scale-105 hover:from-emerald-700 hover:to-green-700 active:scale-95 disabled:opacity-50"
            >
              <Phone className="size-6 animate-bounce" />
              <span>{callEndedState ? '🔄 Start New Call' : '🌾 Baat Karo / Start Call'}</span>
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-8 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:scale-105 hover:from-red-700 hover:to-rose-700 active:scale-95"
            >
              <PhoneOff className="size-6" />
              <span>End Call (फोन काटें)</span>
            </button>
          )}

          <p className="text-xs font-semibold text-emerald-800">
            Supports Hindi • Hinglish • English • Tamil
          </p>
        </div>
      </main>

      {/* 🇮🇳 BOTTOM DIGNITARY CARDS LAYER */}
      <footer className="fixed bottom-0 left-0 z-30 flex w-full items-end justify-between px-4 pb-3 pointer-events-none md:px-8">
        {/* Bottom Left: Shri Shivraj Singh Chouhan */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-300/80 bg-white/95 p-2.5 shadow-lg backdrop-blur-md max-w-[240px] md:max-w-[280px]">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-emerald-400 shadow-sm">
            <Image
              src="/agri-minister.png"
              alt="Shri Shivraj Singh Chouhan"
              fill
              className="object-cover object-top"
            />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-emerald-950">
              Shri Shivraj Singh Chouhan
            </h4>
            <p className="text-[10px] font-medium leading-tight text-emerald-700">
              Hon&apos;ble Minister of Agriculture & Farmers Welfare
            </p>
          </div>
        </div>

        {/* Center KVK Helpline Info */}
        <div className="hidden pointer-events-auto rounded-full border border-emerald-300 bg-emerald-900/90 px-4 py-1.5 text-center text-xs font-bold text-emerald-50 shadow-md backdrop-blur-md lg:block">
          🌾 KVK Toll-Free Helpline: <span className="text-amber-300 font-mono">1800-180-1551</span>
        </div>

        {/* Bottom Right: Shri Narendra Modi Ji */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-300/80 bg-white/95 p-2.5 shadow-lg backdrop-blur-md max-w-[240px] md:max-w-[280px]">
          <div>
            <h4 className="text-xs font-extrabold text-amber-950 text-right">
              Shri Narendra Modi Ji
            </h4>
            <p className="text-[10px] font-medium leading-tight text-amber-800 text-right">
              Hon&apos;ble Prime Minister of India
            </p>
          </div>
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-amber-400 shadow-sm">
            <Image
              src="/modi-ji.jpg"
              alt="Shri Narendra Modi Ji"
              fill
              className="object-cover object-top"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
