/**
 * DEPTHGATE — Módulo de Coop Online / Rede P2P via WebRTC DataChannel
 * Desenvolvido para comunicação de alta performance e baixa latência entre Host e Client.
 */
(function(window) {
  'use strict';

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

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
      // Usa a mesma origem do jogo
      const loc = window.location;
      return `${loc.protocol}//${loc.host}/api/signal`;
    }

    generateRoomCode() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "DG-";
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    }

    /* =========================================================================
     * HOST: Criar Sala
     * ========================================================================= */
    async hostRoom(customCode) {
      this.disconnect();
      this.role = "host";
      this.status = "hosting";
      this.roomCode = (customCode || this.generateRoomCode()).toUpperCase();

      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Cria DataChannel com baixa latência
      this.dc = this.pc.createDataChannel("depthgate", {
        ordered: true
      });
      this._setupDataChannel(this.dc);

      this.pc.onicecandidate = async (e) => {
        if (e.candidate && this.status !== "disconnected") {
          try {
            await fetch(`${this.getSignalBaseUrl()}/candidate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: this.roomCode, candidate: e.candidate, from: "host" })
            });
          } catch (err) {}
        }
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Registra oferta no sinalizador
      try {
        await fetch(`${this.getSignalBaseUrl()}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: this.roomCode, offer })
        });
      } catch (err) {
        console.warn("[Net] Sinalizador local indisponível, modo direto/convite ativo.");
      }

      this._startHostPolling();
      this.emit("hosting", this.roomCode);
      return this.roomCode;
    }

    _startHostPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") return;
        try {
          const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=host`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.answer && !this.pc.currentRemoteDescription) {
            await this.pc.setRemoteDescription(data.answer);
          }
          if (data.candidates && data.candidates.length) {
            for (const c of data.candidates) {
              await this.pc.addIceCandidate(c);
            }
          }
        } catch (e) {}
      }, 500);
    }

    /* =========================================================================
     * CLIENT: Entrar em Sala
     * ========================================================================= */
    async joinRoom(roomCode) {
      this.disconnect();
      this.role = "client";
      this.status = "joining";
      this.roomCode = String(roomCode || "").trim().toUpperCase();

      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this._setupDataChannel(this.dc);
      };

      this.pc.onicecandidate = async (e) => {
        if (e.candidate && this.status !== "disconnected") {
          try {
            await fetch(`${this.getSignalBaseUrl()}/candidate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: this.roomCode, candidate: e.candidate, from: "guest" })
            });
          } catch (err) {}
        }
      };

      // Obtém oferta do host
      const joinRes = await fetch(`${this.getSignalBaseUrl()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: this.roomCode })
      }).then(r => r.json());

      if (!joinRes.ok || !joinRes.offer) {
        throw new Error(joinRes.error || "Sala não encontrada");
      }

      await this.pc.setRemoteDescription(joinRes.offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      await fetch(`${this.getSignalBaseUrl()}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: this.roomCode, answer })
      });

      this._startGuestPolling();
      this.emit("joining", this.roomCode);
    }

    _startGuestPolling() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(async () => {
        if (this.status === "connected" || this.status === "disconnected") return;
        try {
          const res = await fetch(`${this.getSignalBaseUrl()}/poll/${this.roomCode}?role=guest`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.candidates && data.candidates.length) {
            for (const c of data.candidates) {
              await this.pc.addIceCandidate(c);
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
        if (this.pollInterval) clearInterval(this.pollInterval);
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
    }
  }

  // Exporta globalmente
  window.DepthGateNet = new DepthGateNetManager();
})(window);
