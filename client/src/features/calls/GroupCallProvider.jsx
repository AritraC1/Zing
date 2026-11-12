import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Device } from "mediasoup-client";

import { useSocketContext } from "../../core/socket/useSocketContext";
import useAuth from "../auth/hooks/useAuth";
import { addCall } from "../chat/store/chatReducer";
import { toCall } from "../../shared/api/mappers/call";
import { GroupCallContext } from "./groupCallContext";
import IncomingGroupCallOverlay from "./components/IncomingGroupCallOverlay";

// Group calls run entirely through the SFU: the client publishes one
// upstream (audio + simulcast video) and subscribes to every other
// participant's producers. No peer-to-peer connections are created —
// each client only ever talks to the mediasoup room.

const MAX_PARTICIPANTS = 5;

// Three video layers so the SFU can pick the right one per subscriber
// (small tile on a phone vs the big view on desktop).
const VIDEO_ENCODINGS = [
  { rid: "r0", maxBitrate: 150000, scaleResolutionDownBy: 4, scalabilityMode: "S1T3" },
  { rid: "r1", maxBitrate: 500000, scaleResolutionDownBy: 2, scalabilityMode: "S1T3" },
  { rid: "r2", maxBitrate: 1200000, scaleResolutionDownBy: 1, scalabilityMode: "S1T3" },
];

