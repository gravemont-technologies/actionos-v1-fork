import { logger } from "../server/utils/logger.js";

type EventName = "onboard.complete" | "analyze.response" | "step1.marked_done" | "step1.feedback" | "analyze.follow_up" | "retrospective.complete" | "analyze.micro_nudge_generated" | "analyze.micro_nudge_fallback" | "analyze.follow_up_quality";

type EventPayloadMap = {
  "onboard.complete": { profileId: string; userId: string; tags: string[] };
  "analyze.response": {
    profileId: string;
    signature: string;
    cached: boolean;
    deltaBuckets: string[];
  };
  "step1.marked_done": { profileId: string; signature: string };
  "step1.feedback": { profileId: string; signature: string; slider: number; outcome?: string };
  "analyze.follow_up": { profileId: string; focusArea: string; hasFullContext: boolean };
  "retrospective.complete": { profileId: string; signature: string };
  "analyze.micro_nudge_generated": { profileId: string; nudgeLength: number; usedFallback: boolean };
  "analyze.micro_nudge_fallback": { profileId: string; reason: string; rawLength?: number };
  "analyze.follow_up_quality": { profileId: string; focusArea: string; contextFieldsProvided: number; totalContextFields: number };
};

type LoggedEvent<Name extends EventName = EventName> = {
  name: Name;
  payload: EventPayloadMap[Name];
  timestamp: string;
};

const buffer: LoggedEvent[] = [];

export function trackEvent<Name extends EventName>(name: Name, payload: EventPayloadMap[Name]): void {
  const event: LoggedEvent<Name> = { name, payload, timestamp: new Date().toISOString() };
  buffer.push(event);
  if (buffer.length > 1000) {
    buffer.shift();
  }
  dispatch(event).catch((error) => {
    logger.warn({ error, eventName: event.name }, "Analytics dispatch failed");
  });
}

export function getEventBuffer(): LoggedEvent[] {
  return buffer;
}

async function dispatch(event: LoggedEvent): Promise<void> {
  // Write to Supabase if available
  try {
    const { getSupabaseClient } = await import("../server/db/supabase.js");
    const supabase = getSupabaseClient();
    await supabase.from("analytics_events").insert({
      event_type: event.name,
      profile_id: "profileId" in event.payload ? event.payload.profileId : null,
      payload: event.payload as unknown,
    });
  } catch (error) {
    // Fallback to webhook or console if Supabase unavailable
    const webhook = process.env.ANALYTICS_WEBHOOK;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } else if (process.env.NODE_ENV !== "test") {
      logger.debug({ eventName: event.name, payload: event.payload }, "Analytics event");
    }
  }
}

