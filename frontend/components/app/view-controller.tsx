'use client';

import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { KisanLightDashboard } from '@/components/app/kisan-light-dashboard';
import { AgentSessionView_01 } from '@/components/agents-ui/blocks/agent-session-view-01';

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();

  return (
    <div className="relative min-h-screen w-full">
      {/* Primary Cover Dashboard & Landing */}
      <KisanLightDashboard onStartCall={start} />

      {/* Active Day 1 Floating Session Control Bar (Chat Text Input, Live Transcripts & Controls) */}
      {isConnected && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-emerald-400/80 bg-slate-950/95 p-4 shadow-[0_0_35px_rgba(16,185,129,0.3)] backdrop-blur-xl transition-all duration-300">
            <AgentSessionView_01
              initialChatOpen={true}
              supportsChatInput={appConfig.supportsChatInput}
              supportsVideoInput={appConfig.supportsVideoInput}
              supportsScreenShare={appConfig.supportsScreenShare}
              isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
              audioVisualizerType="bar"
              audioVisualizerColor="#10b981"
              audioVisualizerBarCount={7}
              className="h-[460px] w-full rounded-2xl bg-slate-900/60"
            />
          </div>
        </div>
      )}
    </div>
  );
}