export function GroupCallProvider({ children }) {
  const { socket, emit: socketEmit } = useSocketContext();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Render state ---
  const [groupCallState, setGroupCallState] = useState("idle"); // idle | incoming | connecting | connected
  const [callInfo, setCallInfo] = useState(null); // { callId, conversationId, callType, name }
  const [initiator, setInitiator] = useState(null); // { id, name, avatarUrl }
  // Remote participants: [{ peerId, name, avatarUrl, stream, audioPaused, videoPaused }]
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // --- Refs (stable inside socket handlers) ---
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  // kind -> mediasoup Producer
  const producersRef = useRef(new Map());
  // producerId -> consumer (client side); also the dedupe key for consumes
  const consumersRef = useRef(new Map());
  const participantsRef = useRef([]);
  const currentCallRef = useRef(null);
  const localStreamRef = useRef(null);
  const callStateRef = useRef(groupCallState);

  useEffect(() => {
    callStateRef.current = groupCallState;
  }, [groupCallState]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const isCurrentCall = useCallback(
    (callId) => !!currentCallRef.current && currentCallRef.current.callId === callId,
    [],
  );

  // Duration ticks only while connected.
  useEffect(() => {
    if (groupCallState !== "connected") return undefined;
    const timer = setInterval(() => setCallDuration((s) => s + 1), 1000);
    return () => {
      clearInterval(timer);
      setCallDuration(0);
    };
  }, [groupCallState]);

  // --- Socket ack helper -------------------------------------------
  const emitAck = useCallback(
    (event, payload) =>
      new Promise((resolve) => {
        if (!socket) {
          resolve({ error: "No connection" });
          return;
        }
        socket.emit(event, payload, (res) => resolve(res || {}));
      }),
    [socket],
  );

  // --- Media --------------------------------------------------------
  const getLocalStream = useCallback(async (callType) => {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    };
    if (callType === "video") {
      constraints.video = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      };
    }

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // Camera unavailable (denied / no device) — degrade to audio-only
      // rather than failing the whole call.
      if (callType === "video") {
        toast.info("Camera unavailable — joining with audio only");
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }
      throw err;
    }
  }, []);

  // Keep a ref mirror so the async join routine never reads stale state.
  const captureLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  // --- Teardown -----------------------------------------------------
  const stopResources = useCallback(() => {
    producersRef.current.forEach((producer) => {
      try {
        producer.close();
      } catch {
        // already closed
      }
    });
    producersRef.current = new Map();

    consumersRef.current.forEach((consumer) => {
      try {
        consumer.close();
      } catch {
        // already closed
      }
    });
    consumersRef.current = new Map();

    [sendTransportRef.current, recvTransportRef.current].forEach((t) => {
      try {
        t?.close();
      } catch {
        // already closed
      }
    });
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    try {
      deviceRef.current?.close();
    } catch {
      // already closed
    }
    deviceRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setParticipants([]);
    setMuted(false);
    setCameraOn(true);
    currentCallRef.current = null;
  }, []);

  const finishGroupCall = useCallback(() => {
    const call = currentCallRef.current;

    // Optimistic history entry: a group call that had us in it reads
    // as answered for this user.
    if (call && call.hadMedia) {
      const endedAt = new Date().toISOString();
      const entry = toCall({
        id: call.callId,
        conversationId: call.conversationId,
        direction: call.role === "caller" ? "outgoing" : "incoming",
        callType: call.callType,
        status: "answered",
        startedAt: call.startedAt || endedAt,
        endedAt,
        durationSeconds: call.connectedAt
          ? Math.max(0, Math.round((Date.now() - call.connectedAt) / 1000))
          : null,
        isGroup: true,
        peer: { id: call.conversationId, name: call.name, avatarUrl: null },
      });
      if (entry) dispatch(addCall(entry));
    }

    stopResources();
    setGroupCallState("idle");
    setCallInfo(null);
    setInitiator(null);

    if (location.pathname === "/group-call") {
      navigate("/call", { replace: true });
    }
  }, [dispatch, navigate, stopResources]);

  // --- Transport / produce / consume plumbing ------------------------

  const createTransport = useCallback(
    async (direction) => {
      const call = currentCallRef.current;
      if (!call || !deviceRef.current) return null;

      const res = await emitAck("group_call:create-transport", {
        callId: call.callId,
        direction,
      });
      if (res.error) throw new Error(res.error);

      const transport =
        direction === "send"
          ? deviceRef.current.createSendTransport(res.params)
          : deviceRef.current.createRecvTransport(res.params);

      if (direction === "send") {
        // mediasoup-client asks the app to bridge its connect/produce
        // events to the server — these are the standard hooks.
        transport.on("connect", ({ dtlsParameters }, callback, errback) => {
          emitAck("group_call:connect-transport", {
            callId: call.callId,
            transportId: transport.id,
            dtlsParameters,
          })
            .then((r) => (r.error ? errback(new Error(r.error)) : callback()))
            .catch(errback);
        });

        transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
          emitAck("group_call:produce", {
            callId: call.callId,
            transportId: transport.id,
            kind,
            rtpParameters,
          })
            .then((r) => (r.error ? errback(new Error(r.error)) : callback({ id: r.producerId })))
            .catch(errback);
        });
      }

      return transport;
    },
    [emitAck],
  );

  const produceTracks = useCallback(async (stream) => {
    if (!sendTransportRef.current || !stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const producer = await sendTransportRef.current.produce({
        track: audioTrack,
        appData: { source: "mic" },
      });
      producersRef.current.set("audio", producer);
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const producer = await sendTransportRef.current.produce({
        track: videoTrack,
        encodings: VIDEO_ENCODINGS,
        codecOptions: { videoGoogleStartBitrate: 1000 },
        appData: { source: "webcam" },
      });
      producersRef.current.set("video", producer);
    }
  }, []);

  const consumeProducer = useCallback(
    async ({ producerId }) => {
      const call = currentCallRef.current;
      if (!call || !deviceRef.current?.loaded || !recvTransportRef.current) return;
      if (consumersRef.current.has(producerId)) return;

      const res = await emitAck("group_call:consume", {
        callId: call.callId,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
      });
      if (res.error) {
        console.error("[group call] consume failed:", res.error);
        return;
      }

      const consumer = await recvTransportRef.current.consume({
        id: res.id,
        producerId: res.producerId,
        kind: res.kind,
        rtpParameters: res.rtpParameters,
        appData: { peerId: res.peerId },
      });
      consumersRef.current.set(res.producerId, consumer);

      // Attach the track into that peer's stream, creating one lazily.
      setParticipants((prev) => {
        const index = prev.findIndex((p) => p.peerId === res.peerId);
        if (index === -1) return prev;

        const updated = [...prev];
        const participant = updated[index];
        const stream = participant.stream || new MediaStream();
        stream.addTrack(consumer.track);
        updated[index] = {
          ...participant,
          stream,
          ...(res.kind === "audio" ? { audioPaused: Boolean(res.producerPaused) } : {}),
          ...(res.kind === "video" ? { videoPaused: Boolean(res.producerPaused) } : {}),
        };
        return updated;
      });

      // Server-side consumers start paused — resume once attached.
      emitAck("group_call:resume-consumer", {
        callId: call.callId,
        consumerId: res.id,
      });
    },
    [emitAck],
  );

  // The shared join routine (used by the initiator and by anyone
  // accepting an incoming ring).
  const joinRoom = useCallback(
    async (call) => {
      setGroupCallState("connecting");

      try {
        const res = await emitAck("group_call:join", { callId: call.callId });
        if (res.error) {
          toast.error(res.error);
          finishGroupCall();
          return;
        }

        // Device: local codec/DTLS negotiation state machine.
        const device = new Device();
        await device.load({ routerRtpCapabilities: res.rtpCapabilities });
        deviceRef.current = device;

        sendTransportRef.current = await createTransport("send");
        recvTransportRef.current = await createTransport("recv");

        // Existing participants (with any producers already flowing).
        const existing = (res.peers || []).map((peer) => ({
          peerId: peer.peerId,
          name: peer.displayName || "Member",
          avatarUrl: peer.avatarUrl || null,
          stream: null,
          audioPaused: false,
          videoPaused: false,
        }));
        setParticipants(existing);
        participantsRef.current = existing;

        await produceTracks(localStreamRef.current);

        // Subscribe to everyone's current producers.
        for (const peer of res.peers || []) {
          for (const producer of peer.producers || []) {
            await consumeProducer({
              producerId: producer.producerId,
              peerId: peer.peerId,
              kind: producer.kind,
              paused: producer.paused,
            });
          }
        }

        setGroupCallState("connected");
        if (currentCallRef.current) {
          currentCallRef.current.connectedAt = Date.now();
          currentCallRef.current.hadMedia = true;
        }
      } catch (err) {
        console.error("[group call] join failed:", err);
        toast.error("Could not join the call");
        finishGroupCall();
      }
    },
    [consumeProducer, createTransport, emitAck, finishGroupCall, produceTracks],
  );

  // --- Socket event wiring -------------------------------------------
  useEffect(() => {
    if (!socket) return undefined;

    const handlers = {
      "group_call:incoming": ({
        callId,
        conversationId,
        callType,
        initiatorId,
        initiatorName,
        initiatorAvatarUrl,
      }) => {
        if (currentCallRef.current) return; // busy — another tab/overlay

        const info = {
          callId,
          conversationId,
          callType,
          name: initiatorName || "Group call",
        };
        currentCallRef.current = {
          ...info,
          role: "callee",
          startedAt: new Date().toISOString(),
          hadMedia: false,
        };
        setCallInfo(info);
        setInitiator({
          id: initiatorId,
          name: initiatorName || "Someone",
          avatarUrl: initiatorAvatarUrl || null,
        });
        setGroupCallState("incoming");
      },

      "group_call:peer-joined": ({ callId, peer }) => {
        if (!isCurrentCall(callId)) return;
        setParticipants((prev) =>
          prev.some((p) => p.peerId === peer.peerId)
            ? prev
            : [
                ...prev,
                {
                  peerId: peer.peerId,
                  name: peer.displayName || "Member",
                  avatarUrl: peer.avatarUrl || null,
                  stream: null,
                  audioPaused: false,
                  videoPaused: false,
                },
              ],
        );
      },

      "group_call:peer-left": ({ callId, peerId }) => {
        if (!isCurrentCall(callId)) return;
        setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
      },

      "group_call:new-producer": ({ callId, peerId, producerId, kind, paused }) => {
        if (!isCurrentCall(callId)) return;
        consumeProducer({ producerId, peerId, kind, paused });
      },

      "group_call:producer-state": ({ callId, peerId, kind, paused }) => {
        if (!isCurrentCall(callId)) return;
        setParticipants((prev) =>
          prev.map((p) =>
            p.peerId === peerId
              ? {
                  ...p,
                  ...(kind === "audio" ? { audioPaused: Boolean(paused) } : {}),
                  ...(kind === "video" ? { videoPaused: Boolean(paused) } : {}),
                }
              : p,
          ),
        );
      },

      "group_call:ended": ({ callId }) => {
        if (!isCurrentCall(callId)) return;
        toast.info("Call ended for everyone");
        finishGroupCall();
      },

      "group_call:error": ({ callId, message }) => {
        if (callId && !isCurrentCall(callId)) return;
        if (message) toast.info(message);
        finishGroupCall();
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, consumeProducer, finishGroupCall, isCurrentCall]);

  // --- Public API -----------------------------------------------------

  // Start a call in a group conversation: ring everyone, then join.
  const startGroupCall = useCallback(
    async ({ conversationId, name, callType = "video" }) => {
      if (currentCallRef.current) return;

      try {
        const stream = await getLocalStream(callType);
        captureLocalStream(stream);

        currentCallRef.current = {
          conversationId,
          callType,
          name,
          role: "caller",
          startedAt: new Date().toISOString(),
          hadMedia: false,
        };
        setCallInfo({ conversationId, callType, name });
        setInitiator({ id: user?.id, name: user?.displayName || "You", avatarUrl: null });
        setGroupCallState("connecting");

        const res = await emitAck("group_call:ring", { conversationId, callType });
        if (!currentCallRef.current) return; // cleaned up meanwhile

        if (res.error) {
          toast.error(res.error);
          finishGroupCall();
          return;
        }

        currentCallRef.current.callId = res.callId;
        setCallInfo((prev) => ({ ...prev, callId: res.callId }));
        navigate("/group-call");

        await joinRoom({ ...currentCallRef.current, callId: res.callId });
      } catch (err) {
        console.error("[group call] start failed:", err);
        toast.error("Microphone permission denied");
        stopResources();
        setGroupCallState("idle");
      }
    },
    [emitAck, captureLocalStream, finishGroupCall, getLocalStream, joinRoom, navigate, stopResources, user],
  );

  // Accept an incoming group call ring.
  const joinIncomingGroupCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call || call.role !== "callee" || callStateRef.current !== "incoming") {
      return;
    }

    try {
      const stream = await getLocalStream(call.callType);
      captureLocalStream(stream);

      setGroupCallState("connecting");
      navigate("/group-call");

      await joinRoom(call);
    } catch (err) {
      console.error("[group call] accept failed:", err);
      toast.error("Microphone permission denied");
      finishGroupCall();
    }
  }, [captureLocalStream, finishGroupCall, getLocalStream, joinRoom, navigate]);

  // Decline just dismisses the overlay — the call continues without us.
  const declineIncomingGroupCall = useCallback(() => {
    stopResources();
    setGroupCallState("idle");
    setCallInfo(null);
    setInitiator(null);
  }, [stopResources]);

  const leaveGroupCall = useCallback(() => {
    const call = currentCallRef.current;
    if (call?.callId) {
      socketEmit("group_call:leave", { callId: call.callId });
    }
    finishGroupCall();
  }, [finishGroupCall, socketEmit]);

  // Initiator-only: hang up for the whole room.
  const endGroupCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (call?.callId) {
      const res = await emitAck("group_call:end", { callId: call.callId });
      if (res.error && call.role !== "caller") {
        // Non-initiators simply leave.
        socketEmit("group_call:leave", { callId: call.callId });
      }
    }
    finishGroupCall();
  }, [emitAck, finishGroupCall, socketEmit]);

  const toggleMute = useCallback(() => {
    const producer = producersRef.current.get("audio");
    if (!producer) return;

    if (producer.paused) {
      producer.resume();
    } else {
      producer.pause();
    }
    setMuted(producer.paused);
  }, []);

  const toggleCamera = useCallback(() => {
    const producer = producersRef.current.get("video");
    if (!producer) {
      toast.info("Your camera is off");
      return;
    }

    if (producer.paused) {
      producer.resume();
    } else {
      producer.pause();
    }
    setCameraOn(!producer.paused);
  }, []);

  const value = useMemo(
    () => ({
      groupCallState,
      callInfo,
      initiator,
      participants,
      localStream,
      muted,
      cameraOn,
      callDuration,
      participantLimit: MAX_PARTICIPANTS,
      startGroupCall,
      joinIncomingGroupCall,
      declineIncomingGroupCall,
      leaveGroupCall,
      endGroupCall,
      toggleMute,
      toggleCamera,
    }),
    [
      groupCallState,
      callInfo,
      initiator,
      participants,
      localStream,
      muted,
      cameraOn,
      callDuration,
      startGroupCall,
      joinIncomingGroupCall,
      declineIncomingGroupCall,
      leaveGroupCall,
      endGroupCall,
      toggleMute,
      toggleCamera,
    ],
  );

  return (
    <GroupCallContext.Provider value={value}>
      {children}
      <IncomingGroupCallOverlay />
    </GroupCallContext.Provider>
  );
}

export default GroupCallProvider;
