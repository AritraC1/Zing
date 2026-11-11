// SFU Room — one mediasoup router per group call.
//
// Participants publish one upstream (audio + simulcast video) through a
// send transport; the room forwards selected RTP layers to everyone
// else through receive transports. The server never decodes media —
// every packet it touches stays DTLS-SRTP encrypted.

const { getWorker } = require("./worker");
const {
  webRtcTransportSettings,
  mediaCodecs,
  MAX_PARTICIPANTS,
} = require("./config");

class Room {
  constructor(id, { callType = "video" } = {}) {
    this.id = id;
    this.callType = callType;
    this.router = null;
    this.closed = false;
    // peerId -> { transports, producers, consumers }
    this.peers = new Map();
  }

  get peerCount() {
    return this.peers.size;
  }

  isFull() {
    return this.peerCount >= MAX_PARTICIPANTS;
  }

  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  async ensureRouter() {
    if (this.router) return this.router;
    if (this.closed) throw new Error("Room is closed");

    const worker = await getWorker();
    this.router = await worker.createRouter({ mediaCodecs });
    return this.router;
  }

  async addPeer(peerId) {
    if (this.closed) throw new Error("Room is closed");
    if (this.peers.has(peerId)) return this.peers.get(peerId);
    if (this.isFull()) {
      throw new Error(`Call is full (max ${MAX_PARTICIPANTS} participants)`);
    }

    const peer = { transports: new Map(), producers: new Map(), consumers: new Map() };
    this.peers.set(peerId, peer);
    return peer;
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.producers.forEach((producer) => {
      try {
        producer.close();
      } catch {
        // already closed
      }
    });
    peer.consumers.forEach((consumer) => {
      try {
        consumer.close();
      } catch {
        // already closed
      }
    });
    peer.transports.forEach((transport) => {
      try {
        transport.close();
      } catch {
        // already closed
      }
    });
    this.peers.delete(peerId);
  }

  hasPeer(peerId) {
    return this.peers.has(peerId);
  }

  // List of { peerId, producers: [{ producerId, kind, paused }] } for
  // everyone currently publishing — sent to new joiners.
  getExistingProducers() {
    const result = [];
    this.peers.forEach((peer, peerId) => {
      if (peer.producers.size === 0) return;
      result.push({
        peerId,
        producers: Array.from(peer.producers.values()).map((producer) => ({
          producerId: producer.id,
          kind: producer.kind,
          paused: producer.paused,
        })),
      });
    });
    return result;
  }

  async createWebRtcTransport(peerId, direction) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error("Not in the room");
    if (peer.transports.has(direction)) {
      throw new Error(`${direction} transport already exists`);
    }

    const transport = await this.router.createWebRtcTransport({
      ...webRtcTransportSettings,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      appData: { peerId, direction },
    });

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") {
        console.log(`[sfu] transport closed for peer ${peerId} (${direction})`);
      }
    });

    peer.transports.set(direction, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  getTransport(peerId, transportId) {
    const peer = this.peers.get(peerId);
    if (!peer) return null;
    return peer.transports.get(transportId) || null;
  }

  async connectTransport(peerId, transportId, dtlsParameters) {
    const transport = this.getTransport(peerId, transportId);
    if (!transport) throw new Error("Transport not found");
    await transport.connect({ dtlsParameters });
  }

  async produce(peerId, transportId, kind, rtpParameters) {
    const transport = this.getTransport(peerId, transportId);
    if (!transport) throw new Error("Transport not found");

    const producer = await transport.produce({ kind, rtpParameters });
    const peer = this.peers.get(peerId);
    peer.producers.set(producer.id, producer);

    producer.on("score", () => {});
    return producer;
  }

  async consume(peerId, rtpCapabilities, producerId) {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error("Not in the room");

    // Find which peer owns this producer.
    let producerPeerId = null;
    let producer = null;
    this.peers.forEach((otherPeer, otherId) => {
      const found = otherPeer.producers.get(producerId);
      if (found) {
        producer = found;
        producerPeerId = otherId;
      }
    });
    if (!producer) throw new Error("Producer not found");
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Client cannot consume this producer");
    }

    const transport = peer.transports.get("recv");
    if (!transport) throw new Error("No receive transport");

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // resumed by the client once its track is attached
    });

    peer.consumers.set(consumer.id, consumer);
    consumer.on("producerclose", () => {
      peer.consumers.delete(consumer.id);
    });

    return {
      consumer,
      peerId: producerPeerId,
      info: {
        id: consumer.id,
        producerId,
        peerId: producerPeerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
      },
    };
  }

  async resumeConsumer(peerId, consumerId) {
    const peer = this.peers.get(peerId);
    const consumer = peer?.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.resume();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.peers.forEach((_peer, peerId) => this.removePeer(peerId));
    try {
      this.router?.close();
    } catch {
      // already closed
    }
    this.router = null;
  }
}

module.exports = { Room };
