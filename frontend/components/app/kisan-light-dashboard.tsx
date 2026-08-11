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
  const handleStartCall = async (isOutbound: boolean = false) => {
    setMicError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (isOutbound && onStartOutboundCall) {
        onStartOutboundCall();
      } else {
        onStartCall();
      }
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      setMicError(
        'Microphone access was denied. Please allow microphone access in your browser address bar settings to talk with Kisan Vaani.'
      );
    }
  };

  const handleEndCall = async () => {
    try {
      setCallEndedState(true);
      if (session && session.disconnect) {
        await session.disconnect();
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
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
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-slate-100 selection:bg-amber-500">
      
      {/* 🖼️ REALISTIC FARM COVER BACKGROUND (kisan_cover.jpg) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/kisan_cover.jpg"
          alt="Kisan Vaani Realistic Farm Cover Background"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Subtle Dark Gradient Overlay for Portal Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/20 to-slate-950/60 backdrop-blur-[0.5px]" />
      </div>

      {/* 🔝 TOP HEADER BAR */}
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/30 bg-slate-950/85 px-4 py-3 shadow-2xl backdrop-blur-md md:px-8">
        {/* Left Branding with Official Kisan Diwas Logo */}
        <div className="flex items-center gap-3">
          <div className="relative size-14 overflow-hidden rounded-full border-2 border-amber-400 shadow-lg shadow-amber-500/20">
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
              <h1 className="text-xl font-black tracking-tight text-amber-300 md:text-2xl drop-shadow-md">
                KISAN VAANI <span className="text-white font-semibold">(किसान वाणी)</span>
              </h1>
              <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-extrabold text-amber-300 border border-amber-400/40">
                Voice for Bharat Edition
              </span>
            </div>
            <p className="text-xs font-medium text-emerald-300">
              Your AI Agricultural Voice Companion • (आपका कृषि सहायक)
            </p>
          </div>
        </div>

        {/* Right Live Real-Time Date & Clock Widget */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-slate-900/90 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 md:text-sm">
            <Calendar className="size-4 text-emerald-400" />
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
          <div className="h-4 w-0.5 bg-amber-400/40" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 md:text-sm font-mono">
            <Clock className="size-4 text-amber-400 animate-pulse" />
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
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-500/80 bg-red-950/90 p-4 shadow-2xl backdrop-blur-md text-red-100">
            <AlertCircle className="size-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold text-sm text-red-200">Microphone Access Needed</h3>
              <p className="mt-1 text-xs leading-relaxed text-red-100">{micError}</p>
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
      <main className="relative z-30 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 pt-6 pb-36 text-center">
        
        {/* State Badge Banner */}
        <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/40 bg-slate-900/90 px-5 py-2 shadow-xl backdrop-blur-md">
          <span
            className={`size-3.5 rounded-full ${
              currentStateName === 'Speaking'
                ? 'bg-emerald-400 animate-ping'
                : currentStateName === 'Listening'
                ? 'bg-amber-400 animate-pulse'
                : currentStateName === 'Connecting'
                ? 'bg-cyan-400 animate-spin'
                : currentStateName === 'Call Ended'
                ? 'bg-red-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs font-black tracking-wider uppercase text-emerald-300">
            STATE: {currentStateName}
          </span>
          <span className="text-xs font-semibold text-slate-300">| {currentStateDesc}</span>
        </div>

        {/* Central Sprout Avatar Circle */}
        <div className="relative my-4 flex size-44 items-center justify-center rounded-full border-4 border-emerald-400 bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 shadow-[0_0_50px_rgba(16,185,129,0.4)] md:size-52">
          {currentStateName === 'Speaking' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-emerald-400 animate-ping opacity-60" />
          )}
          {currentStateName === 'Listening' && (
            <div className="absolute inset-0 size-full rounded-full border-4 border-amber-400 animate-pulse opacity-70" />
          )}

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-6xl md:text-7xl animate-bounce drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">🌱</span>
            <span className="mt-2 text-base font-black text-amber-300 tracking-wide">
              Kisan Vaani AI
            </span>
          </div>
        </div>

        {/* 🌾 TOPIC SUGGESTION PILLS (When Ready) */}
        {!isConnected && (
          <div className="my-3 flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <span className="w-full text-xs font-bold text-amber-300 uppercase tracking-widest mb-1 drop-shadow-md">
              Ask Kisan Vaani About:
            </span>
            <span className="rounded-full bg-slate-900/85 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-200 shadow-md hover:bg-emerald-900/50 transition-colors backdrop-blur-xs">
              🌾 Wheat & Paddy Mandi Rates
            </span>
            <span className="rounded-full bg-slate-900/85 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-200 shadow-md hover:bg-emerald-900/50 transition-colors backdrop-blur-xs">
              🐛 Pest Control & Fertilizers
            </span>
            <span className="rounded-full bg-slate-900/85 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-200 shadow-md hover:bg-emerald-900/50 transition-colors backdrop-blur-xs">
              ☀️ Local Weather Forecast
            </span>
            <span className="rounded-full bg-slate-900/85 border border-emerald-400/40 px-3.5 py-1 text-xs font-bold text-emerald-200 shadow-md hover:bg-emerald-900/50 transition-colors backdrop-blur-xs">
              📗 PM-Kisan Schemes
            </span>
          </div>
        )}

        {/* 🎬 MAIN ACTION BUTTONS */}
        <div className="mt-2 flex flex-col items-center gap-3">
          {!isConnected ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleStartCall(false)}
                disabled={session.isConnecting}
                className="group relative flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 px-8 py-4 text-base md:text-lg font-black text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all hover:scale-105 hover:from-emerald-400 hover:to-green-500 active:scale-95 disabled:opacity-50"
              >
                <Phone className="size-5 md:size-6 animate-bounce text-slate-950" />
                <span>{callEndedState ? '🔄 Inbound Call' : '🌾 Inbound Call / Start'}</span>
              </button>

              <button
                onClick={() => handleStartCall(true)}
                disabled={session.isConnecting}
                className="group relative flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-4 text-base md:text-lg font-black text-slate-950 shadow-[0_0_35px_rgba(251,191,36,0.6)] transition-all hover:scale-105 hover:from-amber-300 hover:to-yellow-400 active:scale-95 disabled:opacity-50"
              >
                <Phone className="size-5 md:size-6 animate-pulse text-slate-950" />
                <span>📞 Trigger Outbound Call Alert</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-10 py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:from-red-700 hover:to-rose-700 active:scale-95"
            >
              <PhoneOff className="size-6" />
              <span>End Call (फोन काटें)</span>
            </button>
          )}

          <p className="text-xs font-bold text-slate-200 drop-shadow-md">
            Supports Inbound Queries & Day 6 Proactive Outbound Weather/Mandi Alerts
          </p>
        </div>
      </main>

      {/* 🏛️ TRANSPARENT LEADER CUTOUTS AT BOTTOM CORNERS WITH ROUNDED BADGES */}
      
      {/* Bottom Left: Shri Shivraj Singh Chouhan (MUCH LARGER CUTOUT & NAME TAG) */}
      <div className="fixed bottom-0 left-0 z-40 flex flex-col items-start pointer-events-none">
        <div className="relative h-80 w-64 sm:h-[460px] sm:w-[380px] lg:h-[580px] lg:w-[460px] drop-shadow-2xl">
          <Image
            src="/chouhan_transparent.png"
            alt="Shri Shivraj Singh Chouhan"
            fill
            className="object-contain object-left-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto ml-5 mb-5 rounded-full border-2 border-emerald-400 bg-slate-950/95 px-7 py-3.5 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-md">
          <h4 className="text-base font-black tracking-wide text-amber-300 md:text-lg">
            Shri Shivraj Singh Chouhan
          </h4>
          <p className="text-xs font-extrabold text-emerald-300 md:text-sm">
            Ministry of Agriculture
          </p>
        </div>
      </div>

      {/* Bottom Right: Shri Narendra Modi Ji (MUCH LARGER CUTOUT & NAME TAG) */}
      <div className="fixed bottom-0 right-0 z-40 flex flex-col items-end pointer-events-none">
        <div className="relative h-80 w-72 sm:h-[460px] sm:w-[400px] lg:h-[580px] lg:w-[500px] drop-shadow-2xl">
          <Image
            src="/modi_transparent.png"
            alt="Shri Narendra Modi Ji"
            fill
            className="object-contain object-right-bottom"
            priority
          />
        </div>
        <div className="pointer-events-auto mr-5 mb-5 rounded-full border-2 border-amber-400 bg-slate-950/95 px-7 py-3.5 text-white shadow-[0_0_30px_rgba(251,191,36,0.4)] backdrop-blur-md text-right">
          <h4 className="text-base font-black tracking-wide text-amber-300 md:text-lg">
            Shri Narendra Modi Ji
          </h4>
          <p className="text-xs font-extrabold text-amber-200 md:text-sm">
            Hon&apos;ble Prime Minister of India
          </p>
        </div>
      </div>



    </div>
  );
}
