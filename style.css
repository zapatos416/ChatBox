/* ==================================================
   ESTILOS GENERALES Y VARIABLES DE BLOXCHAT
   ================================================== */
:root {
  --bg-main: #121418;
  --bg-card: #1b1e26;
  --bg-card-hover: #232731;
  --bg-input: #272b36;
  --accent-green: #00b06f;
  --accent-green-hover: #00965f;
  --accent-orange: #ff9f1c;
  --text-main: #ffffff;
  --text-muted: #9ca3af;
  --border-color: #2f3542;
  --danger: #d90429;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Hanken Grotesk', sans-serif;
}

body {
  background-color: var(--bg-main);
  color: var(--text-main);
  min-height: 100vh;
  overflow-x: hidden;
}

.hidden {
  display: none !important;
}

/* ==================================================
   BARRA DE NAVEGACIÓN
   ================================================== */
.roblox-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-card);
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-left, .nav-right, .nav-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-box {
  width: 28px;
  height: 28px;
  background: var(--accent-green);
  border-radius: 6px;
}

.logo-text {
  font-weight: 900;
  font-size: 1.25rem;
  letter-spacing: -0.5px;
}

.logo-text span {
  color: var(--accent-green);
}

.nav-links {
  display: flex;
  gap: 12px;
  margin-left: 20px;
}

.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover, .nav-link.active {
  color: var(--text-main);
  background: var(--bg-input);
}

.search-box {
  position: relative;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 280px;
  border: 1px solid transparent;
  transition: border 0.2s;
}

.search-box:focus-within {
  border-color: var(--accent-green);
}

.search-box i {
  color: var(--text-muted);
}

.search-box input {
  background: none;
  border: none;
  color: var(--text-main);
  outline: none;
  width: 100%;
  font-size: 0.9rem;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-green);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-green-hover);
}

.btn-secondary {
  background: var(--bg-input);
  color: white;
}

.btn-secondary:hover {
  background: #323846;
}

.btn-roblox-login {
  background: var(--accent-orange);
  color: white;
}

.btn-owner-panel {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-input);
  padding: 4px 12px 4px 6px;
  border-radius: 20px;
  cursor: pointer;
}

.user-chip .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-green);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  overflow: hidden;
}

.user-chip .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-logout {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
}

/* ==================================================
   CONTENEDOR Y CATÁLOGO DE SALAS
   ================================================== */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}

.feed-header h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.feed-header p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 4px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.filter-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active, .filter-btn:hover {
  background: var(--bg-input);
  color: var(--text-main);
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.room-card {
  background: var(--bg-card);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.4);
  border-color: var(--accent-green);
}

.card-thumb {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--bg-input);
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-registered-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-content {
  padding: 16px;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.card-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ==================================================
   VISTA DE CHATROOM
   ================================================== */
.chat-container {
  height: calc(100vh - 65px);
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.chat-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-room-thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.chat-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
}

.status-badge {
  font-size: 0.75rem;
  color: var(--accent-green);
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}

.btn-icon {
  background: var(--bg-input);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #323846;
}

.chat-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #15181e;
}

.messages-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chat-sidebar {
  width: 280px;
  background: var(--bg-card);
  border-left: 1px solid var(--border-color);
  padding: 20px;
  overflow-y: auto;
}

.chat-sidebar h3 {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Burbujas de Chat */
.chat-bubble {
  max-width: 65%;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  word-break: break-word;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.bubble-other {
  background: var(--bg-card);
  align-self: flex-start;
  border-bottom-left-radius: 2px;
}

.bubble-user {
  background: var(--accent-green);
  color: white;
  align-self: flex-end;
  border-bottom-right-radius: 2px;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 4px;
  font-size: 0.75rem;
  opacity: 0.85;
}

.bubble-author {
  font-weight: 700;
}

.bubble-text {
  font-size: 0.95rem;
  line-height: 1.4;
}

.bubble-time {
  font-size: 0.65rem;
  text-align: right;
  margin-top: 4px;
  opacity: 0.7;
}

.message-attachment img {
  max-width: 100%;
  max-height: 220px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

/* Composer de Chat */
.chat-composer-wrapper {
  padding: 16px 20px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
}

.chat-composer-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-input);
  border-radius: 12px;
  padding: 6px 12px;
}

.chat-attach-buttons {
  display: flex;
  gap: 6px;
}

.btn-icon-attach {
  color: var(--text-muted);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon-attach:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.chat-composer-controls input[type="text"] {
  flex: 1;
  background: none;
  border: none;
  color: white;
  outline: none;
  font-size: 0.95rem;
}

.btn-send {
  background: var(--accent-green);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-send:hover {
  background: var(--accent-green-hover);
}

.chat-attachment-preview-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-main);
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.chat-attachment-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}

.chat-attachment-info {
  flex: 1;
  font-size: 0.85rem;
}

.chat-attachment-info small {
  color: var(--text-muted);
  display: block;
}

.btn-remove-attachment {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 1.1rem;
}

/* ==================================================
   MODALES Y VENTANAS EMERGENTES
   ================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-card {
  background: var(--bg-card);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  position: relative;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.modal-sm {
  max-width: 400px;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--danger);
}

.modal-banner {
  position: relative;
  width: 100%;
  height: 200px;
  background: var(--bg-input);
}

.modal-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-content {
  padding: 24px;
}

.modal-content h2 {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.modal-content p {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 20px;
  line-height: 1.5;
}

.modal-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.modal-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-roblox-green {
  background: var(--accent-green);
  color: white;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-roblox-green:hover {
  background: var(--accent-green-hover);
}

/* Formularios dentro de modales */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--text-muted);
}

.form-group input, .form-group select {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  padding: 10px 14px;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  outline: none;
}

.form-group input:focus, .form-group select:focus {
  border-color: var(--accent-green);
}

.btn-block {
  width: 100%;
}

.modal-subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 20px;
}

/* Estilos de Autenticación Profesional */
.auth-card {
  padding: 30px;
  text-align: center;
}

.auth-header-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}

.auth-header-logo h2 {
  font-size: 1.6rem;
  font-weight: 900;
}

.auth-header-logo span {
  color: var(--accent-green);
}

.auth-input-field {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: 8px;
  color: white;
  margin-bottom: 12px;
}

.auth-links-footer {
  margin: 12px 0 20px 0;
  font-size: 0.85rem;
}

.auth-links-footer a {
  color: var(--accent-green);
  text-decoration: none;
}

.auth-divider {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-auth {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.95rem;
}

.btn-google {
  background: #ffffff;
  color: #121418;
}

.btn-facebook {
  background: #1877f2;
  color: #ffffff;
}

.auth-create-account-text {
  margin-top: 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.auth-create-account-text a {
  color: var(--accent-green);
  text-decoration: none;
  font-weight: 700;
}

/* Insignias */
.badge-owner {
  background: #ffd700;
  color: #000;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 900;
  margin-left: 6px;
}

.badge-mod-global {
  background: #3498db;
  color: #fff;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 900;
  margin-left: 6px;
}

.room-img-preview-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-img-preview-box img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  background: var(--bg-input);
}

.room-img-buttons {
  display: flex;
  gap: 10px;
}

.btn-avatar-action {
  flex: 1;
  background: var(--bg-input);
  padding: 8px;
  text-align: center;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

@media(max-width: 768px) {
  .hide-mobile {
    display: none;
  }
  .search-box {
    width: 150px;
  }
}
