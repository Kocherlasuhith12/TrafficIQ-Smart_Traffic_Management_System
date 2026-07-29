/**
 * AIAssistant.tsx
 * TrafficIQ Phase 4 — AI Voice & Chat Interface
 *
 * Premium ChatGPT-style floating panel with:
 * - Animated AI orb button (bottom-right FAB)
 * - Voice mic with live waveform
 * - Message bubbles with markdown-like rendering
 * - Quick command chips
 * - Voice output indicator
 */

import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useAIAssistant } from './useAIAssistant';
import { SimulationState } from '@/hooks/useTrafficSimulation';
import { CommandAction } from './aiEngine';

interface AIAssistantProps {
  simState: SimulationState;
  onCommand: (action: CommandAction) => void;
}

// ── Markdown-lite renderer ─────────────────────────────────────────────────────
const renderText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} className="font-bold text-foreground">{part}</strong>
        : <span key={j}>{part}</span>
    );
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
};

// ── Quick command chips ────────────────────────────────────────────────────────
const QUICK_COMMANDS = [
  { label: '📊 Traffic Status', cmd: 'Traffic status' },
  { label: '🏙️ Busiest Junction', cmd: 'Which junction is busiest?' },
  { label: '🚨 Any Accidents?', cmd: 'Any accidents?' },
  { label: '🚗 Vehicle Count', cmd: 'How many vehicles?' },
  { label: '⚡ Speed', cmd: "What's the average speed?" },
  { label: '🚧 Congestion', cmd: 'What is the congestion level?' },
  { label: '🎥 Show Cameras', cmd: 'Show cameras' },
  { label: '📋 Show Incidents', cmd: 'Show incidents' },
  { label: '🚨 Emergency Mode', cmd: 'Activate emergency mode' },
  { label: '❓ Help', cmd: 'Help' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
const AIAssistant: React.FC<AIAssistantProps> = ({ simState, onCommand }) => {
  const [state, actions] = useAIAssistant(simState, onCommand);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    actions.sendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChip = (cmd: string) => {
    actions.sendMessage(cmd);
    inputRef.current?.focus();
  };

  // Active incident count for FAB badge
  const criticalCount = simState.anomalies.filter(
    a => !a.resolved && a.severity === 'critical'
  ).length;

  return (
    <>
      {/* ── Floating Action Button (FAB) ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Incident badge */}
        {criticalCount > 0 && !state.isOpen && (
          <div className="animate-bounce bg-[#ef4444] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            {criticalCount} CRITICAL
          </div>
        )}

        {/* AI Orb Button */}
        <button
          id="ai-assistant-toggle"
          onClick={actions.toggleOpen}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            state.isOpen
              ? 'bg-[#ef4444] hover:bg-[#dc2626] rotate-45'
              : 'bg-gradient-to-br from-[#f97316] via-[#ef4444] to-[#8b5cf6] hover:scale-105'
          }`}
          title="Toggle AI Assistant"
          aria-label="Toggle AI Assistant"
        >
          {/* Pulsing ring */}
          {!state.isOpen && (
            <>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f97316] to-[#8b5cf6] animate-ping opacity-20" />
              {state.isSpeaking && (
                <div className="absolute inset-0 rounded-full border-2 border-[#22c55e] animate-ping" />
              )}
            </>
          )}
          <span className="text-xl leading-none text-white relative z-10">
            {state.isOpen ? '✕' : '🤖'}
          </span>
        </button>
      </div>

      {/* ── Chat Panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex flex-col w-[400px] max-w-[calc(100vw-2rem)] rounded-2xl glass-card overflow-hidden transition-all duration-300 origin-bottom-right ${
          state.isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{ height: '580px' }}
        aria-hidden={!state.isOpen}
      >
        {/* ── Panel Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#f97316]/10 via-transparent to-[#8b5cf6]/10 flex-shrink-0">
          {/* Animated AI avatar */}
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#f97316] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
            <span className="text-base">🤖</span>
            {state.isSpeaking && (
              <div className="absolute inset-0 rounded-full border-2 border-[#22c55e] animate-ping" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none">TrafficIQ AI</p>
            <p className="text-[10px] text-[#f97316] font-mono mt-0.5">
              {state.isListening
                ? '🎙 Listening...'
                : state.isSpeaking
                ? '🔊 Speaking...'
                : '● Online — AI Command Centre'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Voice toggle */}
            <button
              onClick={actions.toggleVoice}
              title={state.voiceEnabled ? 'Mute voice' : 'Enable voice'}
              className={`text-[10px] px-2 py-1 rounded-full border font-bold transition-all ${
                state.voiceEnabled
                  ? 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              {state.voiceEnabled ? '🔊' : '🔇'}
            </button>
            {/* Clear history */}
            <button
              onClick={actions.clearHistory}
              title="Clear history"
              className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              🗑
            </button>
            {/* Close */}
            <button
              onClick={actions.toggleOpen}
              className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
          {state.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f97316] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">🤖</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">👤</span>
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-white rounded-tr-sm'
                    : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm'
                }`}
              >
                {renderText(msg.text)}
                <p className="text-[9px] text-white/30 mt-1.5 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* AI Thinking Animation */}
          {state.isThinking && (
            <div className="flex gap-2.5 flex-row">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f97316] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                <span className="text-xs">🤖</span>
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2 bg-white/5 border border-white/10 text-white/90 flex gap-1 items-center h-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] thinking-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] thinking-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] thinking-dot" />
              </div>
            </div>
          )}

          {/* Interim voice text */}
          {state.interimText && (
            <div className="flex flex-row-reverse gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs">👤</span>
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-white/50 text-[12px] italic">
                {state.interimText}...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Commands Chips ── */}
        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0 border-t border-white/5 scrollbar-none">
          {QUICK_COMMANDS.map(({ label, cmd }) => (
            <button
              key={cmd}
              onClick={() => handleChip(cmd)}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#f97316]/15 border border-white/10 hover:border-[#f97316]/40 text-white/60 hover:text-[#f97316] transition-all duration-150 font-medium whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Input Row ── */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-2 flex-shrink-0 border-t border-white/10">
          {/* Mic Button */}
          {state.micAvailable && (
            <button
              id="ai-mic-button"
              onClick={actions.toggleMic}
              title={state.isListening ? 'Stop listening' : 'Start voice input'}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border transition-all duration-200 ${
                state.isListening
                  ? 'bg-[#ef4444]/20 border-[#ef4444]/60 text-[#ef4444]'
                  : 'bg-white/5 border-white/15 text-white/60 hover:bg-[#f97316]/15 hover:border-[#f97316]/40 hover:text-[#f97316]'
              }`}
              aria-label={state.isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {state.isListening ? (
                <>
                  <MicWave />
                  <div className="absolute inset-0 rounded-full border border-[#ef4444] animate-ping opacity-40" />
                </>
              ) : (
                <span className="text-base">🎙</span>
              )}
            </button>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            id="ai-chat-input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state.isListening
                ? '🎙 Listening...'
                : 'Ask me anything about traffic...'
            }
            disabled={state.isListening}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/30 outline-none focus:border-[#f97316]/50 focus:bg-[#f97316]/5 transition-all duration-200"
          />

          {/* Send Button */}
          <button
            id="ai-send-button"
            onClick={handleSend}
            disabled={!inputText.trim() && !state.isListening}
            title="Send message"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f97316] to-[#ef4444] flex items-center justify-center flex-shrink-0 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
            aria-label="Send message"
          >
            <span className="text-white text-sm">➤</span>
          </button>
        </div>
      </div>
    </>
  );
};

// ── Animated Mic Waveform ──────────────────────────────────────────────────────
const MicWave: React.FC = () => (
  <div className="flex items-center gap-[2px] h-4">
    {[0, 60, 120, 180, 240].map((delay, i) => (
      <div
        key={i}
        className="w-[2px] rounded-full bg-[#ef4444]"
        style={{
          animation: `micPulse 0.8s ease-in-out infinite`,
          animationDelay: `${delay}ms`,
          height: `${6 + (i % 3) * 4}px`,
        }}
      />
    ))}
    <style>{`
      @keyframes micPulse {
        0%, 100% { transform: scaleY(0.3); opacity: 0.6; }
        50% { transform: scaleY(1); opacity: 1; }
      }
    `}</style>
  </div>
);

export default AIAssistant;
