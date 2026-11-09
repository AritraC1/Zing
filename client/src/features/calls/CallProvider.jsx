import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";

import { useSocketContext } from "../../core/socket/useSocketContext";
import { addCall } from "../chat/store/chatReducer";
import { CallContext } from "./callContext";
import IncomingCallOverlay from "./components/IncomingCallOverlay";
import { toCall } from "../../shared/api/mappers/call";

// WebRTC config — STUN only for now. Add a TURN server here later for
// stricter NATs (corporate networks / some carriers).
const ICE_SERVERS = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

const CALL_PAGES = ["/audio-call", "/video-call"];

export function CallProvider({ children }) {
  const { socket, emit: socketEmit } = useSocketContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Render state ---
  const [callState, setCallState] = useState("idle"); // idle | outgoing | incoming | connecting | connected
  const [callType, setCallType] = useState("audio"); // audio | video
  const [peer, setPeer] = useState(null); // { id, name, avatarUrl, conversationId }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);

  // --- Refs (stable across renders, used inside socket handlers) ---
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  // { callId, conversationId, callType, role: caller|callee, peer }
  const currentCallRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const connectedAtRef = useRef(null);
  const callStateRef = useRef(callState);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const emit = useCallback(
    (event, payload, ack) => {
      socketEmit(event, payload, ack);
    },
    [socketEmit],
  );

  const isCurrentCall = useCallback((callId) => {
    return !!currentCallRef.current && currentCallRef.current.callId === callId;
  }, []);

  // --- Media helpers ----------------------------------------------

  const getLocalStream = useCallback(async (type) => {
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video:
        type === "video"
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
    });
  }, []);

  // --- Teardown ----------------------------------------------------

  const stopResources = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // already closed
      }
      pcRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    pendingCandidatesRef.current = [];
    connectedAtRef.current = null;
    currentCallRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOn(true);
  }, []);

  // Terminate locally: log to the calls list, reset state, and steer the
  // user back to the calls page if they were on a call screen.
  const finishCall = useCallback(
    (reason) => {
      const call = currentCallRef.current;
      if (call) {
        const answeredAtMs = connectedAtRef.current;
        const endedAt = new Date().toISOString();

        const entry = toCall({
          id: call.callId,
          conversationId: call.conversationId,
          direction: call.role === "caller" ? "outgoing" : "incoming",
          callType: call.callType,
          status: answeredAtMs ? "answered" : legacyStatusFromReason(reason),
          startedAt: call.startedAt || endedAt,
          answeredAt: answeredAtMs
            ? new Date(answeredAtMs).toISOString()
            : null,
          endedAt,
          peer: call.peer,
        });

        if (entry) {
          dispatch(addCall(entry));
        }
      }

      const wasOnCallPage = CALL_PAGES.includes(location.pathname);
      stopResources();
      setCallState("idle");

      if (wasOnCallPage) {
        navigate("/call", { replace: true });
      }
      return reason;
    },
    [dispatch, location.pathname, navigate, stopResources],
  );

  // --- Peer connection ---------------------------------------------

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && currentCallRef.current) {
        emit("call:ice-candidate", {
          callId: currentCallRef.current.callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected" && currentCallRef.current) {
        connectedAtRef.current = Date.now();
        setCallState("connected");
      } else if (
        ["failed", "disconnected", "closed"].includes(pc.connectionState) &&
        currentCallRef.current
      ) {
        if (isCurrentCall(currentCallRef.current.callId)) {
          finishCall(pc.connectionState === "failed" ? "failed" : "ended");
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [emit, finishCall, isCurrentCall]);

  const sendOffer = useCallback(
    async (call) => {
      try {
        const pc = ensurePeerConnection();
        const stream = localStreamRef.current;
        stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: call.callType === "video",
        });
        await pc.setLocalDescription(offer);
        emit("call:offer", { callId: call.callId, offer: pc.localDescription });
      } catch (err) {
        console.error("[call] offer failed:", err);
        toast.error("Could not start the call");
        finishCall("failed");
      }
    },
    [emit, ensurePeerConnection, finishCall],
  );

  // --- Socket signaling ---------------------------------------------

  const handleOffer = useCallback(
    async ({ callId, offer }) => {
      const call = currentCallRef.current;
      if (!call || call.callId !== callId || call.role !== "callee") return;

      try {
        const pc = ensurePeerConnection();
        const stream = localStreamRef.current;
        if (stream && pc.getSenders().length === 0) {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        // Candidates can arrive before the SDP offer — queue them.
        await pc.setRemoteDescription(offer);
        const pending = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        pending.forEach((candidate) => {
          pc.addIceCandidate(candidate).catch(() => {});
        });

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit("call:answer", { callId, answer: pc.localDescription });
      } catch (err) {
        console.error("[call] answer failed:", err);
        finishCall("failed");
      }
    },
    [emit, ensurePeerConnection, finishCall],
  );

  const handleAnswer = useCallback(
    async ({ callId, answer }) => {
      const call = currentCallRef.current;
      if (!call || call.callId !== callId || call.role !== "caller") return;

      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(answer);
        const pending = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        pending.forEach((candidate) => {
          pc.addIceCandidate(candidate).catch(() => {});
        });
      } catch (err) {
        console.error("[call] apply answer failed:", err);
        finishCall("failed");
      }
    },
    [finishCall],
  );

  const handleCandidate = useCallback(async ({ callId, candidate }) => {
    const call = currentCallRef.current;
    if (!call || call.callId !== callId) return;

    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      //trickle candidate got here before the remote description did
      if (candidate) pendingCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // stale / invalid candidate — safe to ignore
    }
  }, []);

  // Register/unregister call signaling on the shared socket.
  useEffect(() => {
    if (!socket) return undefined;

    const handlers = {
      // Server -> both sides -------------------------------------
      "call:incoming": ({
        callId,
        conversationId,
        callType: incomingType,
        callerId,
        callerName,
        callerAvatarUrl,
      }) => {
        if (currentCallRef.current) return; // already busy (other tab handles it)

        const incomingPeer = {
          id: callerId,
          name: callerName || "Unknown",
          avatarUrl: callerAvatarUrl || null,
          conversationId,
        };
        currentCallRef.current = {
          callId,
          conversationId,
          callType: incomingType,
          role: "callee",
          peer: incomingPeer,
          startedAt: new Date().toISOString(),
        };
        setPeer(incomingPeer);
        setCallType(incomingType);
        setCallState("incoming");
      },

      "call:accepted": ({ callId }) => {
        const call = currentCallRef.current;
        if (!call || call.callId !== callId || call.role !== "caller") return;
        setCallState("connecting");
        sendOffer(call);
      },

      "call:offer": handleOffer,
      "call:answer": handleAnswer,
      "call:ice-candidate": handleCandidate,

      "call:rejected": ({ callId, reason }) => {
        if (!isCurrentCall(callId)) return;
        if (reason === "declined") {
          toast.info("Call declined");
        }
        finishCall(reason || "rejected");
      },

      "call:cancelled": ({ callId }) => {
        if (!isCurrentCall(callId)) return;
        finishCall("cancelled");
      },

      "call:missed": ({ callId }) => {
        if (!isCurrentCall(callId)) return;
        toast.info("No answer");
        finishCall("missed");
      },

      "call:ended": ({ callId }) => {
        if (!isCurrentCall(callId)) return;
        finishCall("ended");
      },

      "call:error": ({ callId, message }) => {
        // Errors for our active call end it; unverifiable ones are ignored
        // (they belong to another tab sharing the same user room).
        if (!isCurrentCall(callId)) return;
        if (message) {
          toast.info(message);
        }
        finishCall("failed");
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
  }, [
    socket,
    finishCall,
    handleAnswer,
    handleCandidate,
    handleOffer,
    isCurrentCall,
    sendOffer,
  ]);

  // --- Public API -------------------------------------------------

  const startCall = useCallback(
    async (target) => {
      if (currentCallRef.current) return;

      const callType =
        target.callType === "video" ? "video" : target.type === "video" ? "video" : "audio";
      const peer = {
        id: target.peerId ?? target.otherUserId,
        name: target.name ?? "Unknown",
        avatarUrl: target.avatarUrl ?? target.profilePic ?? null,
        conversationId: target.conversationId ?? target.id ?? null,
      };

      if (!peer.id || !peer.conversationId) {
        toast.error("Unable to start the call from here");
        return;
      }

      try {
        const stream = await getLocalStream(callType);
        localStreamRef.current = stream;
        setLocalStream(stream);

        currentCallRef.current = {
          conversationId: peer.conversationId,
          callType,
          role: "caller",
          peer,
          startedAt: new Date().toISOString(),
        };
        setPeer(peer);
        setCallType(callType);
        setCallState("outgoing");

        emit(
          "call:ring",
          {
            conversationId: peer.conversationId,
            calleeId: peer.id,
            callType,
          },
          (res) => {
            if (!currentCallRef.current) return; // call already cleaned up

            if (!res || res.error) {
              if (res?.reason === "busy") toast.info("User is busy");
              else if (res?.reason === "unavailable")
                toast.info("User is not available");
              else toast.error(res?.error || "Unable to start the call");
              setCallState("idle");
              stopResources();
              navigate("/call", { replace: true });
              return;
            }

            currentCallRef.current = {
              ...currentCallRef.current,
              callId: res.callId,
            };
            ensurePeerConnection();
          },
        );

        navigate(callType === "video" ? "/video-call" : "/audio-call");
      } catch (err) {
        console.error("[call] media error:", err);
        stopResources();
        setCallState("idle");
        toast.error("Microphone/Camera permission denied");
      }
    },
    [
      emit,
      ensurePeerConnection,
      getLocalStream,
      navigate,
      stopResources,
    ],
  );

  const acceptCall = useCallback(async () => {
    const call = currentCallRef.current;
    if (!call || call.role !== "callee" || callStateRef.current !== "incoming") {
      return;
    }

    setCallState("connecting");

    try {
      const stream = await getLocalStream(call.callType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      emit("call:accept", { callId: call.callId });
      navigate(call.callType === "video" ? "/video-call" : "/audio-call");
    } catch (err) {
      console.error("[call] accept media error:", err);
      toast.error("Microphone/Camera permission denied");
      emit("call:reject", { callId: call.callId });
      finishCall("failed");
    }
  }, [emit, finishCall, getLocalStream, navigate]);

  const rejectCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call || call.role !== "callee") return;

    emit("call:reject", { callId: call.callId });
    stopResources();
    setCallState("idle");
  }, [emit, stopResources]);

  const endCall = useCallback(() => {
    const call = currentCallRef.current;
    if (!call) return;

    const state = callStateRef.current;
    if (call.role === "caller" && state === "outgoing") {
      emit("call:cancel", { callId: call.callId });
    } else if (call.role === "callee" && state === "incoming") {
      emit("call:reject", { callId: call.callId });
    } else {
      emit("call:end", { callId: call.callId });
    }

    finishCall(state === "connected" ? "ended" : "hangup");
  }, [emit, finishCall]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = muted; // currently muted -> unmute
    setMuted(!muted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = cameraOn;
    setCameraOn(!cameraOn);
  }, [cameraOn]);

  const value = useMemo(
    () => ({
      callState,
      callType,
      peer,
      localStream,
      remoteStream,
      muted,
      cameraOn,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
    }),
    [
      callState,
      callType,
      peer,
      localStream,
      remoteStream,
      muted,
      cameraOn,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
    ],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallOverlay />
    </CallContext.Provider>
  );
}

// Optimistic history entries for calls that never made it to `answered`
// map onto the persisted statuses used by toCall().
function legacyStatusFromReason(reason) {
  if (reason === "missed" || reason === "cancelled") return "missed";
  if (reason === "declined" || reason === "rejected") return "rejected";
  return "missed";
}

export default CallProvider;

