// mediasoup SFU configuration.
//
// The SFU runs in-process with the API (single Node instance): one
// mediasoup worker per process, one router (room) per group call.
// For multi-node deployments each API instance handles the rooms its
// sockets created — pinning rooms to nodes via Redis is a later step.

const ENV = require("../core/config/env");

const LISTEN_IP = process.env.SFU_LISTEN_IP || "0.0.0.0";
// Address advertised to clients in ICE candidates. Must be the public
// (or LAN) IP of the machine running the server — "auto" lets mediasoup
// pick the primary interface, which is right for local development.
const ANNOUNCED_IP = process.env.SFU_ANNOUNCED_IP || "auto";

// UDP/TCP port range the media workers bind for WebRTC ICE. Docker
// Compose (and any production firewall) must expose this range.
const RTC_MIN_PORT = Number(process.env.RTC_MIN_PORT || 40000);
const RTC_MAX_PORT = Number(process.env.RTC_MAX_PORT || 40100);

// Group calls are capped at 5 participants (1 upstream each).
const MAX_PARTICIPANTS = 5;

const workerSettings = {
  logLevel: "warn",
  logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
  rtcMinPort: RTC_MIN_PORT,
  rtcMaxPort: RTC_MAX_PORT,
};

const webRtcTransportSettings = {
  listenIps: [
    {
      ip: LISTEN_IP,
      announcedIp: ANNOUNCED_IP === "auto" ? undefined : ANNOUNCED_IP,
    },
  ],
  initialAvailableOutgoingBitrate: 1_000_000,
  maxIncomingBitrate: 1_500_000,
};

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: { "x-google-start-bitrate": 1000 },
  },
  {
    kind: "video",
    mimeType: "video/VP9",
    clockRate: 90000,
    parameters: { "profile-id": 2, "x-google-start-bitrate": 1000 },
  },
  {
    kind: "video",
    mimeType: "video/h264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "4d0032",
      "level-asymmetry-allowed": 1,
      "x-google-start-bitrate": 1000,
    },
  },
];

module.exports = {
  MAX_PARTICIPANTS,
  workerSettings,
  webRtcTransportSettings,
  mediaCodecs,
  RTC_MIN_PORT,
  RTC_MAX_PORT,
};
