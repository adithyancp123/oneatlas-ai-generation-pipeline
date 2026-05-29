"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineSSEEvent } from "@/types/sse";

export interface UseSSEOptions {
  enabled?: boolean;
  onEvent?: (event: PipelineSSEEvent) => void;
}

export interface UseSSEReturn {
  connected: boolean;
  lastEvent: PipelineSSEEvent | null;
  error: string | null;
  disconnect: () => void;
}

export function useSSE(url: string | null, options: UseSSEOptions = {}): UseSSEReturn {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PipelineSSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(options.onEvent);

  useEffect(() => {
    onEventRef.current = options.onEvent;
  }, [options.onEvent]);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!url || options.enabled === false) return;

    const source = new EventSource(url);
    sourceRef.current = source;

    const eventTypes: PipelineSSEEvent["type"][] = [
      "stage_start",
      "stage_complete",
      "stage_failed",
      "generation_complete",
    ];

    source.onopen = () => {
      setConnected(true);
      setError(null);
    };

    source.onerror = () => {
      setConnected(false);
      setError("SSE connection error");
    };

    for (const type of eventTypes) {
      source.addEventListener(type, (message: MessageEvent<string>) => {
        try {
          const event = JSON.parse(message.data) as PipelineSSEEvent;
          setLastEvent(event);
          onEventRef.current?.(event);
        } catch {
          setError("Failed to parse SSE event");
        }
      });
    }

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [url, options.enabled]);

  return { connected, lastEvent, error, disconnect };
}
