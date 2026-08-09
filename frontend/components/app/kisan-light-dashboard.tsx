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

  // Calculate Sun / Moon progress (0% at 6am/6pm to 100% at 6pm/6am across screen)
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
      
      {/* ☀️ DYNAMIC DUAL SKY (REAL-TIME SUN / MOON SYSTEM BASED ON LOCAL HOUR) */}
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-1000 ${
          isDayTime
            ? 'bg-gradient-to-b from-sky-400 via-sky-200 via-emerald-100 to-amber-50'
            : 'bg-gradient-to-b from-slate-950 via-indigo-950 via-slate-900 to-emerald-950/70'
        }`}
      >
        {/* Dynamic Trajectory Sun or Moon */}
        <div
          className="absolute top-8 transition-all duration-1000 z-10"
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
        <div className="absolute top-10 left-12 opacity-85">
          <Cloud className={`size-24 ${isDayTime ? 'text-white/95' : 'text-slate-400/40'} drop-shadow-md`} />
        </div>
        <div className="absolute top-20 right-64 opacity-75">
          <Cloud className={`size-20 ${isDayTime ? 'text-white/90' : 'text-slate-500/30'} drop-shadow-sm`} />
        </div>

        {/* 🕊️ ANIMATED WHITE DOVES / PIGEONS FLYING IN FORMATION (From Kisan vidoe.mp4) */}
        <div className="absolute top-8 left-0 w-full z-15">
          <svg className="h-24 w-full" viewBox="0 0 1200 120" fill="none">
            {/* Dove Group 1 */}
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
            {/* Dove Group 2 */}
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
            {/* Dove Group 3 */}
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

        {/* 🌾 SEAMLESS BLENDED COUNTRYSIDE FIELD & CUTOUTS (NO BORDER LINE) */}
        <div className="absolute right-0 bottom-0 left-0 h-[480px] overflow-hidden">
          
          {/* Soft Horizon Gradient Feather Mask (Eliminates the horizontal seam border line!) */}
          <div className="absolute top-0 left-0 h-32 w-full bg-gradient-to-b from-transparent via-emerald-400/20 to-emerald-600/50 backdrop-blur-[2px] z-1" />

          {/* Rolling Hills Background Waves */}
          <svg
            className="absolute bottom-0 w-full text-emerald-500/40"
            viewBox="0 0 1440 280"
            fill="currentColor"
          >
            <path d="M0,160L120,144C240,128,480,96,720,112C960,128,1200,192,1320,224L1440,256L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z" />
          </svg>

          {/* Golden Wheat Crop Lines */}
          <svg
            className="absolute -bottom-4 w-full text-amber-500/35"
            viewBox="0 0 1440 200"
            fill="currentColor"
          >
            <path d="M0,96L80,106.7C160,117,320,139,480,133.3C640,128,800,96,960,90.7C1120,85,1280,107,1360,117.3L1440,128L1440,240L1360,240C1280,240,1120,240,960,240C480,240,240,240,80,240L0,240Z" />
          </svg>

          {/* Foreground Lush Green Crop Field */}
          <svg
            className="absolute -bottom-2 w-full text-emerald-700/80"
            viewBox="0 0 1440 140"
            fill="currentColor"
          >
            <path d="M0,40L120,53.3C240,67,480,93,720,85.3C960,78,1200,37,1320,16L1440,0L1440,140L1320,140C1200,140,960,140,720,140C480,140,240,140,120,140L0,140Z" />
          </svg>

          {/* 👨‍👩‍👦 FARMER FAMILY TRANSPARENT CUTOUT (Left Side Background - From Your Video) */}
          <div className="absolute bottom-16 left-4 z-5 hidden md:block lg:left-12">
            <div className="relative h-64 w-80 drop-shadow-2xl">
              <Image
                src="/farmer_family.png"
                alt="Farmer Family with Phone"
                fill
                className="object-contain object-bottom"
                priority
              />
            </div>
          </div>

          {/* 🚜 GREEN JOHN DEERE TRACTOR TRANSPARENT CUTOUT (Right Side Background - From Your Video) */}
          <div className="absolute bottom-16 right-4 z-5 hidden md:block lg:right-16">
            <div className="relative h-64 w-80 drop-shadow-2xl">
              <Image
                src="/green_tractor.png"
                alt="Green John Deere Tractor"
                fill
                className="object-contain object-bottom"
                priority
              />
            </div>
          </div>

          {/* 🌊 ANIMATED TUBEWELL WATER PUMP ENGINE (Center Bottom Field) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-2 opacity-95 z-5">
            <div className="flex items-end gap-2 rounded-2xl border-2 border-cyan-400 bg-white/95 p-2.5 shadow-xl backdrop-blur-md">
              {/* Engine Box */}
              <div className="flex flex-col items-center">
                <div className="h-8 w-6 rounded-t-md bg-slate-900 shadow-md" />
                <div className="h-5 w-10 rounded-b-md bg-red-600 flex items-center justify-center text-[8px] font-black text-white">ENGINE</div>
              </div>
              {/* Gushing Water Pipeline Stream */}
              <div className="relative h-10 w-28">
                <div className="absolute top-1 left-0 h-8 w-24 rounded-br-full bg-cyan-400 animate-pulse shadow-[0_0_25px_rgba(34,211,238,0.9)]" />
                <div className="absolute top-2 left-2 h-5 w-20 rounded-br-full bg-sky-100 animate-ping opacity-90" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-cyan-950">🌊 Tubewell Water Stream</span>
                <span className="text-[9px] font-extrabold text-emerald-800">Crops Irrigation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔝 TOP HEADER BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b-2 border-emerald-300 bg-white/95 px-4 py-3 shadow-md backdrop-blur-md md:px-8">
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
      <main className="relative z-20 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pt-2 pb-44 text-center">
        
        {/* State Badge Banner */}
        <div className="mb-2 inline-flex items-center gap-2.5 rounded-full border-2 border-emerald-400 bg-white/95 px-5 py-2 shadow-md backdrop-blur-md">
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
        <div className="relative my-2 flex size-44 items-center justify-center rounded-full border-4 border-emerald-500 bg-gradient-to-tr from-emerald-100 via-amber-50 to-amber-100 shadow-2xl md:size-52">
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
          <div className="my-2 flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <span className="w-full text-xs font-black text-emerald-900 uppercase tracking-widest mb-0.5">
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

      {/* 🇮🇳 TRANSPARENT LEADER CUTOUTS ON LEFT & RIGHT WITH TITLE BADGES (From Your Video) */}
      
      {/* Bottom Left: Shri Shivraj Singh Chouhan */}
      <div className="fixed bottom-0 left-0 z-30 flex flex-col items-start pointer-events-none">
        <div className="relative h-80 w-64 md:h-[400px] md:w-72 drop-shadow-2xl">
          <Image
            src="/chouhan_transparent.png"
            alt="Shri Shivraj Singh Chouhan"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto ml-4 mb-3 rounded-xl border-2 border-emerald-400 bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur-md max-w-[200px] md:max-w-[240px]">
          <h4 className="text-xs font-black text-emerald-950">
            Shri Shivraj Singh Chouhan
          </h4>
          <p className="text-[10px] font-extrabold leading-tight text-emerald-700">
            Ministry of Agriculture
          </p>
        </div>
      </div>

      {/* Bottom Right: Shri Narendra Modi Ji */}
      <div className="fixed bottom-0 right-0 z-30 flex flex-col items-end pointer-events-none">
        <div className="relative h-80 w-72 md:h-[400px] md:w-[360px] drop-shadow-2xl">
          <Image
            src="/modi_transparent.png"
            alt="Shri Narendra Modi Ji"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto mr-4 mb-3 rounded-xl border-2 border-amber-400 bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur-md max-w-[200px] md:max-w-[240px]">
          <h4 className="text-xs font-black text-amber-950 text-right">
            Shri Narendra Modi Ji
          </h4>
          <p className="text-[10px] font-extrabold leading-tight text-amber-800 text-right">
            Hon&apos;ble Prime Minister of India
          </p>
        </div>
      </div>

    </div>
  );
}
