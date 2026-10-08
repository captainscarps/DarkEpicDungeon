/**
 * DEPTHGATE — Módulo de Coop Online / Rede P2P via WebRTC DataChannel
 * Desenvolvido para comunicação de alta performance e baixa latência entre Host e Client.
 * Sinalização universal via Supabase REST (100% compatível com redes corporativas e mobile)
 * e rede local (Node.js LAN).
 */
(function(window) {
  'use strict';

  // Configuração universal de servidores STUN
  const ICE_SERVERS = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478'] }
  ];

  // Configuração Supabase REST para troca de ofertas/respostas WebRTC
  const SUPA_URL = "https://drkypjvlclvjzfuakjeo.supabase.co/rest/v1/scores";
  const SUPA_KEY = "sb_publishable_UGpQ4AxUnOWrD5qQm4nuiA_tb7mq1eR";
  const SUPA_HEADERS = {
    "apikey": SUPA_KEY,
    "Authorization": "Bearer " + SUPA_KEY,
    "Content-Type": "application/json"
  };

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
    if (!cStr || !cStr.startsWith("candidate:")) return null;
    return {
      candidate: cStr,
      sdpMid: cand.sdpMid != null ? String(cand.sdpMid) : undefined,
      sdpMLineIndex: cand.sdpMLineIndex != null ? Number(cand.sdpMLineIndex) : undefined
    };
  }

  // Compressão / Descompressão de SDP para armazenamento rápido
  async function compressToB64(obj) {
    try {
      const jsonStr = JSON.stringify(obj);
      if (typeof CompressionStream !== "undefined") {
        const cs = new CompressionStream("deflate");
        const writer = cs.writable.getWriter();
        writer.write(new TextEncoder().encode(jsonStr));
        writer.close();
        const reader = cs.readable.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        let total = 0;
        for (const c of chunks) total += c.length;
        const u8 = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) { u8.set(c, offset); offset += c.length; }
        let bin = "";
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        return btoa(bin);
      }
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } catch (e) {
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    }
  }

  async function decompressFromB64(b64) {
    try {
      const bin = atob(b64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if (typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate");
        const writer = ds.writable.getWriter();
        writer.write(u8);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        let total = 0;
        for (const c of chunks) total += c.length;
        const outU8 = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) { outU8.set(c, offset); offset += c.length; }
        return JSON.parse(new TextDecoder().decode(outU8));
      }
      return JSON.parse(decodeURIComponent(escape(bin)));
    } catch (e) {
      try {
        return JSON.parse(decodeURIComponent(escape(atob(b64))));
      } catch (e2) {
        return null;
      }
    }
  }

  async function supaPublish(pName, payload) {
    try {
      await supaDelete(pName);
      const b64 = await compressToB64(payload);
      const chunkSize = 70;
      const rows = [];
      const total = Math.ceil(b64.length / chunkSize);
      for (let i = 0; i < b64.length; i += chunkSize) {
        const part = b64.substring(i, i + chunkSize);
        rows.push({
          mode: "endless",
          player_name: pName,
          class_id: part.substring(0, 24) || "X",
          seed: part.substring(24, 56) || null,
          version: part.substring(56, 70) || null,
          depth: Math.floor(i / chunkSize) + 1,
          score: total,
          elapsed_ms: 0
        });
      }
      const res = await fetch(SUPA_URL, {
        method: "POST",
        headers: { ...SUPA_HEADERS, "Prefer": "return=minimal" },
        body: JSON.stringify(rows)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function supaFetch(pName) {
    try {
      const res = await fetch(`${SUPA_URL}?player_name=eq.${pName}&order=depth.asc`, {
        headers: SUPA_HEADERS
      });
      if (!res.ok) return null;
      const rows = await res.json();
      if (!rows || rows.length === 0) return null;
      const total = rows[0].score;
      if (rows.length < total) return null;
      let b64 = "";
      for (let i = 0; i < total; i++) {
        const r = rows[i];
        if (!r) return null;
        b64 += (r.class_id || "") + (r.seed || "") + (r.version || "");
      }
      return await decompressFromB64(b64);
    } catch (e) {
      return null;
    }
  }

  async function supaDelete(pName) {
    try {
      await fetch(`${SUPA_URL}?player_name=eq.${pName}`, {
        method: "DELETE",
        headers: SUPA_HEADERS
      });
    } catch (e) {}
  }

  // Aguarda até maxMs para que candidatos ICE locais sejam incorporados ao SDP
  async function waitForIceGathering(pc, maxMs = 1200) {
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
      this.customSignalBaseUrl = null;
      this.roomCreatedAt = 0;
      this.lastInitRun = null;

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
      } catch (err) {}
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
      this.roomCode = normalizeCode(customCode || this.generateRoomCode());
      this.roomCreatedAt = Date.now();

      const clean = getCleanTopicCode(this.roomCode);
      const offerKey = "dg_o_" + clean;
      const ansKey = "dg_a_" + clean;

      // Limpa registros anteriores desta sala
      await Promise.allSettled([supaDelete(offerKey), supaDelete(ansKey)]);

      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Cria DataChannel com ordenação garantida e baixa latência
      this.dc = this.pc.createDataChannel("depthgate", { ordered: true });
      this._setupDataChannel(this.dc);

      this.pc.onicecandidate = (e) => {
        if (e.candidate && this.status !== "disconnected") {
          const cleanCand = serializeCand(e.candidate);
          if (cleanCand) {
            try {
              fetch(`${this.getSignalBaseUrl()}/candidate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: this.roomCode, candidate: cleanCand, from: "host" })
              }).catch(() => {});
            } catch (err) {}
          }
        }
      };

      const rawOffer = await this.pc.createOffer();
      await this.pc.setLocalDescription(rawOffer);

      // Aguarda até 1200ms para ICE incorporar candidatos locais e STUN diretamente no SDP
      await waitForIceGathering(this.pc, 1200);

      const offer = serializeDesc(this.pc.localDescription || rawOffer);
      if (!offer) {
        throw new Error("Falha ao estruturar oferta WebRTC válida.");
      }

      // Publica oferta na nuvem (Supabase) e no servidor local
      await Promise.allSettled([
        supaPublish(offerKey, { code: this.roomCode, offer, ts: this.roomCreatedAt }),
        fetch(`${this.getSignalBaseUrl()}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: this.roomCode, offer })
        }).catch(() => {})
      ]);

      this._startHostPolling(offerKey, ansKey);
      this.emit("hosting", this.roomCode);
      return this.roomCode;
    }

    _startHostPolling(offerKey, ansKey) {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          return;
        }

        // 1. Busca resposta SDP do Guest no Supabase
        if (!this._remoteDescriptionSet) {
          try {
            const cloudAns = await supaFetch(ansKey);
            if (cloudAns && cloudAns.answer && !this._remoteDescriptionSet) {
              await this._setRemoteDescSafe(cloudAns.answer);
              supaDelete(offerKey);
              supaDelete(ansKey);
            }
          } catch (e) {}

          // Fallback: servidor local
          if (!this._remoteDescriptionSet) {
            try {
              const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=host`);
              if (res.ok) {
                const data = await res.json();
                if (data.answer && !this._remoteDescriptionSet) {
                  await this._setRemoteDescSafe(data.answer);
                }
                if (data.candidates && data.candidates.length) {
                  for (const c of data.candidates) {
                    await this._addIceCandidateSafe(c);
                  }
                }
              }
            } catch (e) {}
          }
        }
      }, 500);
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

      const cleanCode = getCleanTopicCode(this.roomCode);
      const offerKey = "dg_o_" + cleanCode;
      const ansKey = "dg_a_" + cleanCode;

      this.emit("searching", this.roomCode);

      // Localiza a oferta do Host na nuvem (Supabase) e/ou no servidor local
      let foundOffer = null;
      const searchStart = Date.now();
      const maxWaitMs = 15000;

      while (!foundOffer && (Date.now() - searchStart < maxWaitMs)) {
        // 1. Tenta Supabase (universal: nuvem, celular, github.io, wifi corporativo)
        try {
          const cloudData = await supaFetch(offerKey);
          if (cloudData && cloudData.offer) {
            foundOffer = cloudData.offer;
            break;
          }
        } catch (e) {}

        // 2. Tenta servidor local simultaneamente
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

        await new Promise(r => setTimeout(r, 600));
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
            try {
              fetch(`${this.getSignalBaseUrl()}/candidate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: this.roomCode, candidate: cleanCand, from: "guest" })
              }).catch(() => {});
            } catch (err) {}
          }
        }
      };

      await this._setRemoteDescSafe(foundOffer);

      const rawAnswer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(rawAnswer);

      // Aguarda até 1200ms para ICE reunir candidatos locais e STUN no SDP
      await waitForIceGathering(this.pc, 1200);

      const answer = serializeDesc(this.pc.localDescription || rawAnswer);
      if (!answer) {
        throw new Error("Falha ao estruturar resposta WebRTC válida.");
      }

      // Publica resposta na nuvem e no servidor local
      await Promise.allSettled([
        supaPublish(ansKey, { code: this.roomCode, answer, ts: Date.now() }),
        fetch(`${this.getSignalBaseUrl()}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: this.roomCode, answer })
        }).catch(() => {})
      ]);

      this._startGuestPolling();
      this.emit("joining", this.roomCode);
    }

    _startGuestPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          return;
        }

        try {
          const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=guest`);
          if (res.ok) {
            const data = await res.json();
            if (data.candidates && data.candidates.length) {
              for (const c of data.candidates) {
                await this._addIceCandidateSafe(c);
              }
            }
          }
        } catch (e) {}
      }, 500);
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
        } else if (this.role === "host") {
          // Se o Host já tiver inicializado a run, reenvia para o Guest
          if (this.lastInitRun) {
            this.send(this.lastInitRun);
          }
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
          if (this.role === "host" && this.lastInitRun) {
            this.send(this.lastInitRun);
          }
          break;

        case "GUEST_SELECT_HERO":
          this.emit("guest:select-hero", msg.classId);
          this.emit("message", msg);
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
      this.customSignalBaseUrl = null;
      this.roomCreatedAt = 0;
      this.lastInitRun = null;
    }
  }

  // Exporta globalmente
  window.DepthGateNet = new DepthGateNetManager();
})(window);
