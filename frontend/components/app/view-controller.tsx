'use client';

import { useEffect, useRef } from 'react';
import { useSessionContext, useSessionMessages, useAgent } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { KisanLightDashboard } from '@/components/app/kisan-light-dashboard';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';

interface ViewControllerProps {
  appConfig: AppConfig;
}

function LiveTranscriptPanel() {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { state: agentState } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, agentState]);

  return (
    <div
      ref={scrollRef}
      className="mb-3 flex max-h-60 min-h-[160px] w-full flex-col gap-2.5 overflow-y-auto rounded-2xl border border-emerald-500/40 bg-slate-950/90 p-4 shadow-inner backdrop-blur-md [scrollbar-width:thin]"
    >
      {messages.length === 0 ? (
        <div className="flex h-full min-h-[120px] items-center justify-center text-center text-sm font-semibold text-emerald-400 animate-pulse">
          🌾 Kisan Vaani is listening... Ask your farming query! (किसान वाणी आपकी बात सुन रहे हैं)
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.from?.isLocal;
          return (
            <div
              key={msg.id}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm font-medium shadow-md transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-br-none border border-emerald-400/40'
                    : 'bg-slate-900/95 text-amber-100 border border-amber-500/40 rounded-bl-none shadow-amber-900/20'
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isUser ? 'text-emerald-200' : 'text-amber-400'}`}>
                  {isUser ? '👨‍🌾 You (आप)' : '🌾 Kisan Vaani AI (किसान वाणी)'}
                </div>
                <div className="leading-relaxed font-sans text-base">{msg.message}</div>
              </div>
            </div>
          );
        })
      )}
      {agentState === 'thinking' && (
        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold px-2 py-1">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          Kisan Vaani is thinking... (सोच रहे हैं...)
        </div>
      )}
    </div>
  );
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start, session, disconnect } = useSessionContext();

  const handleStartInbound = () => {
    start();
  };

  const handleStartOutbound = () => {
    start({ call_type: 'outbound' });
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Primary Cover Dashboard & Landing */}
      <KisanLightDashboard onStartCall={handleStartInbound} onStartOutboundCall={handleStartOutbound} />

      {/* Active Day 1 Floating Session Control Bar with Live Transcript */}
      {isConnected && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-emerald-400/80 bg-slate-950/95 p-4 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-xl transition-all duration-300">
            {/* Live Chat & Voice Transcript Panel */}
            <LiveTranscriptPanel />

            {/* Bottom Control Bar */}
            <AgentControlBar
              variant="livekit"
              controls={{
                leave: true,
                microphone: true,
                chat: appConfig.supportsChatInput,
                camera: appConfig.supportsVideoInput,
                screenShare: appConfig.supportsScreenShare,
              }}
              isConnected={isConnected}
              onDisconnect={disconnect || session?.end}
            />
          </div>
        </div>
      )}
    </div>
  );
}
