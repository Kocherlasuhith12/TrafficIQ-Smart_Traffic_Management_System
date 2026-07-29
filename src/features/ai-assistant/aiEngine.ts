/**
 * aiEngine.ts
 * TrafficIQ Phase 4 — AI NLU + Response Engine
 *
 * Pure TypeScript, zero API dependency.
 * Detects intent from natural language, reads live simulation context,
 * and returns a smart contextual response + optional dashboard command.
 */

import { SimulationState } from '@/hooks/useTrafficSimulation';

// ── Intent Types ──────────────────────────────────────────────────────────────
export type CommandAction =
  | { type: 'OPEN_JUNCTION'; junctionId: string; junctionName: string }
  | { type: 'SHOW_CAMERAS' }
  | { type: 'MUTE_ALERTS' }
  | { type: 'UNMUTE_ALERTS' }
  | { type: 'EMERGENCY_MODE' }
  | { type: 'SHOW_INCIDENTS' }
  | { type: 'SHOW_ANALYTICS' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESUME_SIMULATION' }
  | { type: 'NONE' };

export interface AIResponse {
  text: string;
  action: CommandAction;
  confidence: number;
}

// ── Keyword Maps ──────────────────────────────────────────────────────────────
const JUNCTION_KEYWORDS = ['junction', 'intersection', 'open', 'navigate to', 'go to', 'show'];
const CAMERA_KEYWORDS = ['camera', 'cameras', 'video feed', 'live feed', 'show cameras', 'cctv'];
const INCIDENT_KEYWORDS = ['incident', 'incidents', 'accident', 'alert', 'emergency', 'collision', 'crash'];
const CONGESTION_KEYWORDS = ['congestion', 'traffic', 'busy', 'jam', 'blocked', 'heavy'];
const SPEED_KEYWORDS = ['speed', 'fast', 'slow', 'velocity', 'km/h'];
const COUNT_KEYWORDS = ['count', 'how many', 'total', 'vehicles', 'cars'];
const MUTE_KEYWORDS = ['mute', 'silence', 'quiet', 'stop speaking', 'turn off voice', 'disable alerts'];
const UNMUTE_KEYWORDS = ['unmute', 'enable voice', 'turn on voice', 'speak again', 'sound on'];
const EMERGENCY_KEYWORDS = ['emergency mode', 'activate emergency', 'emergency override'];
const PAUSE_KEYWORDS = ['pause', 'stop simulation', 'halt'];
const RESUME_KEYWORDS = ['resume', 'start simulation', 'continue', 'play'];
const ANALYTICS_KEYWORDS = ['analytics', 'analysis', 'stats', 'statistics', 'chart', 'trends', 'heatmap'];
const STATUS_KEYWORDS = ['status', 'overview', 'summary', 'how is', 'how are', 'report'];
// Phase 6
const WEATHER_KEYWORDS = ['weather', 'rain', 'fog', 'snow', 'night', 'dust', 'climate', 'conditions', 'signal timing'];
const CORRIDOR_KEYWORDS = ['green corridor', 'ambulance corridor', 'emergency corridor', 'clear path', 'priority route'];
const ANPR_KEYWORDS = ['anpr', 'number plate', 'plate recognition', 'license plate', 'vehicle plate', 'plates'];
const CITIZEN_KEYWORDS = ['citizen', 'report', 'citizen app', 'public report', 'submit incident'];
const AGENTS_KEYWORDS = ['ai agents', 'multi agent', 'agents', 'vision agent', 'decision agent', 'pipeline'];
const SMARTCITY_KEYWORDS = ['smart city', 'phase 6', 'city platform', 'camera grid', 'multi camera'];

// ── Junction number extractor ─────────────────────────────────────────────────
const extractJunctionNumber = (text: string): number | null => {
  const m = text.match(/(?:junction|intersection)?\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
};

const containsAny = (text: string, keywords: string[]): boolean =>
  keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));

