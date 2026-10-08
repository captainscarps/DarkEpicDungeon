/**
 * DEPTHGATE — Módulo de Cadastro, Perfil e Autenticação de Usuário
 * Suporte a Supabase Cloud (tabela 'profiles' e Supabase Auth), fotos customizadas (upload otimizado),
 * avatares de heróis, detecção automática de plataforma e sincronização entre múltiplos dispositivos/navegadores.
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

  function getHeroAvatarDataUrl(heroId) {
    const hero = HERO_AVATARS[heroId] || HERO_AVATARS.warrior;
    return svgToDataUrl(hero.svg);
  }

  // Hash SHA-256 para senhas locais/tabela
  async function hashPassword(password, salt = "depthgate_v1_") {
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(salt + String(password));
        const hashBuf = await window.crypto.subtle.digest("SHA-256", data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    let h = 0;
    const str = salt + String(password);
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return "dg_" + Math.abs(h).toString(16);
  }

  // Detecção de Plataforma
  function detectPlatform() {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("platform") === "steam") return "steam";

      if (typeof window.greenworks !== "undefined" || typeof window.SteamAPI !== "undefined" || (window.process && window.process.versions && window.process.versions.steam)) {
        return "steam";
      }

      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (isMobileUA || isCoarse || typeof window.Capacitor !== "undefined" || typeof window.cordova !== "undefined") {
        return "mobile";
      }
    } catch (e) {}
    return "browser";
  }

  // Recupera credenciais do Supabase
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

  // Classe Principal DepthGateUserManager
  class DepthGateUserManager {
    constructor() {
      this.platform = detectPlatform();
      this.profile = this.loadProfile();
      this.session = this.loadSession();
      this.modalEl = null;
      this.badgeEl = null;
      this._profilesTableStatus = null; // null: desconhecido, true: disponível, false: ausente
      this._avatarCache = new Map();

      this.applyPlatformDefaults();

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          this.initUI();
          this.syncFromCloud();
        });
      } else {
        this.initUI();
        this.syncFromCloud();
      }
    }

    loadProfile() {
      try {
        const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return {
        username: "Aventureiro",
        avatarType: "hero",
        avatarHero: "warrior",
        avatarCustom: null,
        email: null,
        isRegistered: false
      };
    }

    saveProfile(data, notifyCloud = false) {
      this.profile = { ...this.profile, ...data };
      try {
        localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(this.profile));
      } catch (e) {}
      this.updateBadge();
      this.updateModalFields();
      window.dispatchEvent(new CustomEvent("depthgate:user_updated", { detail: this.profile }));

      if (notifyCloud && this.profile.isRegistered) {
        this.syncProfileToCloud().catch(() => {});
      }
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

    getAvatarUrl(profile = this.profile) {
      if (profile && profile.avatarType === "custom" && profile.avatarCustom) {
        return profile.avatarCustom;
      }
      const heroKey = (profile && profile.avatarHero) || "warrior";
      return getHeroAvatarDataUrl(heroKey);
    }

    getRankingAvatar(playerRow) {
      if (!playerRow) return getHeroAvatarDataUrl("warrior");

      if (playerRow.avatar) {
        if (playerRow.avatar.startsWith("data:") || playerRow.avatar.startsWith("http")) {
          return playerRow.avatar;
        }
        if (HERO_AVATARS[playerRow.avatar]) {
          return getHeroAvatarDataUrl(playerRow.avatar);
        }
      }

      const pName = String(playerRow.player_name || playerRow.name || "").trim();
      if (this.profile && this.profile.username && pName.toLowerCase() === this.profile.username.toLowerCase()) {
        return this.getAvatarUrl();
      }

      if (this._avatarCache.has(pName.toLowerCase())) {
        return this._avatarCache.get(pName.toLowerCase());
      }

      const cls = String(playerRow.class_id || playerRow.classId || "").toLowerCase();
      if (cls.includes("warrior") || cls.includes("guerreiro")) return getHeroAvatarDataUrl("warrior");
      if (cls.includes("berserker") || cls.includes("samurai")) return getHeroAvatarDataUrl("berserker");
      if (cls.includes("archer") || cls.includes("arqueiro")) return getHeroAvatarDataUrl("archer");
      if (cls.includes("mage") || cls.includes("mago")) return getHeroAvatarDataUrl("mage");
      if (cls.includes("rogue") || cls.includes("ladino")) return getHeroAvatarDataUrl("rogue");
      if (cls.includes("paladin") || cls.includes("paladino")) return getHeroAvatarDataUrl("paladin");

      return getHeroAvatarDataUrl("warrior");
    }

    // ==================== Camada de Nuvem (Supabase) ====================

    // Verifica se a tabela 'public.profiles' existe no banco Supabase
    async checkProfilesTable() {
      if (this._profilesTableStatus !== null) return this._profilesTableStatus;
      const cfg = getSupaConfig();
      try {
        const res = await fetch(`${cfg.url}/rest/v1/profiles?select=id&limit=1`, {
          headers: getSupaHeaders()
        });
        this._profilesTableStatus = (res.status === 200);
      } catch (e) {
        this._profilesTableStatus = false;
      }
      return this._profilesTableStatus;
    }

    // Cadastro unificado: salva na nuvem (profiles table e/ou Supabase Auth)
    async register(identifier, password, username, avatarData) {
      const cfg = getSupaConfig();
      const id = identifier.trim().toLowerCase();
      const uname = (username || "Aventureiro").trim().slice(0, 24);
      const isTableAvailable = await this.checkProfilesTable();

      let registeredOnCloud = false;
      let cloudErrorMsg = null;

      // 1. Tenta salvar na tabela 'profiles' do banco de dados (sem limite de e-mail)
      if (isTableAvailable) {
        try {
          // Verifica se id já existe
          const checkRes = await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id`, {
            headers: getSupaHeaders()
          });
          const existing = await checkRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            throw new Error("Este e-mail ou nome de usuário já está cadastrado. Faça login na conta existente.");
          }

          const pwdHash = await hashPassword(password);
          const row = {
            id: id,
            username: uname,
            email: identifier.includes("@") ? identifier.trim() : null,
            avatar_type: avatarData.avatarType || "hero",
            avatar_hero: avatarData.avatarHero || "warrior",
            avatar_custom: avatarData.avatarCustom || null,
            platform: this.platform,
            password_hash: pwdHash,
            updated_at: new Date().toISOString()
          };

          const insRes = await fetch(`${cfg.url}/rest/v1/profiles`, {
            method: "POST",
            headers: { ...getSupaHeaders(), "Prefer": "return=representation" },
            body: JSON.stringify(row)
          });

          if (!insRes.ok) {
            const errJson = await insRes.json().catch(() => ({}));
            throw new Error(errJson.message || "Erro ao salvar perfil no banco de dados.");
          }

          registeredOnCloud = true;
          this.saveSession({
            provider: "profiles_table",
            id: id,
            username: uname,
            email: row.email,
            hash: pwdHash
          });
        } catch (err) {
          cloudErrorMsg = err.message;
          if (err.message.includes("já está cadastrado")) throw err;
        }
      }

      // 2. Tenta também Supabase Auth (caso o projeto use auth padrão ou confirmação desligada)
      let authSession = null;
      try {
        const authEmail = identifier.includes("@") ? identifier.trim() : `${encodeURIComponent(id)}@depthgate.local`;
        const authRes = await fetch(`${cfg.url}/auth/v1/signup`, {
          method: "POST",
          headers: getSupaHeaders(),
          body: JSON.stringify({
            email: authEmail,
            password: password,
            data: {
              username: uname,
              avatar_type: avatarData.avatarType,
              avatar_hero: avatarData.avatarHero,
              avatar_custom: avatarData.avatarCustom,
              platform: this.platform
            }
          })
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.access_token) {
            authSession = authData;
            this.saveSession(authData);
            registeredOnCloud = true;
          }
        } else {
          const authErr = await authRes.json().catch(() => ({}));
          const errMsg = authErr.msg || authErr.error_description || authErr.message || "";
          if (errMsg.includes("rate limit") || errMsg.includes("over_email_send_rate_limit")) {
            // Limite de e-mails do Supabase
            if (!registeredOnCloud) {
              throw new Error(
                "O Supabase atingiu o limite de envio de e-mails (3 e-mails/hora no plano gratuito). " +
                "Para liberar o cadastro direto em múltiplos dispositivos sem limite: " +
                "execute o script em 'supabase-ranking.sql' no SQL Editor do Supabase, ou desmarque 'Confirm email' em Authentication > Providers > Email no painel do Supabase."
              );
            }
          }
        }
      } catch (authErr) {
        if (!registeredOnCloud) throw authErr;
      }

      // Se não conseguiu salvar na nuvem por nenhuma das vias
      if (!registeredOnCloud) {
        const detail = cloudErrorMsg ? ` (${cloudErrorMsg})` : "";
        throw new Error(
          "Não foi possível salvar a conta na nuvem" + detail + ". " +
          "Certifique-se de executar o script 'supabase-ranking.sql' no menu SQL Editor do Supabase para criar a tabela de perfis."
        );
      }

      // Salva dados locais do perfil
      this.saveProfile({
        username: uname,
        email: identifier.includes("@") ? identifier.trim() : id,
        avatarType: avatarData.avatarType,
        avatarHero: avatarData.avatarHero,
        avatarCustom: avatarData.avatarCustom,
        isRegistered: true
      });

      return { success: true };
    }

    // Login unificado: pesquisa na nuvem e restaura perfil e foto
    async login(identifier, password) {
      const cfg = getSupaConfig();
      const id = identifier.trim().toLowerCase();
      const isTableAvailable = await this.checkProfilesTable();

      let loginSuccess = false;

      // 1. Tenta autenticação pela tabela 'profiles' do banco
      if (isTableAvailable) {
        try {
          const query = `${cfg.url}/rest/v1/profiles?or=(id.eq.${encodeURIComponent(id)},username.ilike.${encodeURIComponent(id)})&limit=1`;
          const res = await fetch(query, { headers: getSupaHeaders() });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const row = rows[0];
              const pwdHash = await hashPassword(password);
              if (row.password_hash === pwdHash) {
                this.saveSession({
                  provider: "profiles_table",
                  id: row.id,
                  username: row.username,
                  email: row.email || identifier,
                  hash: pwdHash
                });
                this.saveProfile({
                  username: row.username,
                  email: row.email || identifier,
                  avatarType: row.avatar_type || "hero",
                  avatarHero: row.avatar_hero || "warrior",
                  avatarCustom: row.avatar_custom || null,
                  isRegistered: true
                });
                loginSuccess = true;
                return { success: true, profile: row };
              } else {
                throw new Error("Senha incorreta para esta conta.");
              }
            }
          }
        } catch (e) {
          if (e.message && e.message.includes("Senha incorreta")) throw e;
        }
      }

      // 2. Tenta login pelo Supabase GoTrue Auth
      try {
        const authEmail = identifier.includes("@") ? identifier.trim() : `${encodeURIComponent(id)}@depthgate.local`;
        const endpoint = `${cfg.url}/auth/v1/token?grant_type=password`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: getSupaHeaders(),
          body: JSON.stringify({ email: authEmail, password: password })
        });

        const data = await res.json();
        if (res.ok && data.access_token) {
          this.saveSession(data);
          const uMeta = data.user?.user_metadata || {};
          this.saveProfile({
            username: uMeta.username || this.profile.username,
            email: identifier.includes("@") ? identifier.trim() : id,
            avatarType: uMeta.avatar_type || this.profile.avatarType,
            avatarHero: uMeta.avatar_hero || this.profile.avatarHero,
            avatarCustom: uMeta.avatar_custom || this.profile.avatarCustom,
            isRegistered: true
          });
          loginSuccess = true;
          return { success: true, user: data.user };
        } else {
          const msg = data.error_description || data.msg || data.message || "";
          if (msg.includes("Email not confirmed")) {
            throw new Error("E-mail não confirmado no Supabase. Desative a opção 'Confirm email' no painel Supabase para permitir login direto.");
          }
        }
      } catch (authErr) {
        if (loginSuccess) return { success: true };
        throw new Error(authErr.message || "E-mail/usuário ou senha incorretos.");
      }

      if (!loginSuccess) {
        throw new Error("Conta não encontrada. Verifique o usuário/e-mail ou crie uma nova conta.");
      }
    }

    // Sincroniza alterações do perfil local com a nuvem
    async syncProfileToCloud() {
      if (!this.profile.isRegistered) return;
      const cfg = getSupaConfig();
      const id = (this.profile.email || this.profile.username || "").trim().toLowerCase();

      // 1. Atualiza na tabela 'profiles'
      const isTableAvailable = await this.checkProfilesTable();
      if (isTableAvailable && id) {
        try {
          const updateData = {
            username: this.profile.username,
            avatar_type: this.profile.avatarType,
            avatar_hero: this.profile.avatarHero,
            avatar_custom: this.profile.avatarCustom,
            platform: this.platform,
            updated_at: new Date().toISOString()
          };
          await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { ...getSupaHeaders(), "Prefer": "return=minimal" },
            body: JSON.stringify(updateData)
          });
        } catch (e) {}
      }

      // 2. Atualiza no Supabase Auth se houver token ativo
      if (this.session && this.session.access_token) {
        try {
          await fetch(`${cfg.url}/auth/v1/user`, {
            method: "PUT",
            headers: getSupaHeaders(this.session.access_token),
            body: JSON.stringify({
              data: {
                username: this.profile.username,
                avatar_type: this.profile.avatarType,
                avatar_hero: this.profile.avatarHero,
                avatar_custom: this.profile.avatarCustom,
                platform: this.platform
              }
            })
          });
        } catch (e) {}
      }
    }

    // Puxa as últimas informações da nuvem na inicialização
    async syncFromCloud() {
      if (!this.profile.isRegistered && !this.session) return;
      const cfg = getSupaConfig();
      const id = (this.profile.email || this.session?.id || this.profile.username || "").trim().toLowerCase();

      // 1. Tenta recuperar da tabela 'profiles'
      const isTableAvailable = await this.checkProfilesTable();
      if (isTableAvailable && id) {
        try {
          const res = await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&limit=1`, {
            headers: getSupaHeaders()
          });
          if (res.ok) {
            const rows = await res.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const r = rows[0];
              this.saveProfile({
                username: r.username,
                avatarType: r.avatar_type || "hero",
                avatarHero: r.avatar_hero || "warrior",
                avatarCustom: r.avatar_custom || null,
                isRegistered: true
              }, false);
              return;
            }
          }
        } catch (e) {}
      }

      // 2. Tenta recuperar de Supabase Auth
      if (this.session && this.session.access_token) {
        try {
          const res = await fetch(`${cfg.url}/auth/v1/user`, {
            headers: getSupaHeaders(this.session.access_token)
          });
          if (res.ok) {
            const data = await res.json();
            const uMeta = data.user_metadata || {};
            this.saveProfile({
              username: uMeta.username || this.profile.username,
              avatarType: uMeta.avatar_type || this.profile.avatarType,
              avatarHero: uMeta.avatar_hero || this.profile.avatarHero,
              avatarCustom: uMeta.avatar_custom || this.profile.avatarCustom,
              isRegistered: true
            }, false);
          }
        } catch (e) {}
      }
    }

    logout() {
      this.saveSession(null);
      this.saveProfile({
        email: null,
        isRegistered: false
      });
      this.applyPlatformDefaults();
    }

    // Processa imagem em miniatura compacta (64x64 JPEG ~2KB a 3KB)
    processImageFile(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
          return reject(new Error("Por favor, selecione um arquivo de imagem válido (JPG ou PNG)."));
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const size = 64;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");

            // Recorte quadrado centralizado
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error("Falha ao abrir a imagem. Tente outro arquivo."));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Erro ao ler o arquivo selecionado."));
        reader.readAsDataURL(file);
      });
    }

    // ==================== Interface e Modais ====================

    initUI() {
      this.injectStyles();
      this.createBadge();
      this.createModal();
      this.startSceneWatcher();
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
          background: rgba(18, 12, 6, 0.88);
          border: 1px solid rgba(201, 162, 74, 0.65);
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
          background: rgba(38, 24, 12, 0.96);
          border-color: #ffd24a;
          transform: scale(1.04);
          box-shadow: 0 0 14px rgba(201, 162, 74, 0.55);
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

        /* Modal Medieval de Autenticação */
        #dg-auth-modal {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(5, 3, 2, 0.88);
          backdrop-filter: blur(8px);
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: dg-fade-in 0.22s ease-out;
        }
        #dg-auth-modal.visible {
          display: flex;
        }
        @keyframes dg-fade-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .dg-modal-box {
          background: radial-gradient(ellipse at center, #1f140a 0%, #0d0804 100%);
          border: 2px solid #c9a24a;
          border-radius: 12px;
          box-shadow: 0 0 36px rgba(0, 0, 0, 0.95), 0 0 24px rgba(201, 162, 74, 0.3);
          width: 100%;
          max-width: 480px;
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
          font-size: 24px;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.15s, color 0.15s;
          line-height: 1;
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
          text-shadow: 0 0 12px rgba(255, 210, 74, 0.45);
        }
        .dg-tabs {
          display: flex;
          border-bottom: 1px solid rgba(201, 162, 74, 0.35);
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
        .dg-avatar-preview-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .dg-avatar-large {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          border: 3px solid #ffd24a;
          object-fit: cover;
          box-shadow: 0 0 18px rgba(201, 162, 74, 0.45);
        }
        .dg-upload-btn {
          background: rgba(30, 20, 10, 0.95);
          border: 1px dashed #c9a24a;
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 12px;
          color: #ffd24a;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dg-upload-btn:hover {
          background: rgba(54, 34, 18, 0.98);
          border-style: solid;
          transform: scale(1.03);
        }
        .dg-hero-avatars {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 4px;
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
        .dg-form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
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
          box-shadow: 0 0 8px rgba(255, 210, 74, 0.35);
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
          background: rgba(20, 14, 8, 0.85);
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
          margin-top: 12px;
          text-align: center;
          font-family: 'Courier New', monospace;
          min-height: 20px;
          line-height: 1.4;
        }
        .dg-msg.success { color: #8ae0b0; }
        .dg-msg.error { color: #ff7b7b; }
        .dg-hint-box {
          background: rgba(20, 14, 8, 0.6);
          border: 1px solid rgba(201, 162, 74, 0.3);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 10px;
          color: #a89878;
          line-height: 1.4;
          margin-top: 12px;
        }
      `;
      document.head.appendChild(style);
    }

    createBadge() {
      if (document.getElementById("dg-profile-badge")) return;
      const b = document.createElement("div");
      b.id = "dg-profile-badge";
      b.title = "Clique para gerenciar seu Perfil, Foto e Conta";
      b.innerHTML = `
        <img class="avatar-img" src="${this.getAvatarUrl()}" alt="Avatar" />
        <div class="user-meta">
          <span class="username">${this.profile.username || "Aventureiro"}</span>
          <span class="platform-tag">${this.getPlatformLabel()}</span>
        </div>
      `;
      b.style.display = "none";
      b.addEventListener("click", () => this.openModal());
      document.body.appendChild(b);
      this.badgeEl = b;
    }

    hideBadge() {
      if (this.badgeEl) this.badgeEl.style.display = "none";
    }

    showBadge() {
      if (this.badgeEl) this.badgeEl.style.display = "flex";
    }

    startSceneWatcher() {
      if (this._watcherInterval) clearInterval(this._watcherInterval);
      this._watcherInterval = setInterval(() => {
        try {
          const game = window.__DED_GAME || window.__game;
          if (!game || !game.scene) return;
          const active = game.scene.getScenes(true);
          if (!active || !active.length) return;
          const keys = active.map(s => s.sys?.settings?.key || s.scene?.key).filter(Boolean);
          if (keys.some(k => ["Game", "Hub", "Traversal", "Cutscene", "VisualPrototype"].includes(k))) {
            this.hideBadge();
          } else if (keys.includes("MainMenu")) {
            this.showBadge();
          }
        } catch (e) {}
      }, 200);
    }

    getPlatformLabel() {
      if (this.platform === "steam") return "STEAM";
      if (this.platform === "mobile") return "MOBILE";
      if (this.profile.isRegistered) return "NUVEM ATIVA";
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

    updateModalFields() {
      const m = this.modalEl;
      if (!m) return;
      const nameInp = m.querySelector("#dg-input-username");
      if (nameInp && document.activeElement !== nameInp) {
        nameInp.value = this.profile.username || "";
      }
      const preview = m.querySelector("#dg-modal-avatar-preview");
      if (preview) preview.src = this.getAvatarUrl();

      const heroBtns = m.querySelectorAll(".dg-hero-btn");
      heroBtns.forEach(btn => {
        if (this.profile.avatarType === "hero" && btn.dataset.hero === this.profile.avatarHero) {
          btn.classList.add("selected");
        } else {
          btn.classList.remove("selected");
        }
      });
      this.refreshAuthViews();
    }

    createModal() {
      if (document.getElementById("dg-auth-modal")) return;
      const m = document.createElement("div");
      m.id = "dg-auth-modal";
      m.innerHTML = `
        <div class="dg-modal-box">
          <button class="dg-modal-close" type="button" aria-label="Fechar">&times;</button>
          <div class="dg-modal-title">PERFIL DO JOGADOR</div>

          <div class="dg-tabs">
            <button class="dg-tab-btn active" data-tab="profile" type="button">MEU PERFIL</button>
            <button class="dg-tab-btn" data-tab="online" type="button">CONTA ONLINE (NUVEM)</button>
          </div>

          <!-- ABA 1: MEU PERFIL -->
          <div class="dg-tab-content" id="dg-tab-profile">
            <div class="dg-avatar-preview-wrap">
              <img class="dg-avatar-large" id="dg-modal-avatar-preview" src="${this.getAvatarUrl()}" alt="Avatar" />
              <label class="dg-upload-btn">
                📸 ENVIAR MINHA FOTO
                <input type="file" id="dg-avatar-file-input" accept="image/*" style="display:none;" />
              </label>
              <div style="font-size:10px; color:#8a7f66;">Ou escolha um herói clássico:</div>
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
              <input type="text" class="dg-input" id="dg-input-username" value="${this.profile.username || ''}" maxlength="20" placeholder="Seu apelido..." />
            </div>

            <div style="font-size:10px; color:#8a7f66; margin-bottom:12px;">
              Status da Conta: <strong style="color:#ffd24a;">${this.getPlatformLabel()}</strong>
              ${this.profile.isRegistered ? ` · <span style="color:#8ae0b0;">Sincronizado na Nuvem</span>` : ` · <span style="color:#e08a7a;">Salvo apenas neste navegador</span>`}
            </div>

            <button type="button" class="dg-btn-primary" id="dg-btn-save-profile">SALVAR ALTERAÇÕES</button>
            <div class="dg-msg" id="dg-profile-msg"></div>

            <div class="dg-hint-box" id="dg-profile-hint">
              💡 <strong>Dica:</strong> Para manter seu apelido, foto e pontuações sincronizados ao jogar em outro computador ou dispositivo, acerte seu cadastro na aba <strong>CONTA ONLINE</strong>.
            </div>
          </div>

          <!-- ABA 2: CONTA ONLINE -->
          <div class="dg-tab-content" id="dg-tab-online" style="display:none;">
            <div style="font-size:11px; color:#a89878; margin-bottom:16px; line-height:1.4;">
              Conecte sua conta para acessar seu perfil, foto e pontuações em qualquer computador, celular ou navegador.
            </div>

            <div id="dg-auth-logged-view" style="${this.profile.isRegistered ? 'display:block;' : 'display:none;'}">
              <div style="background:rgba(20,40,25,0.7); border:1px solid #4a9e6b; border-radius:6px; padding:12px; margin-bottom:14px; text-align:center;">
                <div style="font-size:13px; color:#8ae0b0; font-weight:bold; margin-bottom:4px;">
                  ✓ CONTA CONECTADA NA NUVEM
                </div>
                <div style="font-size:12px; color:#e8d8b8;">
                  Identificação: <strong id="dg-logged-email">${this.profile.email || this.profile.username || ''}</strong>
                </div>
              </div>
              <button type="button" class="dg-btn-secondary" id="dg-btn-logout">DESCONECTAR DA CONTA</button>
            </div>

            <div id="dg-auth-login-form" style="${this.profile.isRegistered ? 'display:none;' : 'display:block;'}">
              <div class="dg-form-group">
                <label>E-MAIL OU NOME DE USUÁRIO:</label>
                <input type="text" class="dg-input" id="dg-input-ident" placeholder="seu-usuario ou email@exemplo.com" />
              </div>
              <div class="dg-form-group">
                <label>SENHA:</label>
                <input type="password" class="dg-input" id="dg-input-password" placeholder="Sua senha..." />
              </div>

              <button type="button" class="dg-btn-primary" id="dg-btn-login">ENTRAR NA CONTA</button>
              <button type="button" class="dg-btn-secondary" id="dg-btn-register">CRIAR NOVA CONTA</button>
            </div>

            <div class="dg-msg" id="dg-auth-msg"></div>

            <div class="dg-hint-box" style="margin-top:14px;">
              ⚡ <strong>Multiplataforma:</strong> Se você joga em computadores diferentes, basta fazer login com a mesma conta para restaurar sua foto e dados instantaneamente.
            </div>
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

      m.querySelector(".dg-modal-close").addEventListener("click", () => this.closeModal());
      m.addEventListener("click", (e) => {
        if (e.target === m) this.closeModal();
      });

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
          m.querySelectorAll(".dg-hero-btn").forEach(b => b.classList.remove("selected"));
          this.showMsg("#dg-profile-msg", "Foto carregada! Clique em 'SALVAR ALTERAÇÕES' para confirmar.", "success");
        } catch (err) {
          this.showMsg("#dg-profile-msg", err.message, "error");
        }
      });

      // Seleção de Avatar
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
      m.querySelector("#dg-btn-save-profile").addEventListener("click", async () => {
        const uname = (m.querySelector("#dg-input-username").value.trim() || "Aventureiro").slice(0, 20);
        this.saveProfile({
          username: uname,
          avatarType: this.profile.avatarType,
          avatarHero: this.profile.avatarHero,
          avatarCustom: this.profile.avatarCustom
        }, true);

        if (this.profile.isRegistered) {
          this.showMsg("#dg-profile-msg", "Perfil e foto atualizados e sincronizados na nuvem!", "success");
        } else {
          this.showMsg("#dg-profile-msg", "Perfil salvo localmente! Conecte na aba 'CONTA ONLINE' para salvar na nuvem.", "success");
        }
        setTimeout(() => this.closeModal(), 700);
      });

      // Login
      m.querySelector("#dg-btn-login").addEventListener("click", async () => {
        const ident = m.querySelector("#dg-input-ident").value.trim();
        const pass = m.querySelector("#dg-input-password").value.trim();
        if (!ident || !pass) {
          return this.showMsg("#dg-auth-msg", "Preencha usuário/e-mail e senha para entrar.", "error");
        }
        try {
          this.showMsg("#dg-auth-msg", "Verificando credenciais na nuvem...", "success");
          await this.login(ident, pass);
          this.showMsg("#dg-auth-msg", "Login efetuado com sucesso! Perfil sincronizado.", "success");
          this.updateModalFields();
          setTimeout(() => this.closeModal(), 700);
        } catch (err) {
          this.showMsg("#dg-auth-msg", err.message, "error");
        }
      });

      // Cadastro
      m.querySelector("#dg-btn-register").addEventListener("click", async () => {
        const ident = m.querySelector("#dg-input-ident").value.trim();
        const pass = m.querySelector("#dg-input-password").value.trim();
        const uname = m.querySelector("#dg-input-username").value.trim() || "Aventureiro";
        if (!ident || !pass) {
          return this.showMsg("#dg-auth-msg", "Preencha usuário/e-mail e senha para criar a conta.", "error");
        }
        if (pass.length < 4) {
          return this.showMsg("#dg-auth-msg", "A senha deve ter no mínimo 4 caracteres.", "error");
        }
        try {
          this.showMsg("#dg-auth-msg", "Criando conta e salvando foto na nuvem...", "success");
          await this.register(ident, pass, uname, {
            avatarType: this.profile.avatarType,
            avatarHero: this.profile.avatarHero,
            avatarCustom: this.profile.avatarCustom
          });
          this.showMsg("#dg-auth-msg", "Conta criada com sucesso! Seu perfil está salvo na nuvem.", "success");
          this.updateModalFields();
          setTimeout(() => this.closeModal(), 800);
        } catch (err) {
          this.showMsg("#dg-auth-msg", err.message, "error");
        }
      });

      // Logout
      m.querySelector("#dg-btn-logout").addEventListener("click", () => {
        this.logout();
        this.updateModalFields();
        this.showMsg("#dg-auth-msg", "Conta desconectada com sucesso.", "success");
      });
    }

    refreshAuthViews() {
      const m = this.modalEl;
      if (!m) return;
      const loggedView = m.querySelector("#dg-auth-logged-view");
      const loginForm = m.querySelector("#dg-auth-login-form");
      const loggedEmail = m.querySelector("#dg-logged-email");
      if (this.profile.isRegistered) {
        if (loggedView) loggedView.style.display = "block";
        if (loginForm) loginForm.style.display = "none";
        if (loggedEmail) loggedEmail.textContent = this.profile.email || this.profile.username;
      } else {
        if (loggedView) loggedView.style.display = "none";
        if (loginForm) loginForm.style.display = "block";
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
      this.updateModalFields();
      this.syncFromCloud().catch(() => {});
    }

    closeModal() {
      if (this.modalEl) this.modalEl.classList.remove("visible");
    }

    getProfile() {
      return this.profile;
    }
  }

  // Instância Global
  window.DepthGateUser = new DepthGateUserManager();

})(window);
