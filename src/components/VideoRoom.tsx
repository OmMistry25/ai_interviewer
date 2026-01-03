"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import {
  Room,
  RoomEvent,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalTracks,
  DisconnectReason,
} from "livekit-client";
import { env } from "@/lib/env";

interface VideoRoomProps {
  token: string;
  roomName: string;
  onDisconnect?: () => void;
  /** Called when audio stream is available for external processing */
  onAudioStream?: (stream: MediaStream) => void;
  /** Optional overlay elements (e.g., AI avatar) */
  children?: ReactNode;
}

export function VideoRoom({ token, roomName, onDisconnect, onAudioStream, children }: VideoRoomProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");
  
  // Use refs for callbacks to avoid effect re-runs
  const onDisconnectRef = useRef(onDisconnect);
  const onAudioStreamRef = useRef(onAudioStream);
  
  // Keep refs updated
  useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);
  useEffect(() => { onAudioStreamRef.current = onAudioStream; }, [onAudioStream]);

  const handleDisconnect = useCallback((reason?: DisconnectReason) => {
    console.log("Disconnected, reason:", reason);
    setConnected(false);
    if (reason === DisconnectReason.CLIENT_INITIATED) {
      onDisconnectRef.current?.();
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const room = new Room();
    roomRef.current = room;

    const connect = async () => {
      try {
        setStatus("Requesting camera/mic access...");
        
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

        // Expose audio stream for external processing
        const audioTrack = tracks.find(
          (t) => t.kind === "audio"
        ) as LocalAudioTrack;
        if (audioTrack) {
          const mediaStreamTrack = audioTrack.mediaStreamTrack;
          if (mediaStreamTrack) {
            const audioStream = new MediaStream([mediaStreamTrack]);
            onAudioStreamRef.current?.(audioStream);
          }
        }

        setStatus("Connecting to room...");
        await room.connect(env.NEXT_PUBLIC_LIVEKIT_URL, token);
        
        if (!mounted) {
          room.disconnect();
          return;
        }

        setStatus("Publishing tracks...");
        setConnected(true);

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

    room.on(RoomEvent.Disconnected, handleDisconnect);
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log("Connection state:", state);
    });

    connect();

    return () => {
      mounted = false;
      room.disconnect();
    };
  }, [token, handleDisconnect]); // Only depend on token, not callbacks

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-zinc-800 rounded-lg p-4">
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
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-zinc-900 rounded-lg"
        style={{ transform: "scaleX(-1)" }} // Un-mirror the selfie camera
      />
      
      {/* Connection status badge */}
      <div className="absolute top-3 left-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            connected ? "bg-green-600/80" : "bg-amber-600/80"
          } text-white backdrop-blur-sm`}
        >
          {connected ? "● Live" : status}
        </span>
      </div>

      {/* Overlay children (e.g., AI avatar) */}
      {children}
    </div>
  );
}
