'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { Phone, PhoneOff, AlertCircle, BarChart3, X, CheckCircle2, XCircle, Activity, TrendingUp, Clock } from 'lucide-react';

interface KisanLightDashboardProps {
  onStartCall: () => void;
  onStartOutboundCall?: () => void;
}

interface CallLogItem {
  call_id: string;
  caller_name: string;
  district: string;
  status: string;
  outcome: string;
  duration_sec: number;
  created_at: string;
}

interface AnalyticsData {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  recent_calls: CallLogItem[];
}

export function KisanLightDashboard({ onStartCall, onStartOutboundCall }: KisanLightDashboardProps) {
  const session = useSessionContext();
  const { disconnect, isConnected } = session;
  const { state: agentState } = useAgent();
  const [micError, setMicError] = useState<string | null>(null);
  const [callEndedState, setCallEndedState] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  
  // Analytics Dashboard Modal State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    total_calls: 5,
    successful_calls: 4,
    failed_calls: 1,
    success_rate: 80.0,
    recent_calls: [],
  });

  // Fetch Live Analytics Data
  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json);
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    }
  };

  // Real-time Live Clock Timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setCurrentTimeStr(now.toLocaleString('en-IN', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync call ended state & refresh analytics when call ends
  useEffect(() => {
    if (isConnected) {
      setCallEndedState(false);
    } else {
      fetchAnalytics();
    }
  }, [isConnected]);

  // Direct Start Call Handler
  const handleStartCall = (isOutbound: boolean = false) => {
    setMicError(null);
    if (isOutbound && onStartOutboundCall) {
      onStartOutboundCall();
    } else {
      onStartCall();
    }
  };

  const handleEndCall = async () => {
    try {
      setCallEndedState(true);
      if (session && session.disconnect) {
        await session.disconnect();
      }
      setTimeout(fetchAnalytics, 1500);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Determine current Agent State
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
    } else if (agentState === 'listening') {
      currentStateName = 'Listening';
      currentStateDesc = 'Listening to you... (आपकी बात सुन रहे हैं)';
    } else {
      currentStateName = 'Connected';
      currentStateDesc = 'Active Call • Ask your farming query';
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* 🖼️ FULL-BLEED REALISTIC FARM COVER BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/kisan_cover.jpg"
          alt="Indian Agricultural Fields Sunrise Cover"
          fill
          priority
          className="object-cover object-center filter brightness-[0.92] contrast-[1.05]"
        />
        {/* Subtle top & bottom dark gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none" />
      </div>

      {/* 🌾 TOP NAVBAR HEADER */}
      <header className="relative z-30 flex items-center justify-between border-b border-amber-400/30 bg-slate-950/80 px-6 py-3.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative size-10 overflow-hidden rounded-full border-2 border-amber-400 shadow-md">
            <Image src="/kisan-logo.png" alt="Kisan Vaani Logo" fill className="object-cover" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-amber-400 drop-shadow-md md:text-2xl">
                KISAN VAANI <span className="text-base font-extrabold text-emerald-400">(किसान वाणी)</span>
              </h1>
              <span className="rounded-full bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                Voice for Bharat Edition
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Your AI Agricultural Voice Companion • (आपका कृषि सहायक)
            </p>
          </div>
        </div>

        {/* Action Controls & Realtime Clock */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchAnalytics();
              setShowAnalyticsModal(true);
            }}
            className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-4 py-1.5 text-xs font-black text-amber-300 shadow-lg hover:bg-amber-500/30 transition-all active:scale-95 backdrop-blur-md"
          >
            <BarChart3 className="size-4 text-amber-400 animate-pulse" />
            <span>📊 Call Analytics Dashboard</span>
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-900/80 px-4 py-1.5 text-xs font-bold text-emerald-300 shadow-inner backdrop-blur-xs">
            <span>🕒 {currentTimeStr || 'Live India Time'}</span>
          </div>
        </div>
      </header>

      {/* 📊 DAY 8 CALL ANALYTICS MODAL DIALOG */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-400/40 bg-slate-900/95 p-6 shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
                  <BarChart3 className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-amber-400 tracking-wide">
                    KISAN VAANI — REAL-TIME CALL ANALYTICS
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    Live Performance, Success Criteria & Call Outcomes (Day 8 SQLite Engine)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* 4 TOP METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {/* Total Calls */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-blue-400 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Total Calls</span>
                  <Activity className="size-5" />
                </div>
                <div className="text-3xl font-black text-blue-200">{analyticsData.total_calls}</div>
                <div className="text-[11px] font-semibold text-blue-300/80 mt-1">Total sessions logged</div>
              </div>

              {/* Successful Calls */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-emerald-400 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Successful Calls</span>
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="text-3xl font-black text-emerald-300">{analyticsData.successful_calls}</div>
                <div className="text-[11px] font-semibold text-emerald-300/80 mt-1">Inquiry/Tool completed</div>
              </div>

              {/* Failed Calls */}
              <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-red-400 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Failed Calls</span>
                  <XCircle className="size-5" />
                </div>
                <div className="text-3xl font-black text-red-300">{analyticsData.failed_calls}</div>
                <div className="text-[11px] font-semibold text-red-300/80 mt-1">Incomplete / Early disconnect</div>
              </div>

              {/* Success Rate % */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-amber-400 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider">Success Rate</span>
                  <TrendingUp className="size-5" />
                </div>
                <div className="text-3xl font-black text-amber-300">{analyticsData.success_rate}%</div>
                <div className="text-[11px] font-semibold text-amber-300/80 mt-1">Target &gt; 80%</div>
              </div>
            </div>

            {/* DAY 8 SUCCESS CONDITION EXPLANATION BANNER */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 mb-6 text-xs text-amber-200 leading-relaxed">
              <span className="font-black text-amber-400">🌾 Day 8 Definition of Success:</span> A call is marked <strong className="text-emerald-300">SUCCESSFUL</strong> when the farmer receives requested mandi price or weather info, loads saved SQLite memory, or registers an emergency KVK officer escalation ticket. A call is marked <strong className="text-red-300">FAILED</strong> if the user hangs up prematurely before completing their inquiry.
            </div>

            {/* RECENT CALL LOGS TABLE */}
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-300 mb-3 flex items-center gap-2">
                <Clock className="size-4 text-amber-400" />
                <span>Recent Call History & Outcomes (Protected Privacy Log)</span>
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Call ID</th>
                      <th className="px-4 py-3">Caller & District</th>
                      <th className="px-4 py-3">Outcome Summary</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {analyticsData.recent_calls.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-300">{log.call_id}</td>
                        <td className="px-4 py-3 text-slate-200">
                          <div>{log.caller_name}</div>
                          <div className="text-[10px] text-slate-400">{log.district}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{log.outcome}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{log.duration_sec}s</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}
                          >
                            {log.status === 'SUCCESS' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="rounded-full bg-amber-500 px-6 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ MIC ERROR ALERT DISPLAY */}
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

        {/* 🌾 TOPIC SUGGESTION PILLS */}
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
            Supports Inbound Queries & Proactive Outbound Weather & Mandi Alerts
          </p>
        </div>
      </main>

      {/* 🏛️ TRANSPARENT LEADER CUTOUTS AT BOTTOM CORNERS */}
      <div className="fixed bottom-0 left-0 z-20 pointer-events-none">
        <div className="relative h-[340px] w-[300px] sm:h-[500px] sm:w-[440px] lg:h-[640px] lg:w-[540px] drop-shadow-[0_10px_35px_rgba(0,0,0,0.6)] filter brightness-[1.05]">
          <Image
            src="/chouhan_transparent.png"
            alt="Shri Shivraj Singh Chouhan"
            fill
            className="object-contain object-left-bottom"
            priority
          />
        </div>
      </div>
      <div className="fixed bottom-2 left-4 z-40 pointer-events-auto rounded-full border-2 border-emerald-400 bg-slate-950/95 px-6 py-2.5 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] backdrop-blur-md">
        <h4 className="text-sm font-black tracking-wide text-amber-300 md:text-base">
          Shri Shivraj Singh Chouhan
        </h4>
        <p className="text-[11px] font-extrabold text-emerald-300 md:text-xs">
          Ministry of Agriculture
        </p>
      </div>

      <div className="fixed bottom-0 right-0 z-20 pointer-events-none">
        <div className="relative h-[340px] w-[310px] sm:h-[500px] sm:w-[460px] lg:h-[640px] lg:w-[560px] drop-shadow-[0_10px_35px_rgba(0,0,0,0.6)] filter brightness-[1.05]">
          <Image
            src="/modi_transparent.png"
            alt="Shri Narendra Modi Ji"
            fill
            className="object-contain object-right-bottom"
            priority
          />
        </div>
      </div>
      <div className="fixed bottom-2 right-4 z-40 pointer-events-auto rounded-full border-2 border-amber-400 bg-slate-950/95 px-6 py-2.5 text-white shadow-[0_0_30px_rgba(251,191,36,0.5)] backdrop-blur-md text-right">
        <h4 className="text-sm font-black tracking-wide text-amber-300 md:text-base">
          Shri Narendra Modi Ji
        </h4>
        <p className="text-[11px] font-extrabold text-amber-200 md:text-xs">
          Hon&apos;ble Prime Minister of India
        </p>
      </div>
    </div>
  );
}
