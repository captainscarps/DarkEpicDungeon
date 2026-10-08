/**
 * DEPTHGATE — Módulo de Cadastro, Perfil e Autenticação de Usuário
 * Suporte a Supabase Auth, foto de perfil customizada (upload), avatares de heróis,
 * detecção automática de plataforma (Steam / Celular / Navegador) e exibição de foto no Ranking.
 */
(function(window) {
  'use strict';

  // Configurações padrão do Supabase
  const SUPA_DEFAULT_URL = "https://drkypjvlclvjzfuakjeo.supabase.co";
  const SUPA_DEFAULT_KEY = "sb_publishable_UGpQ4AxUnOWrD5qQm4nuiA_tb7mq1eR";

  // Chaves de armazenamento local
  const STORAGE_PROFILE_KEY = "depthgate:user_profile";
  const STORAGE_SESSION_KEY = "depthgate:auth_session";

  // Avatares clássicos dos heróis em SVG vetorial de alta definição com moldura dourada
  const HERO_AVATARS = {
    warrior: {
      id: "warrior",
      name: "Guerreiro",
      color: "#c94a29",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#2d120a" stroke="#c9a24a" stroke-width="2.5"/><path d="M22 46 L32 18 L42 46 Z" fill="#c94a29" stroke="#ffd24a" stroke-width="1.5"/><rect x="29" y="16" width="6" height="28" fill="#e8d8b8"/><circle cx="32" cy="24" r="5" fill="#ffd24a"/><path d="M18 42 H46 L32 50 Z" fill="#8a2010"/></svg>'
    },
    berserker: {
      id: "berserker",
      name: "Samurai",
      color: "#d91e36",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#250910" stroke="#c9a24a" stroke-width="2.5"/><path d="M20 22 C32 14 44 22 44 32 C44 42 32 46 20 42 Z" fill="#d91e36"/><path d="M16 48 L48 16" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="32" r="7" fill="#ffd24a"/></svg>'
    },
    archer: {
      id: "archer",
      name: "Arqueira",
      color: "#2a9d8f",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0c221c" stroke="#c9a24a" stroke-width="2.5"/><path d="M24 16 C38 24 38 40 24 48" fill="none" stroke="#2a9d8f" stroke-width="3"/><line x1="24" y1="16" x2="24" y2="48" stroke="#c9a24a" stroke-width="1.5"/><line x1="18" y1="32" x2="46" y2="32" stroke="#e8d8b8" stroke-width="2.5"/><polygon points="46,32 40,28 40,36" fill="#ffd24a"/></svg>'
    },
    mage: {
      id: "mage",
      name: "Mago",
      color: "#8338ec",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#180b2c" stroke="#c9a24a" stroke-width="2.5"/><polygon points="32,14 42,24 32,34 22,24" fill="#8338ec"/><circle cx="32" cy="24" r="5" fill="#c77dff"/><path d="M26 38 L38 38 L32 50 Z" fill="#ffd24a"/><circle cx="32" cy="46" r="3" fill="#ffffff"/></svg>'
    },
    rogue: {
      id: "rogue",
      name: "Ladino",
      color: "#3a86ff",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0d1b2a" stroke="#c9a24a" stroke-width="2.5"/><path d="M20 20 L44 44 M44 20 L20 44" stroke="#3a86ff" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="#ffd24a"/><path d="M26 16 L32 24 L38 16" fill="#e8d8b8"/></svg>'
    },
    paladin: {
      id: "paladin",
      name: "Paladino",
      color: "#ffb703",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#2b1f06" stroke="#c9a24a" stroke-width="2.5"/><path d="M22 24 H42 V38 C42 44 32 50 32 50 C32 50 22 44 22 38 Z" fill="#ffb703" stroke="#ffd24a" stroke-width="1.5"/><line x1="32" y1="26" x2="32" y2="44" stroke="#ffffff" stroke-width="2.5"/><line x1="26" y1="32" x2="38" y2="32" stroke="#ffffff" stroke-width="2.5"/></svg>'
    }
  };

  function svgToDataUrl(svgStr) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(svgStr);
  }

  // Obter Data URL para avatar padrão de herói
  function getHeroAvatarDataUrl(heroId) {
    const hero = HERO_AVATARS[heroId] || HERO_AVATARS.warrior;
    return svgToDataUrl(hero.svg);
  }

  // Detecção de Plataforma
  function detectPlatform() {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("platform") === "steam") return "steam";

      // Verificação de ambiente Steam (Greenworks / Steamworks.js / Electron com Steam)
      if (typeof window.greenworks !== "undefined" || typeof window.SteamAPI !== "undefined" || (window.process && window.process.versions && window.process.versions.steam)) {
        return "steam";
      }

      // Verificação de Mobile / Tablet / Touch nativo
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (isMobileUA || isCoarse || typeof window.Capacitor !== "undefined" || typeof window.cordova !== "undefined") {
        return "mobile";
      }
    } catch (e) {}
    return "browser";
  }

  // Recupera credenciais do Supabase (prioriza config do jogo se disponível)
  function getSupaConfig() {
    const cfg = { url: SUPA_DEFAULT_URL, anonKey: SUPA_DEFAULT_KEY };
    try {
      if (window.__ON && window.__ON.cfg && window.__ON.cfg.url) {
        cfg.url = window.__ON.cfg.url;
        cfg.anonKey = window.__ON.cfg.anonKey || SUPA_DEFAULT_KEY;
      }
    } catch (e) {}
    return cfg;
  }

  function getSupaHeaders(token) {
    const cfg = getSupaConfig();
    const h = {
      "apikey": cfg.anonKey,
      "Content-Type": "application/json"
    };
    if (token) {
      h["Authorization"] = "Bearer " + token;
    } else {
      h["Authorization"] = "Bearer " + cfg.anonKey;
    }
    return h;
  }

  // Classe Principal DepthGateUser
  class DepthGateUserManager {
    constructor() {
      this.platform = detectPlatform();
      this.profile = this.loadProfile();
      this.session = this.loadSession();
      this.modalEl = null;
      this.badgeEl = null;

      // Se for Steam ou Celular e o perfil ainda for padrão, atribui identidade automática
      this.applyPlatformDefaults();

      // Injeta estilos e componentes visuais assim que o DOM estiver pronto
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.initUI());
      } else {
        this.initUI();
      }
    }

    loadProfile() {
      try {
        const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return {
        username: "Aventureiro",
        avatarType: "hero", // "hero" ou "custom"
        avatarHero: "warrior",
        avatarCustom: null,
        email: null,
        isRegistered: false
      };
    }

    saveProfile(data) {
      this.profile = { ...this.profile, ...data };
      try {
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(this.profile));
      } catch (e) {}
      this.updateBadge();
      window.dispatchEvent(new CustomEvent("depthgate:user_updated", { detail: this.profile }));
    }

    loadSession() {
      try {
        const raw = localStorage.getItem(STORAGE_SESSION_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    }

    saveSession(sess) {
      this.session = sess;
      try {
        if (sess) {
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sess));
        } else {
          localStorage.removeItem(STORAGE_SESSION_KEY);
        }
      } catch (e) {}
    }

    applyPlatformDefaults() {
      if (this.platform === "steam") {
        let steamName = "Jogador Steam";
        try {
          if (window.greenworks && window.greenworks.getSteamId) {
            steamName = window.greenworks.getSteamId().screenName || steamName;
          }
        } catch (e) {}
        if (!this.profile.isRegistered && this.profile.username === "Aventureiro") {
          this.profile.username = steamName;
          this.profile.avatarType = "hero";
          this.profile.avatarHero = "berserker";
          this.saveProfile(this.profile);
        }
      } else if (this.platform === "mobile") {
        if (!this.profile.isRegistered && this.profile.username === "Aventureiro") {
          const randNum = Math.floor(100 + Math.random() * 900);
          this.profile.username = "Herói Móvel " + randNum;
          this.profile.avatarType = "hero";
          this.profile.avatarHero = "archer";
          this.saveProfile(this.profile);
        }
      }
    }

    // Retorna a URL da imagem atual do jogador (seja customizada ou de herói)
    getAvatarUrl(profile = this.profile) {
      if (profile && profile.avatarType === "custom" && profile.avatarCustom) {
        return profile.avatarCustom;
      }
      const heroKey = (profile && profile.avatarHero) || "warrior";
      return getHeroAvatarDataUrl(heroKey);
    }

    // Retorna um avatar para qualquer jogador da lista do Ranking
    getRankingAvatar(playerRow) {
      if (!playerRow) return getHeroAvatarDataUrl("warrior");
      
      // Se tiver campo avatar explícito no objeto retornado do Supabase
      if (playerRow.avatar) {
        if (playerRow.avatar.startsWith("data:") || playerRow.avatar.startsWith("http")) {
          return playerRow.avatar;
        }
        if (HERO_AVATARS[playerRow.avatar]) {
          return getHeroAvatarDataUrl(playerRow.avatar);
        }
      }

      // Se for o próprio jogador local
      if (this.profile && this.profile.username && playerRow.player_name === this.profile.username) {
        return this.getAvatarUrl();
      }

      // Mapeamento automático pela classe jogada
      const cls = String(playerRow.class_id || "").toLowerCase();
      if (cls.includes("warrior") || cls.includes("guerreiro")) return getHeroAvatarDataUrl("warrior");
      if (cls.includes("berserker") || cls.includes("samurai")) return getHeroAvatarDataUrl("berserker");
      if (cls.includes("archer") || cls.includes("arqueiro")) return getHeroAvatarDataUrl("archer");
      if (cls.includes("mage") || cls.includes("mago")) return getHeroAvatarDataUrl("mage");
      if (cls.includes("rogue") || cls.includes("ladino")) return getHeroAvatarDataUrl("rogue");
      if (cls.includes("paladin") || cls.includes("paladino")) return getHeroAvatarDataUrl("paladin");

      return getHeroAvatarDataUrl("warrior");
    }

    // ==================== Autenticação Supabase ====================

    async registerWithSupabase(email, password, username, avatarData) {
      const cfg = getSupaConfig();
      const endpoint = `${cfg.url}/auth/v1/signup`;
      const meta = {
        username: username,
        avatar_type: avatarData.avatarType,
        avatar_hero: avatarData.avatarHero,
        avatar_custom: avatarData.avatarCustom,
        platform: this.platform
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: getSupaHeaders(),
          body: JSON.stringify({
            email: email,
            password: password,
            data: meta
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || data.error_description || data.message || "Erro ao criar conta no Supabase");
        }

        // Se cadastrou e já retornou sessão (sem confirmação de email necessária)
        if (data.access_token) {
          this.saveSession(data);
        }

        this.saveProfile({
          username: username,
          email: email,
          avatarType: avatarData.avatarType,
          avatarHero: avatarData.avatarHero,
          avatarCustom: avatarData.avatarCustom,
          isRegistered: true
        });

        return { success: true, user: data.user || data };
      } catch (err) {
        // Se houver limite de email ou erro de SMTP no Supabase, salva perfil localmente
        if (err.message && err.message.includes("rate limit")) {
          this.saveProfile({
            username: username,
            email: email,
            avatarType: avatarData.avatarType,
            avatarHero: avatarData.avatarHero,
            avatarCustom: avatarData.avatarCustom,
            isRegistered: true
          });
          return { success: true, offlineNotice: true };
        }
        throw err;
      }
    }

    async loginWithSupabase(email, password) {
      const cfg = getSupaConfig();
      const endpoint = `${cfg.url}/auth/v1/token?grant_type=password`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: getSupaHeaders(),
        body: JSON.stringify({ email: email, password: password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error_description || data.msg || data.message || "E-mail ou senha incorretos");
      }

      this.saveSession(data);
      const uMeta = data.user?.user_metadata || {};
      this.saveProfile({
        username: uMeta.username || this.profile.username,
        email: email,
        avatarType: uMeta.avatar_type || this.profile.avatarType,
        avatarHero: uMeta.avatar_hero || this.profile.avatarHero,
        avatarCustom: uMeta.avatar_custom || this.profile.avatarCustom,
        isRegistered: true
      });

      return { success: true, user: data.user };
    }

    logout() {
      this.saveSession(null);
      this.saveProfile({
        email: null,
        isRegistered: false
      });
    }

    // ==================== Otimizador de Foto (Canvas) ====================

    processImageFile(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
          return reject(new Error("Por favor, selecione um arquivo de imagem válido."));
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const size = 64; // Miniatura otimizada para ícones e ranking
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            // Recorte proporcional centralizado (aspect-fill)
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            // Exporta como JPEG compacto (qualidade 85% ~ 2kb a 4kb)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
        reader.readAsDataURL(file);
      });
    }

    // ==================== Interface e Modais ====================

    initUI() {
      this.injectStyles();
      this.createBadge();
      this.createModal();
    }

    injectStyles() {
      if (document.getElementById("dg-auth-styles")) return;
      const style = document.createElement("style");
      style.id = "dg-auth-styles";
      style.textContent = `
        /* Badge de Perfil Flutuante no Topo Esquerdo */
        #dg-profile-badge {
          position: fixed;
          top: 14px;
          left: 14px;
          z-index: 900;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(18, 12, 6, 0.85);
          border: 1px solid rgba(201, 162, 74, 0.6);
          border-radius: 24px;
          padding: 4px 14px 4px 5px;
          cursor: pointer;
          backdrop-filter: blur(6px);
          color: #e8d8b8;
          font-family: Georgia, 'Times New Roman', serif;
          transition: background 0.2s, transform 0.15s, border-color 0.2s, box-shadow 0.2s;
          user-select: none;
          touch-action: manipulation;
        }
        #dg-profile-badge:hover {
          background: rgba(38, 24, 12, 0.95);
          border-color: #ffd24a;
          transform: scale(1.04);
          box-shadow: 0 0 14px rgba(201, 162, 74, 0.5);
        }
        #dg-profile-badge:active {
          transform: scale(0.96);
        }
        #dg-profile-badge .avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #ffd24a;
          box-shadow: 0 0 8px rgba(255, 210, 74, 0.4);
        }
        #dg-profile-badge .user-meta {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        #dg-profile-badge .username {
          font-size: 13px;
          font-weight: bold;
          color: #f7e7c4;
          letter-spacing: 0.5px;
        }
        #dg-profile-badge .platform-tag {
          font-size: 9px;
          font-family: 'Courier New', monospace;
          color: #a89878;
        }

        /* Modal Escuro Medieval */
        #dg-auth-modal {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(5, 3, 2, 0.85);
          backdrop-filter: blur(8px);
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: dg-fade-in 0.25s ease-out;
        }
        #dg-auth-modal.visible {
          display: flex;
        }
        @keyframes dg-fade-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .dg-modal-box {
          background: radial-gradient(ellipse at center, #1f140a 0%, #0d0804 100%);
          border: 2px solid #c9a24a;
          border-radius: 12px;
          box-shadow: 0 0 32px rgba(0, 0, 0, 0.9), 0 0 20px rgba(201, 162, 74, 0.25);
          width: 100%;
          max-width: 460px;
          max-height: 90vh;
          overflow-y: auto;
          color: #e8d8b8;
          font-family: Georgia, 'Times New Roman', serif;
          position: relative;
          padding: 24px;
        }
        .dg-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: #c9a24a;
          font-size: 22px;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.15s, color 0.15s;
        }
        .dg-modal-close:hover {
          color: #ffd24a;
          transform: scale(1.2);
        }
        .dg-modal-title {
          font-size: 20px;
          color: #ffd24a;
          text-align: center;
          margin: 0 0 16px 0;
          letter-spacing: 2px;
          text-shadow: 0 0 10px rgba(255, 210, 74, 0.4);
        }

        /* Abas do Modal */
        .dg-tabs {
          display: flex;
          border-bottom: 1px solid rgba(201, 162, 74, 0.3);
          margin-bottom: 20px;
        }
        .dg-tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 10px;
          color: #a89878;
          font-family: Georgia, serif;
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s, border-bottom 0.2s;
        }
        .dg-tab-btn.active {
          color: #ffd24a;
          font-weight: bold;
          border-bottom: 2px solid #ffd24a;
        }

        /* Foto e Avatar Picker */
        .dg-avatar-preview-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .dg-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid #ffd24a;
          object-fit: cover;
          box-shadow: 0 0 16px rgba(201, 162, 74, 0.4);
        }
        .dg-upload-btn {
          background: rgba(30, 20, 10, 0.9);
          border: 1px dashed #c9a24a;
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 12px;
          color: #ffd24a;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dg-upload-btn:hover {
          background: rgba(50, 32, 16, 0.95);
          border-style: solid;
          transform: scale(1.03);
        }
        .dg-hero-avatars {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .dg-hero-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid #5a4220;
          background: #140d06;
          cursor: pointer;
          padding: 0;
          transition: all 0.15s;
          overflow: hidden;
        }
        .dg-hero-btn img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .dg-hero-btn.selected {
          border-color: #ffd24a;
          box-shadow: 0 0 10px #ffd24a;
          transform: scale(1.15);
        }

        /* Formulários e Inputs */
        .dg-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
          text-align: left;
        }
        .dg-form-group label {
          font-size: 11px;
          color: #c9a24a;
          letter-spacing: 1px;
        }
        .dg-input {
          background: rgba(10, 6, 3, 0.85);
          border: 1px solid rgba(201, 162, 74, 0.4);
          border-radius: 6px;
          padding: 9px 12px;
          color: #f7e7c4;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          outline: none;
          transition: border-color 0.2s;
        }
        .dg-input:focus {
          border-color: #ffd24a;
          box-shadow: 0 0 8px rgba(255, 210, 74, 0.3);
        }
        .dg-btn-primary {
          background: linear-gradient(180deg, #c9a24a 0%, #85611f 100%);
          border: 1px solid #ffd24a;
          color: #0a0806;
          font-weight: bold;
          font-size: 13px;
          letter-spacing: 1px;
          padding: 10px 18px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
          transition: all 0.15s;
        }
        .dg-btn-primary:hover {
          background: linear-gradient(180deg, #ffd24a 0%, #a87f28 100%);
          transform: scale(1.02);
          box-shadow: 0 0 14px rgba(255, 210, 74, 0.5);
        }
        .dg-btn-secondary {
          background: rgba(20, 14, 8, 0.8);
          border: 1px solid #85611f;
          color: #d8cdb4;
          font-size: 12px;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          margin-top: 8px;
          transition: all 0.15s;
        }
        .dg-btn-secondary:hover {
          border-color: #ffd24a;
          color: #ffd24a;
        }
        .dg-msg {
          font-size: 11px;
          margin-top: 10px;
          text-align: center;
          font-family: 'Courier New', monospace;
          min-height: 18px;
        }
        .dg-msg.success { color: #8ae0b0; }
        .dg-msg.error { color: #ff6b6b; }
      `;
      document.head.appendChild(style);
    }

    createBadge() {
      if (document.getElementById("dg-profile-badge")) return;
      const b = document.createElement("div");
      b.id = "dg-profile-badge";
      b.title = "Clique para editar seu Perfil e Foto";
      b.innerHTML = `
        <img class="avatar-img" src="${this.getAvatarUrl()}" alt="Avatar" />
        <div class="user-meta">
          <span class="username">${this.profile.username || "Aventureiro"}</span>
          <span class="platform-tag">${this.getPlatformLabel()}</span>
        </div>
      `;
      b.addEventListener("click", () => this.openModal());
      document.body.appendChild(b);
      this.badgeEl = b;
    }

    getPlatformLabel() {
      if (this.platform === "steam") return "STEAM";
      if (this.platform === "mobile") return "MOBILE";
      if (this.profile.isRegistered) return "CONTA ATIVA";
      return "CONVIDADO";
    }

    updateBadge() {
      if (!this.badgeEl) return;
      const img = this.badgeEl.querySelector(".avatar-img");
      const name = this.badgeEl.querySelector(".username");
      const tag = this.badgeEl.querySelector(".platform-tag");
      if (img) img.src = this.getAvatarUrl();
      if (name) name.textContent = this.profile.username || "Aventureiro";
      if (tag) tag.textContent = this.getPlatformLabel();
    }

    createModal() {
      if (document.getElementById("dg-auth-modal")) return;
      const m = document.createElement("div");
      m.id = "dg-auth-modal";
      m.innerHTML = `
        <div class="dg-modal-box">
          <button class="dg-modal-close" type="button">&times;</button>
          <div class="dg-modal-title">PERFIL DO JOGADOR</div>

          <div class="dg-tabs">
            <button class="dg-tab-btn active" data-tab="profile" type="button">MEU PERFIL</button>
            <button class="dg-tab-btn" data-tab="online" type="button">CONTA ONLINE (SUPABASE)</button>
          </div>

          <!-- ABA 1: MEU PERFIL -->
          <div class="dg-tab-content" id="dg-tab-profile">
            <div class="dg-avatar-preview-wrap">
              <img class="dg-avatar-large" id="dg-modal-avatar-preview" src="${this.getAvatarUrl()}" alt="Avatar" />
              <label class="dg-upload-btn">
                📸 ENVIAR MINHA FOTO
                <input type="file" id="dg-avatar-file-input" accept="image/*" style="display:none;" />
              </label>
              <div style="font-size:10px; color:#8a7f66;">Ou escolha um herói abaixo:</div>
              <div class="dg-hero-avatars" id="dg-hero-avatars-list">
                ${Object.keys(HERO_AVATARS).map(k => `
                  <button type="button" class="dg-hero-btn ${this.profile.avatarHero === k && this.profile.avatarType === 'hero' ? 'selected' : ''}" data-hero="${k}" title="${HERO_AVATARS[k].name}">
                    <img src="${getHeroAvatarDataUrl(k)}" alt="${HERO_AVATARS[k].name}" />
                  </button>
                `).join("")}
              </div>
            </div>

            <div class="dg-form-group">
              <label>NOME / APELIDO NO RANKING:</label>
              <input type="text" class="dg-input" id="dg-input-username" value="${this.profile.username || ''}" maxlength="16" placeholder="Seu apelido..." />
            </div>

            <div style="font-size:10px; color:#8a7f66; margin-bottom:12px;">
              Plataforma detectada: <strong style="color:#ffd24a;">${this.getPlatformLabel()}</strong>
            </div>

            <button type="button" class="dg-btn-primary" id="dg-btn-save-profile">SALVAR ALTERAÇÕES</button>
            <div class="dg-msg" id="dg-profile-msg"></div>
          </div>

          <!-- ABA 2: CONTA SUPABASE -->
          <div class="dg-tab-content" id="dg-tab-online" style="display:none;">
            <div style="font-size:11px; color:#a89878; margin-bottom:16px; line-height:1.4;">
              Vincule sua conta para sincronizar o perfil, foto e pontuações do ranking com o banco Supabase na nuvem.
            </div>

            <div id="dg-auth-logged-view" style="${this.profile.email ? 'display:block;' : 'display:none;'}">
              <div style="font-size:13px; color:#ffd24a; margin-bottom:8px;">
                Conectado como: <strong id="dg-logged-email">${this.profile.email || ''}</strong>
              </div>
              <button type="button" class="dg-btn-secondary" id="dg-btn-logout">DESCONECTAR DA CONTA</button>
            </div>

            <div id="dg-auth-login-form" style="${this.profile.email ? 'display:none;' : 'display:block;'}">
              <div class="dg-form-group">
                <label>E-MAIL:</label>
                <input type="email" class="dg-input" id="dg-input-email" placeholder="seu-email@exemplo.com" />
              </div>
              <div class="dg-form-group">
                <label>SENHA:</label>
                <input type="password" class="dg-input" id="dg-input-password" placeholder="Sua senha secreta..." />
              </div>

              <button type="button" class="dg-btn-primary" id="dg-btn-login">ENTRAR NA CONTA</button>
              <button type="button" class="dg-btn-secondary" id="dg-btn-register">CRIAR NOVA CONTA</button>
            </div>

            <div class="dg-msg" id="dg-auth-msg"></div>
          </div>
        </div>
      `;

      document.body.appendChild(m);
      this.modalEl = m;
      this.bindModalEvents();
    }

    bindModalEvents() {
      const m = this.modalEl;
      if (!m) return;

      // Fechar modal
      m.querySelector(".dg-modal-close").addEventListener("click", () => this.closeModal());
      m.addEventListener("click", (e) => {
        if (e.target === m) this.closeModal();
      });

      // Alternar Abas
      const tabBtns = m.querySelectorAll(".dg-tab-btn");
      tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          tabBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const tab = btn.dataset.tab;
          m.querySelector("#dg-tab-profile").style.display = tab === "profile" ? "block" : "none";
          m.querySelector("#dg-tab-online").style.display = tab === "online" ? "block" : "none";
        });
      });

      // Upload de Foto
      const fileInp = m.querySelector("#dg-avatar-file-input");
      const preview = m.querySelector("#dg-modal-avatar-preview");
      fileInp.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const dataUrl = await this.processImageFile(file);
          preview.src = dataUrl;
          this.profile.avatarType = "custom";
          this.profile.avatarCustom = dataUrl;
          // Desmarca heróis selecionados
          m.querySelectorAll(".dg-hero-btn").forEach(b => b.classList.remove("selected"));
          this.showMsg("#dg-profile-msg", "Foto carregada com sucesso! Clique em Salvar.", "success");
        } catch (err) {
          this.showMsg("#dg-profile-msg", err.message, "error");
        }
      });

      // Seleção de Avatar de Herói
      const heroBtns = m.querySelectorAll(".dg-hero-btn");
      heroBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          heroBtns.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          const heroKey = btn.dataset.hero;
          this.profile.avatarType = "hero";
          this.profile.avatarHero = heroKey;
          preview.src = getHeroAvatarDataUrl(heroKey);
        });
      });

      // Salvar Perfil
      m.querySelector("#dg-btn-save-profile").addEventListener("click", () => {
        const uname = m.querySelector("#dg-input-username").value.trim() || "Aventureiro";
        this.saveProfile({
          username: uname.slice(0, 16),
          avatarType: this.profile.avatarType,
          avatarHero: this.profile.avatarHero,
          avatarCustom: this.profile.avatarCustom
        });
        this.showMsg("#dg-profile-msg", "Perfil salvo com sucesso!", "success");
        setTimeout(() => this.closeModal(), 600);
      });

      // Login Supabase
      m.querySelector("#dg-btn-login").addEventListener("click", async () => {
        const email = m.querySelector("#dg-input-email").value.trim();
        const pass = m.querySelector("#dg-input-password").value.trim();
        if (!email || !pass) {
          return this.showMsg("#dg-auth-msg", "Preencha e-mail e senha.", "error");
        }
        try {
          this.showMsg("#dg-auth-msg", "Entrando...", "success");
          await this.loginWithSupabase(email, pass);
          this.showMsg("#dg-auth-msg", "Login efetuado com sucesso!", "success");
          this.refreshAuthViews();
        } catch (err) {
          this.showMsg("#dg-auth-msg", err.message, "error");
        }
      });

      // Cadastro Supabase
      m.querySelector("#dg-btn-register").addEventListener("click", async () => {
        const email = m.querySelector("#dg-input-email").value.trim();
        const pass = m.querySelector("#dg-input-password").value.trim();
        const uname = m.querySelector("#dg-input-username").value.trim() || "Aventureiro";
        if (!email || !pass) {
          return this.showMsg("#dg-auth-msg", "Preencha e-mail e senha para criar a conta.", "error");
        }
        if (pass.length < 6) {
          return this.showMsg("#dg-auth-msg", "A senha deve ter no mínimo 6 caracteres.", "error");
        }
        try {
          this.showMsg("#dg-auth-msg", "Criando conta...", "success");
          const res = await this.registerWithSupabase(email, pass, uname, {
            avatarType: this.profile.avatarType,
            avatarHero: this.profile.avatarHero,
            avatarCustom: this.profile.avatarCustom
          });
          if (res.offlineNotice) {
            this.showMsg("#dg-auth-msg", "Conta criada e salva localmente!", "success");
          } else {
            this.showMsg("#dg-auth-msg", "Conta criada com sucesso no Supabase!", "success");
          }
          this.refreshAuthViews();
        } catch (err) {
          this.showMsg("#dg-auth-msg", err.message, "error");
        }
      });

      // Logout
      m.querySelector("#dg-btn-logout").addEventListener("click", () => {
        this.logout();
        this.refreshAuthViews();
        this.showMsg("#dg-auth-msg", "Desconectado.", "success");
      });
    }

    refreshAuthViews() {
      const m = this.modalEl;
      if (!m) return;
      const loggedView = m.querySelector("#dg-auth-logged-view");
      const loginForm = m.querySelector("#dg-auth-login-form");
      const loggedEmail = m.querySelector("#dg-logged-email");
      if (this.profile.email) {
        loggedView.style.display = "block";
        loginForm.style.display = "none";
        loggedEmail.textContent = this.profile.email;
      } else {
        loggedView.style.display = "none";
        loginForm.style.display = "block";
      }
      this.updateBadge();
    }

    showMsg(selector, text, type) {
      const el = this.modalEl?.querySelector(selector);
      if (!el) return;
      el.className = "dg-msg " + (type || "");
      el.textContent = text;
    }

    openModal() {
      if (!this.modalEl) this.createModal();
      this.modalEl.classList.add("visible");
      // Atualiza valores dos campos
      const nameInp = this.modalEl.querySelector("#dg-input-username");
      if (nameInp) nameInp.value = this.profile.username || "";
      const preview = this.modalEl.querySelector("#dg-modal-avatar-preview");
      if (preview) preview.src = this.getAvatarUrl();
      this.refreshAuthViews();
    }

    closeModal() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }

    // Retorna o perfil atual do jogador
    getProfile() {
      return this.profile;
    }
  }

  // Instância Global
  window.DepthGateUser = new DepthGateUserManager();

})(window);
