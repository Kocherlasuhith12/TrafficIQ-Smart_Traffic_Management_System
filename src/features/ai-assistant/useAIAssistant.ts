/**
 * useAIAssistant.ts
 * TrafficIQ Phase 4 — AI Assistant Hook
 *
 * Manages:
 * - Chat message history
 * - Web Speech API (voice input)
 * - SpeechSynthesis (voice output)
 * - Command dispatch callbacks
 * - Incident voice alerts integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationState } from '@/hooks/useTrafficSimulation';
import { generateAIResponse, CommandAction } from './aiEngine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  action?: CommandAction;
}

export interface AssistantState {
  messages: ChatMessage[];
  isListening: boolean;
  isSpeaking: boolean;
  isOpen: boolean;
  voiceEnabled: boolean;
  micAvailable: boolean;
  interimText: string;
  isThinking: boolean;
}

export interface AssistantActions {
  sendMessage: (text: string) => void;
  toggleMic: () => void;
  toggleOpen: () => void;
  toggleVoice: () => void;
  clearHistory: () => void;
  handleCommand: (action: CommandAction) => void;
}

// ── Voice synthesis helper ─────────────────────────────────────────────────────
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function speakText(text: string, onEnd?: () => void) {
  if (!synth) return;
  synth.cancel();
  // Strip markdown formatting for voice
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/[•🚗📊🎥🚨⚠️✅🗺️⚡🔴🟠🟢🔇🔊⏸▶🛑💥🔥💨🌊🦌🚦]/gu, '');
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.08;
  utt.pitch = 1.0;
  utt.volume = 0.95;
  // Prefer a slightly more robotic/professional voice if available
  const voices = synth.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;
  utt.onend = () => onEnd?.();
  synth.speak(utt);
}

// ── SpeechRecognition availability check ──────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAIAssistant(
  simState: SimulationState,
  onCommand?: (action: CommandAction) => void
): [AssistantState, AssistantActions] {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "👋 Hello, Operator! I'm **TrafficIQ AI** — your intelligent traffic command assistant.\n\nI can answer questions about traffic, detect incidents, open junctions, and control the dashboard. Just speak or type your command.\n\nTry: *\"Which junction is busiest?\"* or *\"Traffic status\"*.",
      timestamp: Date.now(),
      action: { type: 'NONE' },
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const prevAnomalyCountRef = useRef(0);
  const seenAlertIds = useRef<Set<string>>(new Set(['welcome']));

  // Mic availability
  const micAvailable = !!SpeechRecognitionAPI;

  // ── Incident Voice Alert (separate from user chat) ─────────────────────────
  useEffect(() => {
    if (!voiceEnabled) return;
    const critical = simState.anomalies.filter(
      a => !a.resolved && a.severity === 'critical' && !seenAlertIds.current.has(a.id)
    );
    if (critical.length > 0 && !isSpeaking) {
      const latest = critical[critical.length - 1];
      seenAlertIds.current.add(latest.id);
      setIsSpeaking(true);
      speakText(`Traffic Alert: ${latest.description}`, () => setIsSpeaking(false));
    }
    prevAnomalyCountRef.current = simState.anomalies.length;
  }, [simState.anomalies, voiceEnabled, isSpeaking]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    // Generate AI response
    setTimeout(() => {
      const aiResp = generateAIResponse(text, simState);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: aiResp.text,
        timestamp: Date.now(),
        action: aiResp.action,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);

      // Speak response
      if (voiceEnabled) {
        setIsSpeaking(true);
        speakText(aiResp.text, () => setIsSpeaking(false));
      }

      // Execute dashboard command
      if (aiResp.action.type !== 'NONE') {
        onCommand?.(aiResp.action);
      }
    }, 750);
  }, [simState, voiceEnabled, onCommand]);

  // ── Mic Toggle ────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimText('');
      return;
    }

    const rec = new SpeechRecognitionAPI();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => setIsListening(true);
    rec.onend = () => {
      setIsListening(false);
      setInterimText('');
    };
    rec.onerror = () => {
      setIsListening(false);
      setInterimText('');
    };
    rec.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      setInterimText(interim);
      if (final) {
        setInterimText('');
        sendMessage(final);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [isListening, sendMessage]);

  // ── Other actions ─────────────────────────────────────────────────────────
  const toggleOpen = useCallback(() => setIsOpen(v => !v), []);
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => {
      if (v) synth?.cancel();
      return !v;
    });
  }, []);
  const clearHistory = useCallback(() => setMessages([]), []);
  const handleCommand = useCallback((action: CommandAction) => {
    onCommand?.(action);
  }, [onCommand]);

  return [
    { messages, isListening, isSpeaking, isOpen, voiceEnabled, micAvailable, interimText, isThinking },
    { sendMessage, toggleMic, toggleOpen, toggleVoice, clearHistory, handleCommand },
  ];
}
