/**
 * DEPTHGATE — Módulo de Coop Online / Rede P2P via WebRTC DataChannel
 * Desenvolvido para comunicação de alta performance e baixa latência entre Host e Client.
 * Suporta pareamento automático via nuvem pública (ntfy.sh) e rede local (LAN / Node server).
 */
(function(window) {
  'use strict';

  // Configuração de servidores STUN globais de alta disponibilidade
  const ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['stun:stun.services.mozilla.com'] }
  ];

  const NTFY_BASE = "https://ntfy.sh";

  // Normalização de código de sala: aceita "6SKC", "dg-6skc", "DG-6SKC", etc.
  function normalizeCode(raw) {
    if (!raw) return "";
    let clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.startsWith("DG")) clean = clean.substring(2);
    return clean ? "DG-" + clean : "";
  }

  function getCleanTopicCode(code) {
    let clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.startsWith("DG")) clean = clean.substring(2);
    return clean.toLowerCase();
  }

  // Serializadores seguros contra protótipos de getters em WebKit e browsers modernos
  function serializeDesc(desc) {
    if (!desc) return null;
    const type = desc.type ? String(desc.type).toLowerCase() : "";
    const sdp = desc.sdp ? String(desc.sdp) : "";
    if (!type || !sdp || !["offer", "answer", "pranswer", "rollback"].includes(type)) {
      return null;
    }
    return { type, sdp };
  }

  function serializeCand(cand) {
    if (!cand) return null;
    const cStr = cand.candidate ? String(cand.candidate).trim() : "";
    // Ignora candidatos vazios (end-of-candidates notification) ou strings que não seguem RFC 5245
    if (!cStr || !cStr.startsWith("candidate:")) return null;
    return {
      candidate: cStr,
      sdpMid: cand.sdpMid != null ? String(cand.sdpMid) : undefined,
      sdpMLineIndex: cand.sdpMLineIndex != null ? Number(cand.sdpMLineIndex) : undefined
    };
  }

  // Funções de comunicação HTTP com o serviço de sinalização na nuvem (ntfy.sh)
  async function ntfyPublish(topic, payload) {
    try {
      const res = await fetch(`${NTFY_BASE}/${topic}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function ntfyPoll(topic, minTs = 0) {
    try {
      const res = await fetch(`${NTFY_BASE}/${topic}/json?poll=1`);
      if (!res.ok) return [];
      const text = await res.text();
      const results = [];
      for (const line of text.trim().split("\n")) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          if (item && item.message) {
            const data = JSON.parse(item.message);
            if (!minTs || (data.ts && data.ts >= minTs) || !data.ts) {
              results.push(data);
            }
          }
        } catch (e) {}
      }
      return results;
    } catch (e) {
      return [];
    }
  }

  // Aguarda até maxMs para que candidatos ICE locais sejam incorporados ao SDP
  async function waitForIceGathering(pc, maxMs = 500) {
    if (!pc || pc.iceGatheringState === "complete") return;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (pc) pc.removeEventListener("icegatheringstatechange", onState);
        resolve();
      }, maxMs);
      function onState() {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timer);
          pc.removeEventListener("icegatheringstatechange", onState);
          resolve();
        }
      }
      pc.addEventListener("icegatheringstatechange", onState);
    });
  }

  class DepthGateNetManager {
    constructor() {
      this.role = null;           // "host" | "client" | null
      this.status = "idle";       // "idle" | "hosting" | "joining" | "connected" | "disconnected"
      this.roomCode = null;
      this.pc = null;
      this.dc = null;
      this.latency = 0;
      this.lastPingTs = 0;
      this.pollInterval = null;
      this.pingInterval = null;
      this._remoteDescriptionSet = false;
      this._pendingCandidates = [];
      this._seenCandidates = new Set();
      this.customSignalBaseUrl = null;
      this.roomCreatedAt = 0;

      // Buffers de entrada e estado
      this.clientInputs = {
        axis: { x: 0, y: 0 },
        aim: { x: 0, y: 0 },
        attack: false,
        dash: false,
        potion: false,
        skillIdx: null,
        _justDown: { ATTACK: false, DASH: false, POTION: false }
      };

      this.latestWorldState = null;
      this.listeners = new Map();

      // Utilitário de inputs para p2In em Game.update
      this.guestInputProxy = {
        axis: () => this.clientInputs.axis,
        aim: () => this.clientInputs.aim,
        keyboardAxis: () => this.clientInputs.axis,
        justDown: (action) => {
          if (this.clientInputs._justDown[action]) {
            this.clientInputs._justDown[action] = false;
            return true;
          }
          return false;
        }
      };
    }

    on(event, cb) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(cb);
    }

    off(event, cb) {
      if (!this.listeners.has(event)) return;
      const arr = this.listeners.get(event).filter(f => f !== cb);
      this.listeners.set(event, arr);
    }

    emit(event, ...args) {
      const arr = this.listeners.get(event);
      if (arr) {
        for (const cb of arr) {
          try { cb(...args); } catch (e) { console.warn("[Net] Callback error:", e); }
        }
      }
    }

    getSignalBaseUrl() {
      if (this.customSignalBaseUrl) return this.customSignalBaseUrl;
      try {
        const loc = window.location;
        if (!loc || !loc.host || loc.protocol === "file:") {
          return "http://localhost:5200/api/signal";
        }
        return `${loc.protocol}//${loc.host}/api/signal`;
      } catch (e) {
        return "http://localhost:5200/api/signal";
      }
    }

    async getServerInfo() {
      try {
        const res = await fetch(`${this.getSignalBaseUrl()}/info`);
        if (res.ok) return await res.json();
      } catch (e) {}
      return null;
    }

    generateRoomCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "DG-";
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    }

    async _setRemoteDescSafe(rawDesc) {
      const clean = serializeDesc(rawDesc);
      if (!clean) {
        throw new Error("Descrição SDP remota inválida recebida.");
      }
      const desc = (typeof RTCSessionDescription !== "undefined")
        ? new RTCSessionDescription(clean)
        : clean;
      await this.pc.setRemoteDescription(desc);
      this._remoteDescriptionSet = true;

      // Processa candidatos ICE enfileirados que chegaram antes da resposta/oferta SDP
      if (this._pendingCandidates.length > 0) {
        const queue = [...this._pendingCandidates];
        this._pendingCandidates.length = 0;
        for (const c of queue) {
          await this._addIceCandidateSafe(c);
        }
      }
    }

    async _addIceCandidateSafe(rawCand) {
      const clean = serializeCand(rawCand);
      if (!clean) return;
      if (!this._remoteDescriptionSet || !this.pc || !this.pc.remoteDescription) {
        this._pendingCandidates.push(clean);
        return;
      }
      try {
        const cand = (typeof RTCIceCandidate !== "undefined")
          ? new RTCIceCandidate(clean)
          : clean;
        await this.pc.addIceCandidate(cand);
      } catch (err) {
        // Candidatos redundantes são ignorados normalmente
      }
    }

    /* =========================================================================
     * HOST: Criar Sala
     * ========================================================================= */
    async hostRoom(customCode) {
      this.disconnect();
      this.role = "host";
      this.status = "hosting";
      this._remoteDescriptionSet = false;
      this._pendingCandidates = [];
      this._seenCandidates = new Set();
      this.roomCode = normalizeCode(customCode || this.generateRoomCode());
      this.roomCreatedAt = Date.now();

      const cleanTopic = getCleanTopicCode(this.roomCode);
      const offerTopic = `dg_sig_${cleanTopic}_offer`;
      const ansTopic = `dg_sig_${cleanTopic}_ans`;
      const hostCandTopic = `dg_sig_${cleanTopic}_cand_h`;
      const guestCandTopic = `dg_sig_${cleanTopic}_cand_g`;

      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Cria DataChannel com ordenação garantida e baixa latência
      this.dc = this.pc.createDataChannel("depthgate", { ordered: true });
      this._setupDataChannel(this.dc);

      this.pc.onicecandidate = (e) => {
        if (e.candidate && this.status !== "disconnected") {
          const clean = serializeCand(e.candidate);
          if (clean) {
            const candStr = clean.candidate;
            if (!this._seenCandidates.has(candStr)) {
              this._seenCandidates.add(candStr);
              // Publica candidato ICE na nuvem e no servidor local em paralelo
              ntfyPublish(hostCandTopic, { cand: clean, from: "host", ts: Date.now() });
              try {
                fetch(`${this.getSignalBaseUrl()}/candidate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: this.roomCode, candidate: clean, from: "host" })
                }).catch(() => {});
              } catch (err) {}
            }
          }
        }
      };

      const rawOffer = await this.pc.createOffer();
      await this.pc.setLocalDescription(rawOffer);

      // Aguarda ICE reunir candidatos locais no SDP para conexão instantânea
      await waitForIceGathering(this.pc, 500);

      const offer = serializeDesc(this.pc.localDescription || rawOffer);
      if (!offer) {
        throw new Error("Falha ao estruturar oferta WebRTC válida.");
      }

      // Publica oferta na nuvem e registra no servidor local
      const pubPayload = { code: this.roomCode, offer, ts: this.roomCreatedAt };
      await Promise.allSettled([
        ntfyPublish(offerTopic, pubPayload),
        fetch(`${this.getSignalBaseUrl()}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: this.roomCode, offer })
        }).catch(() => {})
      ]);

      this._startHostPolling(ansTopic, guestCandTopic);
      this.emit("hosting", this.roomCode);
      return this.roomCode;
    }

    _startHostPolling(ansTopic, guestCandTopic) {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          return;
        }

        // 1. Busca resposta SDP do Guest
        if (!this._remoteDescriptionSet) {
          try {
            const ntfyItems = await ntfyPoll(ansTopic, this.roomCreatedAt - 2000);
            if (ntfyItems && ntfyItems.length > 0) {
              const latest = ntfyItems[ntfyItems.length - 1];
              if (latest && latest.answer && !this._remoteDescriptionSet) {
                await this._setRemoteDescSafe(latest.answer);
              }
            }
          } catch (e) {}

          if (!this._remoteDescriptionSet) {
            try {
              const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=host`);
              if (res.ok) {
                const data = await res.json();
                if (data.answer && !this._remoteDescriptionSet) {
                  await this._setRemoteDescSafe(data.answer);
                }
              }
            } catch (e) {}
          }
        }

        // 2. Busca candidatos ICE do Guest
        try {
          const candItems = await ntfyPoll(guestCandTopic, this.roomCreatedAt - 2000);
          for (const item of candItems) {
            if (item && item.cand) {
              const str = item.cand.candidate;
              if (!this._seenCandidates.has(str)) {
                this._seenCandidates.add(str);
                await this._addIceCandidateSafe(item.cand);
              }
            }
          }
        } catch (e) {}

        try {
          const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=host`);
          if (res.ok) {
            const data = await res.json();
            if (data.candidates && data.candidates.length) {
              for (const c of data.candidates) {
                const str = c.candidate;
                if (!this._seenCandidates.has(str)) {
                  this._seenCandidates.add(str);
                  await this._addIceCandidateSafe(c);
                }
              }
            }
          }
        } catch (e) {}
      }, 450);
    }

    /* =========================================================================
     * CLIENT: Entrar em Sala
     * ========================================================================= */
    async joinRoom(roomCode) {
      this.disconnect();
      this.role = "client";
      this.status = "joining";
      this._remoteDescriptionSet = false;
      this._pendingCandidates = [];
      this._seenCandidates = new Set();

      let input = String(roomCode || "").trim();
      let customSignal = null;
      let targetCode = input;

      // Suporte a IP/URL no prompt (ex: "10.8.12.77:5200/6SKC" ou "http://10.8.12.77:5200/DG-6SKC")
      if (input.includes(":") || input.includes("/")) {
        try {
          let urlStr = input;
          if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
            urlStr = "http://" + urlStr;
          }
          const parsed = new URL(urlStr);
          customSignal = `${parsed.protocol}//${parsed.host}/api/signal`;
          const pathCode = parsed.pathname.replace(/^\//, "").trim();
          if (pathCode) targetCode = pathCode;
        } catch (e) {}
      }

      this.customSignalBaseUrl = customSignal;
      const clean = normalizeCode(targetCode);
      this.roomCode = clean || targetCode.toUpperCase();
      this.clientJoinedAt = Date.now();

      const cleanTopic = getCleanTopicCode(this.roomCode);
      const offerTopic = `dg_sig_${cleanTopic}_offer`;
      const ansTopic = `dg_sig_${cleanTopic}_ans`;
      const hostCandTopic = `dg_sig_${cleanTopic}_cand_h`;
      const guestCandTopic = `dg_sig_${cleanTopic}_cand_g`;

      this.emit("searching", this.roomCode);

      // Localiza a oferta do Host na nuvem (ntfy.sh) e/ou no servidor local
      let foundOffer = null;
      const searchStart = Date.now();
      const maxWaitMs = 10000;

      while (!foundOffer && (Date.now() - searchStart < maxWaitMs)) {
        // Tenta ntfy (universal: nuvem, celular, github.io, wifi, internet)
        try {
          const ntfyOffers = await ntfyPoll(offerTopic, Date.now() - 30 * 60 * 1000);
          if (ntfyOffers && ntfyOffers.length > 0) {
            const latest = ntfyOffers[ntfyOffers.length - 1];
            if (latest && latest.offer) {
              foundOffer = latest.offer;
              break;
            }
          }
        } catch (e) {}

        // Tenta servidor local / IP customizado
        try {
          const localRes = await fetch(`${this.getSignalBaseUrl()}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: this.roomCode })
          }).then(r => r.json()).catch(() => null);

          if (localRes && localRes.ok && localRes.offer) {
            foundOffer = localRes.offer;
            break;
          }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 500));
      }

      if (!foundOffer) {
        throw new Error(`Sala "${this.roomCode}" não encontrada!\nVerifique se o Host já clicou em CRIAR SALA e se o código está correto.`);
      }

      this.emit("offer:found", this.roomCode);

      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this._setupDataChannel(this.dc);
      };

      this.pc.onicecandidate = (e) => {
        if (e.candidate && this.status !== "disconnected") {
          const cleanCand = serializeCand(e.candidate);
          if (cleanCand) {
            const str = cleanCand.candidate;
            if (!this._seenCandidates.has(str)) {
              this._seenCandidates.add(str);
              ntfyPublish(guestCandTopic, { cand: cleanCand, from: "guest", ts: Date.now() });
              try {
                fetch(`${this.getSignalBaseUrl()}/candidate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: this.roomCode, candidate: cleanCand, from: "guest" })
                }).catch(() => {});
              } catch (err) {}
            }
          }
        }
      };

      await this._setRemoteDescSafe(foundOffer);

      const rawAnswer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(rawAnswer);

      // Aguarda 500ms para ICE reunir candidatos locais no SDP
      await waitForIceGathering(this.pc, 500);

      const answer = serializeDesc(this.pc.localDescription || rawAnswer);
      if (!answer) {
        throw new Error("Falha ao estruturar resposta WebRTC válida.");
      }

      // Publica resposta na nuvem e no servidor local
      const ansPayload = { code: this.roomCode, answer, ts: Date.now() };
      await Promise.allSettled([
        ntfyPublish(ansTopic, ansPayload),
        fetch(`${this.getSignalBaseUrl()}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: this.roomCode, answer })
        }).catch(() => {})
      ]);

      this._startGuestPolling(hostCandTopic);
      this.emit("joining", this.roomCode);
    }

    _startGuestPolling(hostCandTopic) {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          return;
        }

        try {
          const candItems = await ntfyPoll(hostCandTopic, this.clientJoinedAt - 2000);
          for (const item of candItems) {
            if (item && item.cand) {
              const str = item.cand.candidate;
              if (!this._seenCandidates.has(str)) {
                this._seenCandidates.add(str);
                await this._addIceCandidateSafe(item.cand);
              }
            }
          }
        } catch (e) {}

        try {
          const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=guest`);
          if (res.ok) {
            const data = await res.json();
            if (data.candidates && data.candidates.length) {
              for (const c of data.candidates) {
                const str = c.candidate;
                if (!this._seenCandidates.has(str)) {
                  this._seenCandidates.add(str);
                  await this._addIceCandidateSafe(c);
                }
              }
            }
          }
        } catch (e) {}
      }, 450);
    }

    /* =========================================================================
     * SETUP DO CANAL DE DADOS WEBRTC
     * ========================================================================= */
    _setupDataChannel(dc) {
      dc.onopen = () => {
        this.status = "connected";
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
        this.emit("connected", { role: this.role, roomCode: this.roomCode });
        this._startHeartbeat();

        // Se for Guest, envia HELLO inicial
        if (this.role === "client") {
          this.send({ t: "HELLO", role: "client" });
        }
      };

      dc.onclose = () => {
        this.status = "disconnected";
        this.emit("disconnected");
        this.disconnect();
      };

      dc.onerror = (err) => {
        console.warn("[Net] DataChannel error:", err);
        this.emit("error", err);
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (e) {
          console.warn("[Net] Erro ao decodificar mensagem:", e);
        }
      };
    }

    _startHeartbeat() {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.status !== "connected") return;
        this.lastPingTs = Date.now();
        this.send({ t: "PING", ts: this.lastPingTs });
      }, 1200);
    }

    _handleMessage(msg) {
      switch (msg.t) {
        case "PING":
          this.send({ t: "PONG", ts: msg.ts });
          break;

        case "PONG":
          if (msg.ts) {
            this.latency = Math.max(1, Math.round((Date.now() - msg.ts) / 2));
            this.emit("latency", this.latency);
          }
          break;

        case "HELLO":
          this.emit("guest:joined", msg);
          break;

        case "INIT_RUN":
          this.emit("net:init-run", msg);
          break;

        case "INPUTS":
          // Recebido pelo Host vindo do Client
          if (msg.axis) this.clientInputs.axis = msg.axis;
          if (msg.aim) this.clientInputs.aim = msg.aim;
          if (msg.attack) this.clientInputs._justDown.ATTACK = true;
          if (msg.dash) this.clientInputs._justDown.DASH = true;
          if (msg.potion) this.clientInputs._justDown.POTION = true;
          if (msg.skillIdx !== null && msg.skillIdx !== undefined) {
            this.clientInputs.skillIdx = msg.skillIdx;
          }
          break;

        case "WORLD_STATE":
          // Recebido pelo Client vindo do Host
          this.latestWorldState = msg;
          this.emit("net:world-state", msg);
          break;

        case "EVENT":
          this.emit("net:event", msg.name, msg.payload);
          break;

        default:
          this.emit("message", msg);
      }
    }

    send(data) {
      if (this.dc && this.dc.readyState === "open") {
        try {
          this.dc.send(typeof data === "string" ? data : JSON.stringify(data));
        } catch (e) {
          console.warn("[Net] Falha ao enviar pacote:", e);
        }
      }
    }

    sendInputs(axis, aim, justDownAttack, justDownDash, justDownPotion, skillIdx = null) {
      if (this.status !== "connected" || this.role !== "client") return;
      this.send({
        t: "INPUTS",
        axis: { x: Number(axis.x.toFixed(2)), y: Number(axis.y.toFixed(2)) },
        aim: { x: Number(aim.x.toFixed(2)), y: Number(aim.y.toFixed(2)) },
        attack: !!justDownAttack,
        dash: !!justDownDash,
        potion: !!justDownPotion,
        skillIdx
      });
    }

    sendWorldState(state) {
      if (this.status !== "connected" || this.role !== "host") return;
      state.t = "WORLD_STATE";
      this.send(state);
    }

    sendGameEvent(name, payload = {}) {
      if (this.status !== "connected") return;
      this.send({ t: "EVENT", name, payload });
    }

    disconnect() {
      if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
      if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
      if (this.dc) {
        try { this.dc.close(); } catch (e) {}
        this.dc = null;
      }
      if (this.pc) {
        try { this.pc.close(); } catch (e) {}
        this.pc = null;
      }
      this.status = "idle";
      this.role = null;
      this.roomCode = null;
      this.latestWorldState = null;
      this._remoteDescriptionSet = false;
      this._pendingCandidates = [];
      this._seenCandidates = new Set();
      this.customSignalBaseUrl = null;
      this.roomCreatedAt = 0;
    }
  }

  // Exporta globalmente
  window.DepthGateNet = new DepthGateNetManager();
})(window);
