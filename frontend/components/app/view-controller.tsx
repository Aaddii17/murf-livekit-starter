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
      {/* Primary Light-Theme Agricultural Dashboard & Landing */}
      <KisanLightDashboard onStartCall={start} />

      {/* Active Session View Overlay (Text Chat, Live Transcript, Audio Waveform & Controls) when connected */}
      {isConnected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/80 p-4 backdrop-blur-md md:p-8">
          <AgentSessionView_01
            supportsChatInput={appConfig.supportsChatInput}
            supportsVideoInput={appConfig.supportsVideoInput}
            supportsScreenShare={appConfig.supportsScreenShare}
            isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
            audioVisualizerType="bar"
            audioVisualizerColor="#10b981"
            audioVisualizerBarCount={7}
            className="h-full w-full max-w-5xl mx-auto"
          />
        </div>
      )}
    </div>
  );
}
