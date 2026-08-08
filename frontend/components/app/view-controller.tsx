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

      {/* Active Session Audio Visualizer & Control Layer when connected */}
      {isConnected && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-3xl border border-emerald-300/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md max-w-lg w-full mx-4">
            <AgentSessionView_01
              supportsChatInput={appConfig.supportsChatInput}
              supportsVideoInput={appConfig.supportsVideoInput}
              supportsScreenShare={appConfig.supportsScreenShare}
              isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
              audioVisualizerType="bar"
              audioVisualizerColor="#059669"
              audioVisualizerBarCount={5}
            />
          </div>
        </div>
      )}
    </div>
  );
}
