import { useEffect, useRef } from "react";
import { dataBus } from "@/core/data/DataBus";
import { useStore } from "@/core/state/store";
import { isValidGlobeCommand } from "@/core/globe/types/GlobeCommand";
import type { GlobeCommand } from "@/core/globe/types/GlobeCommand";

const POLL_INTERVAL_MS = 1500;

function dispatchCommand(cmd: GlobeCommand): void {
    switch (cmd.type) {
        case "pan":
            dataBus.emit("cameraGoTo", {
                lat: cmd.lat,
                lon: cmd.lon,
                alt: cmd.alt,
                // cameraGoTo exposes maxPitch (a clamp), not a target pitch angle,
                // so cmd.pitch is intentionally not forwarded here.
                ...(cmd.heading !== undefined ? { heading: cmd.heading } : {}),
            });
            break;

        case "focusEntity":
            if (cmd.lat !== undefined && cmd.lon !== undefined) {
                dataBus.emit("cameraGoTo", {
                    lat: cmd.lat,
                    lon: cmd.lon,
                    alt: 0,
                });
            } else if (cmd.entityId !== undefined) {
                // Entity-id-only resolution is not yet wired to the entity registry.
                // Provide lat/lon alongside entityId to trigger a camera move.
                console.warn(
                    "[useGlobeCommandBridge] focusEntity by id not yet supported; provide lat/lon",
                    cmd.entityId,
                );
            }
            break;

        case "toggleLayer": {
            const state = useStore.getState();
            if (cmd.enabled !== undefined) {
                state.setLayerEnabled(cmd.layerId, cmd.enabled);
            } else {
                state.toggleLayer(cmd.layerId);
            }
            break;
        }

        case "setTimeline": {
            const state = useStore.getState();
            if (cmd.timeWindow !== undefined) {
                // cmd.timeWindow is narrowed to TimeWindowLiteral by isValidGlobeCommand.
                state.setTimeWindow(cmd.timeWindow);
            }
            if (cmd.isPlaybackMode !== undefined) {
                state.setPlaybackMode(cmd.isPlaybackMode);
            }
            if (cmd.currentTime !== undefined) {
                const d = new Date(cmd.currentTime);
                if (!Number.isNaN(d.getTime())) {
                    state.setCurrentTime(d);
                }
            }
            break;
        }
    }
}

async function pollOnce(sessionId: string, active: { current: boolean }): Promise<void> {
    try {
        const res = await fetch(`/api/globe/commands?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok || !active.current) return;
        const body = (await res.json()) as { commands: unknown[] };
        const commands = body.commands.filter(isValidGlobeCommand);
        if (active.current) {
            commands.forEach(dispatchCommand);
        }
    } catch (err) {
        console.error("[useGlobeCommandBridge] Poll failed:", err);
    }
}

export function useGlobeCommandBridge(sessionId: string): void {
    const activeRef = useRef(false);
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (!sessionId) return;

        activeRef.current = true;

        const intervalId = setInterval(() => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;
            void pollOnce(sessionId, activeRef).finally(() => {
                inFlightRef.current = false;
            });
        }, POLL_INTERVAL_MS);

        return () => {
            activeRef.current = false;
            clearInterval(intervalId);
        };
    }, [sessionId]);
}
