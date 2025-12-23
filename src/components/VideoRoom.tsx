"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  createLocalTracks,
  DisconnectReason,
} from "livekit-client";
import { env } from "@/lib/env";

interface VideoRoomProps {
  token: string;
  roomName: string;
  onDisconnect?: () => void;
}

export function VideoRoom({ token, roomName, onDisconnect }: VideoRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");

  const handleDisconnect = useCallback((reason?: DisconnectReason) => {
    console.log("Disconnected, reason:", reason);
    setConnected(false);
    // Only call onDisconnect for intentional disconnects, not errors
    if (reason === DisconnectReason.CLIENT_INITIATED) {
      onDisconnect?.();
    }
  }, [onDisconnect]);

  useEffect(() => {
    let mounted = true;
    const room = new Room();
    roomRef.current = room;

    const connect = async () => {
      try {
        setStatus("Requesting camera/mic access...");
        
        // Create local tracks first
        const tracks = await createLocalTracks({
          audio: true,
          video: true,
        });

        if (!mounted) return;

        // Attach video to element
        const videoTrack = tracks.find(
          (t) => t.kind === "video"
        ) as LocalVideoTrack;
        if (videoTrack && videoRef.current) {
          videoTrack.attach(videoRef.current);
        }

        setStatus("Connecting to room...");

        // Connect to room
        await room.connect(env.NEXT_PUBLIC_LIVEKIT_URL, token);
        
        if (!mounted) {
          room.disconnect();
          return;
        }

        setStatus("Publishing tracks...");
        setConnected(true);

        // Publish tracks
        for (const track of tracks) {
          await room.localParticipant.publishTrack(track);
        }

        setStatus("Connected");
      } catch (e) {
        console.error("Connection error:", e);
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to connect");
        }
      }
    };

    // Handle events
    room.on(RoomEvent.Disconnected, handleDisconnect);
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log("Connection state:", state);
    });

    connect();

    return () => {
      mounted = false;
      room.disconnect();
    };
  }, [token, handleDisconnect]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-800 rounded p-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-video bg-zinc-800 rounded"
      />
      <div className="absolute top-2 right-2">
        <span
          className={`px-2 py-1 rounded text-xs ${
            connected ? "bg-green-600" : "bg-yellow-600"
          } text-white`}
        >
          {connected ? "Connected" : status}
        </span>
      </div>
    </div>
  );
}