// ── Greetings ─────────────────────────────────────────────────────────────────
const GREETINGS = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings', 'what\'s up'];
const HELP_KEYWORDS = ['help', 'what can you do', 'commands', 'capabilities', 'assist'];

// ── Main Response Generator ───────────────────────────────────────────────────
export function generateAIResponse(
  rawInput: string,
  simState: SimulationState
): AIResponse {
  const input = rawInput.trim().toLowerCase();
  const {
    intersections,
    anomalies,
    averageSpeed,
    detections,
    junctionSummaries,
    metrics,
    emergencyActive,
    isRunning,
    currentPattern,
    vehicleDistribution,
  } = simState;

  // ── Greeting ──────────────────────────────────────────────────────────────
  if (containsAny(input, GREETINGS) && input.split(' ').length < 4) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const activeIncidents = anomalies.filter(a => !a.resolved && ['critical', 'high'].includes(a.severity)).length;
    return {
      text: `${greeting}, Operator! TrafficIQ is ${isRunning ? 'actively monitoring' : 'paused'}. ${
        activeIncidents > 0
          ? `⚠️ There are ${activeIncidents} high-priority incidents requiring attention.`
          : '✅ All systems nominal.'
      } How can I assist you?`,
      action: { type: 'NONE' },
      confidence: 1.0,
    };
  }

  // ── Help ──────────────────────────────────────────────────────────────────
  if (containsAny(input, HELP_KEYWORDS)) {
    return {
      text: `I can help you with:\n\n` +
        `🗺️ **Navigation** — "Open Junction 4", "Show Cameras", "Show Incidents"\n` +
        `📊 **Data Queries** — "Which junction is busiest?", "How many vehicles?", "What's the speed?"\n` +
        `🚦 **Traffic Status** — "Traffic status", "Any accidents?", "Congestion level"\n` +
        `⚙️ **Control** — "Emergency Mode", "Pause", "Resume", "Mute Alerts"\n` +
        `🏙️ **Smart City** — "Green corridor", "Weather status", "Show ANPR", "AI agents", "Camera grid"\n\n` +
        `Just speak or type your command!`,
      action: { type: 'NONE' },
      confidence: 1.0,
    };
  }

  // ── Show all accidents today (Phase 10) ───────────────────────────────────
  if (input.includes('accidents today') || input.includes('show all accidents') || input.includes('list accidents')) {
    const accidentsList = anomalies.filter(a => !a.resolved && (a.type === 'accident' || a.type === 'vehicle_collision' || a.type === 'collision'));
    if (accidentsList.length > 0) {
      const descriptions = accidentsList.map(a => `• **${a.description}** at ${a.location || a.laneId}`).join('\n');
      return {
        text: `🚗💥 **Accidents Logged Today:**\n\n${descriptions}\n\nI have highlighted the Incident timeline for you.`,
        action: { type: 'SHOW_INCIDENTS' },
        confidence: 0.98,
      };
    } else {
      return {
        text: `✅ There are no active accidents or vehicle collisions reported today. All lanes are operating normally.`,
        action: { type: 'SHOW_INCIDENTS' },
        confidence: 0.98,
      };
    }
  }

  // ── Why is Junction X congested? (Phase 10) ───────────────────────────────────
  if (input.includes('why is') && (input.includes('congested') || input.includes('jammed') || input.includes('busy') || input.includes('heavy'))) {
    const jNum = extractJunctionNumber(input);
    if (jNum !== null) {
      const junction = intersections.find((j, idx) => j.id === `junction-${jNum}` || idx + 1 === jNum);
      if (junction) {
        const summary = junctionSummaries.find(s => s.id === junction.id);
        const jIncidents = anomalies.filter(a => !a.resolved && a.laneId.toLowerCase().includes(junction.id.replace('junction-', '').toLowerCase()));
        
        let reason = '';
        if (jIncidents.length > 0) {
          reason = `due to an active **${jIncidents[0].type.replace(/_/g, ' ')}** (${jIncidents[0].description})`;
        } else if (summary && summary.congestionLevel > 60) {
          reason = `due to high vehicle inflow (${summary.totalVehicles} vehicles) exceeding normal capacity limits`;
        } else {
          reason = `due to standard peak hour traffic distribution and signal timing gaps`;
        }

        // Generate recommendations (Phase 10 recommendations requirement)
        let recommendation = '';
        if (jIncidents.length > 0) {
          recommendation = `\n\n💡 **AI Recommendation:** Trigger **Emergency Override** to clear lanes for emergency access, or dispatch a diversion notice to **Divert Traffic** around the incident spot.`;
        } else {
          recommendation = `\n\n💡 **AI Recommendation:** Increase **Green Time** multiplier for the congested lanes by 15 seconds, or activate **Adaptive Signal Optimization**.`;
        }

        return {
          text: `🔍 **Junction ${jNum} Congestion Analysis:**\n\n` +
            `Current congestion level is at **${summary?.congestionLevel || 40}%** ${reason}.${recommendation}`,
          action: { type: 'OPEN_JUNCTION', junctionId: junction.id, junctionName: junction.name },
          confidence: 0.98,
        };
      }
    }
  }

  // ── AI Recommendations General (Phase 10) ───────────────────────────────────
  const RECOMMENDATION_KEYWORDS = ['recommendation', 'recommend', 'how to solve', 'optimize', 'reduce congestion', 'divert', 'what should i do'];
  if (containsAny(input, RECOMMENDATION_KEYWORDS)) {
    const worstJunction = [...junctionSummaries].sort((a, b) => b.congestionLevel - a.congestionLevel)[0];
    const activeAccidents = anomalies.filter(a => !a.resolved && (a.type === 'accident' || a.type === 'vehicle_collision'));
    
    let text = `💡 **TrafficIQ AI Real-Time Decision Recommendations:**\n\n`;
    if (activeAccidents.length > 0) {
      text += `1. 🚨 **Emergency Override:** Active accident detected at ${activeAccidents[0].location || activeAccidents[0].laneId}. Hold non-priority signals red.\n` +
              `2. 🔀 **Divert Traffic:** Broadcast route detour alerts via the Citizen App to bypass the collision area.\n` +
              `3. 🛠️ **Clear Lane:** Request immediate dispatch for cleanup/salvage teams to resolve the blockage.\n`;
    } else if (worstJunction && worstJunction.congestionLevel > 50) {
      text += `1. 🟢 **Increase Green Time:** Grant +20% green timing to clearing lanes at **${worstJunction.name}**.\n` +
              `2. 🔄 **Activate Adaptive Loops:** Enable dynamic loop tuning to dynamically bleed queue levels.\n` +
              `3. 🚦 **Reduce Congestion:** Adjust lights along adjacent pathways to meter the inflow rate.\n`;
    } else {
      text += `1. ☀️ **Maintain Default Loops:** Traffic flow is nominal across all 6 junctions.\n` +
              `2. 🌦️ **Weather Adaptation:** Monitoring signals in case precipitation triggers wet road modifiers.\n`;
    }
    
    return {
      text,
      action: { type: 'NONE' },
      confidence: 0.98,
    };
  }

  // ── Mute / Unmute ─────────────────────────────────────────────────────────
  if (containsAny(input, UNMUTE_KEYWORDS)) {
    return {
      text: '🔊 Voice alerts re-enabled. I will announce all critical incidents aloud.',
      action: { type: 'UNMUTE_ALERTS' },
      confidence: 0.95,
    };
  }
  if (containsAny(input, MUTE_KEYWORDS)) {
    return {
      text: '🔇 Voice alerts muted. You can still see incidents in the timeline. Say "unmute" to re-enable.',
      action: { type: 'MUTE_ALERTS' },
      confidence: 0.95,
    };
  }

  // ── Emergency Mode ────────────────────────────────────────────────────────
  if (containsAny(input, EMERGENCY_KEYWORDS)) {
    return {
      text: emergencyActive
        ? '🚨 Emergency override is already ACTIVE. All non-emergency signals are held red.'
        : '🚨 Activating Emergency Override! Clearing all junction pathways for emergency vehicles.',
      action: { type: 'EMERGENCY_MODE' },
      confidence: 0.98,
    };
  }

  // ── Pause / Resume ────────────────────────────────────────────────────────
  if (containsAny(input, PAUSE_KEYWORDS)) {
    return {
      text: isRunning
        ? '⏸ Pausing simulation. Live monitoring has been suspended.'
        : '⏸ Simulation is already paused.',
      action: { type: 'PAUSE_SIMULATION' },
      confidence: 0.9,
    };
  }
  if (containsAny(input, RESUME_KEYWORDS)) {
    return {
      text: !isRunning
        ? '▶ Resuming simulation. All traffic models are now live.'
        : '▶ Simulation is already running.',
      action: { type: 'RESUME_SIMULATION' },
      confidence: 0.9,
    };
  }

  // ── Show Cameras ──────────────────────────────────────────────────────────
  if (containsAny(input, CAMERA_KEYWORDS)) {
    return {
      text: '🎥 Scrolling to Camera Manager. You can add webcam, USB, IP, RTSP, or video upload sources.',
      action: { type: 'SHOW_CAMERAS' },
      confidence: 0.9,
    };
  }

  // ── Show Incidents ────────────────────────────────────────────────────────
  const isIncidentQuery = containsAny(input, INCIDENT_KEYWORDS);
  if (
    isIncidentQuery &&
    (input.includes('show') || input.includes('open') || input.includes('timeline'))
  ) {
    const activeCount = anomalies.filter(a => !a.resolved).length;
    return {
      text: `🚨 Scrolling to Incident Timeline. There are currently ${activeCount} unresolved incident${activeCount !== 1 ? 's' : ''}.`,
      action: { type: 'SHOW_INCIDENTS' },
      confidence: 0.9,
    };
  }

  // ── Show Analytics ────────────────────────────────────────────────────────
  if (containsAny(input, ANALYTICS_KEYWORDS)) {
    return {
      text: '📊 Scrolling to the Analytics dashboard. You\'ll find traffic trends, heatmaps, congestion scores, and lane density.',
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.85,
    };
  }

  // ── Open Junction N ───────────────────────────────────────────────────────
  if (
    containsAny(input, ['junction', 'intersection']) &&
    containsAny(input, ['open', 'go to', 'show', 'navigate', 'switch to'])
  ) {
    const jNum = extractJunctionNumber(input);
    if (jNum !== null) {
      const junction = intersections.find(
        (j, idx) => j.id === `junction-${jNum}` || idx + 1 === jNum
      );
      if (junction) {
        const summary = junctionSummaries.find(s => s.id === junction.id);
        return {
          text: `🗺️ Opening Junction ${jNum} — ${junction.name}. ${
            summary
              ? `Currently: ${summary.vehicleCount} vehicles, congestion at ${summary.congestionLevel}%.`
              : 'Navigating now.'
          }`,
          action: { type: 'OPEN_JUNCTION', junctionId: junction.id, junctionName: junction.name },
          confidence: 0.95,
        };
      } else {
        return {
          text: `⚠️ Junction ${jNum} not found. We have ${intersections.length} active junctions (1–${intersections.length}).`,
          action: { type: 'NONE' },
          confidence: 0.8,
        };
      }
    }
  }

  // ── Which junction is busiest? ─────────────────────────────────────────────
  if (
    containsAny(input, ['busiest', 'most traffic', 'highest traffic', 'most congested', 'worst junction'])
  ) {
    const busiest = [...junctionSummaries].sort((a, b) => b.vehicleCount - a.vehicleCount)[0];
    if (busiest) {
      return {
        text: `📍 The busiest junction right now is **${busiest.name}** with ${busiest.vehicleCount} vehicles and a congestion level of ${busiest.congestionLevel}%.`,
        action: { type: 'OPEN_JUNCTION', junctionId: busiest.id, junctionName: busiest.name },
        confidence: 0.95,
      };
    }
  }

  // ── Total vehicle count ────────────────────────────────────────────────────
  if (containsAny(input, COUNT_KEYWORDS)) {
    const total = junctionSummaries.reduce((s, j) => s + j.vehicleCount, 0);
    const cars = vehicleDistribution['car'] || 0;
    const trucks = vehicleDistribution['truck'] || 0;
    return {
      text: `🚗 Total vehicles monitored: **${total}** across ${intersections.length} junctions. Breakdown: ${cars} cars, ${trucks} trucks, ${detections.length} live detections from AI camera.`,
      action: { type: 'NONE' },
      confidence: 0.9,
    };
  }

  // ── Speed query ────────────────────────────────────────────────────────────
  if (containsAny(input, SPEED_KEYWORDS)) {
    return {
      text: `⚡ Average vehicle speed across all lanes: **${averageSpeed.toFixed(1)} km/h**. ${
        averageSpeed > 40
          ? 'Traffic is flowing freely.'
          : averageSpeed > 20
          ? 'Traffic is moving at moderate pace.'
          : 'Traffic is slow — possible congestion or incident.'
      }`,
      action: { type: 'NONE' },
      confidence: 0.9,
    };
  }

  // ── Congestion query ───────────────────────────────────────────────────────
  if (containsAny(input, CONGESTION_KEYWORDS) && !containsAny(input, ['status', 'report'])) {
    const avgCongestion =
      junctionSummaries.reduce((s, j) => s + j.congestionLevel, 0) /
      Math.max(junctionSummaries.length, 1);
    const worstJunction = [...junctionSummaries].sort((a, b) => b.congestionLevel - a.congestionLevel)[0];
    const label = avgCongestion > 70 ? '🔴 Heavy' : avgCongestion > 45 ? '🟠 Moderate' : '🟢 Light';
    return {
      text: `${label} — Average congestion: **${avgCongestion.toFixed(0)}%**. ${
        worstJunction ? `Worst affected: ${worstJunction.name} at ${worstJunction.congestionLevel}%.` : ''
      }`,
      action: { type: 'NONE' },
      confidence: 0.9,
    };
  }

  // ── Incident / accident query ──────────────────────────────────────────────
  if (isIncidentQuery) {
    const active = anomalies.filter(a => !a.resolved);
    const critical = active.filter(a => a.severity === 'critical');
    if (critical.length > 0) {
      const latest = critical[critical.length - 1];
      return {
        text: `🚨 **${critical.length} critical incident${critical.length > 1 ? 's' : ''}** active. Latest: ${latest.description} (${latest.laneId}). Open the Incident Timeline for full details.`,
        action: { type: 'SHOW_INCIDENTS' },
        confidence: 0.95,
      };
    } else if (active.length > 0) {
      return {
        text: `⚠️ ${active.length} active incident${active.length > 1 ? 's' : ''}, none critical. Latest: ${active[active.length - 1]?.description || 'Unknown.'}`,
        action: { type: 'SHOW_INCIDENTS' },
        confidence: 0.9,
      };
    } else {
      return {
        text: '✅ No active incidents detected. All roads are clear.',
        action: { type: 'NONE' },
        confidence: 0.9,
      };
    }
  }

  // ── Status / Overview ─────────────────────────────────────────────────────
  if (containsAny(input, STATUS_KEYWORDS)) {
    const totalVehicles = junctionSummaries.reduce((s, j) => s + j.vehicleCount, 0);
    const avgCongestion = junctionSummaries.reduce((s, j) => s + j.congestionLevel, 0) / Math.max(junctionSummaries.length, 1);
    const activeIncidents = anomalies.filter(a => !a.resolved).length;
    const patternLabel = currentPattern?.name || 'Normal Flow';
    return {
      text: `📊 **TrafficIQ System Report**\n\n` +
        `• Junctions: ${intersections.length} active\n` +
        `• Vehicles detected: ${totalVehicles}\n` +
        `• Avg speed: ${averageSpeed.toFixed(1)} km/h\n` +
        `• Avg congestion: ${avgCongestion.toFixed(0)}%\n` +
        `• Active incidents: ${activeIncidents}\n` +
        `• Current pattern: ${patternLabel}\n` +
        `• Simulation: ${isRunning ? '🟢 Running' : '🔴 Paused'}\n` +
        `• Emergency: ${emergencyActive ? '🚨 ACTIVE' : '✅ Normal'}`,
      action: { type: 'NONE' },
      confidence: 1.0,
    };
  }

  // ── Phase 6: Weather ──────────────────────────────────────────────────────
  if (containsAny(input, WEATHER_KEYWORDS)) {
    const w = (simState as any).weatherCondition || 'clear';
    const multipliers: Record<string, string> = { clear: '1.0×', rain: '1.25×', fog: '1.35×', night: '1.15×', snow: '1.5×', dust: '1.2×' };
    return {
      text: `🌦️ Current weather condition: **${w.toUpperCase()}**. Signal green time multiplier: **${multipliers[w] || '1.0×'}**. Change conditions in the Smart City → Weather tab.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.9,
    };
  }

  // ── Phase 6: Green Corridor ───────────────────────────────────────────────
  if (containsAny(input, CORRIDOR_KEYWORDS)) {
    return {
      text: `🚑 Emergency Green Corridor ${emergencyActive ? 'is **ACTIVE** — all signals cleared for emergency vehicle' : 'is on standby. It auto-activates when an ambulance or fire truck is detected'}. Open Smart City → Green Corridor tab to demo or monitor.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.9,
    };
  }

  // ── Phase 6: ANPR ─────────────────────────────────────────────────────────
  if (containsAny(input, ANPR_KEYWORDS)) {
    const total = detections.length;
    return {
      text: `📷 **ANPR System Active** — ${total} vehicle plates logged from live camera feed. Search, filter, and export logs in the Smart City → ANPR tab.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.9,
    };
  }

  // ── Phase 6: Citizen App ──────────────────────────────────────────────────
  if (containsAny(input, CITIZEN_KEYWORDS)) {
    return {
      text: `📱 **Citizen App** allows the public to report accidents, upload photos, get live alerts, and see alternate routes. Access it in Smart City → Citizen App tab.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.85,
    };
  }

  // ── Phase 6: AI Agents ────────────────────────────────────────────────────
  if (containsAny(input, AGENTS_KEYWORDS)) {
    return {
      text: `🤖 **6 Autonomous AI Agents** are running:\n\n• Vision Agent — tracking objects\n• Analytics Agent — analysing flow\n• Prediction Agent — forecasting traffic\n• Decision Agent — adapting signals\n• Voice Agent — speaking alerts\n• Report Agent — logging events\n\nView live pipeline in Smart City → AI Agents tab.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.9,
    };
  }

  // ── Phase 6: Smart City / Camera Grid ────────────────────────────────────
  if (containsAny(input, SMARTCITY_KEYWORDS)) {
    return {
      text: `🏙️ **Smart City Platform** is active with 100+ camera support, ANPR, weather intelligence, green corridor routing, citizen reporting, and a 6-agent AI pipeline. Scroll to the Smart City Hub section below the Analytics panel.`,
      action: { type: 'SHOW_ANALYTICS' },
      confidence: 0.9,
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  const totalVehicles = junctionSummaries.reduce((s, j) => s + j.vehicleCount, 0);
  return {
    text: `I'm not sure I understood "${rawInput}". Here's the current system state:\n\n` +
      `🚗 ${totalVehicles} vehicles across ${intersections.length} junctions — ` +
      `${anomalies.filter(a => !a.resolved).length} active incidents — ` +
      `avg speed ${averageSpeed.toFixed(1)} km/h.\n\n` +
      `Try: "Which junction is busiest?", "Show cameras", "Traffic status", or "Help".`,
    action: { type: 'NONE' },
    confidence: 0.3,
  };
}
