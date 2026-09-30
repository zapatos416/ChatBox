/* ==================================================
   DATOS INICIALES Y ESTADO
   ================================================== */
const INITIAL_ROOMS = [
  {
    id: "PUB-001",
    title: "Chill & Lounge ☕",
    description: "Espacio tranquilo para hablar de música, diseño, series y relajarse un rato.",
    category: "chill",
    isPrivate: false,
    usersCount: 142,
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&auto=format&fit=crop&q=80",
    messages: [
      { author: "Alex_Builder", text: "Qué onda gente, ¿qué escuchan hoy?", time: "10:14" },
      { author: "Vortex99", text: "Un poco de música electrónica para concentrarme.", time: "10:15" }
    ],
    participants: ["Alex_Builder", "Vortex99", "Sara_RBLX", "NeoGamer"]
  },
  {
    id: "PUB-002",
    title: "Gaming & Motorsport Hub 🏎️",
    description: "Hablemos de simuladores, setups, F1, torneos y clips épicos.",
    category: "gaming",
    isPrivate: false,
    usersCount: 230,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    messages: [
      { author: "SpeedyGonz", text: "¿Vieron la qualy del fin de semana? ¡Volaron!", time: "09:30" }
    ],
    participants: ["SpeedyGonz", "ApexHunter", "Luigi_Kart"]
  },
  {
    id: "PUB-003",
    title: "Comunidad Central 🌐",
    description: "Salón público principal para hacer amigos, charlar y compartir ideas.",
    category: "general",
    isPrivate: false,
    usersCount: 88,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
    messages: [
      { author: "NoobMaster", text: "Hola a todos, bienvenido quien sea nuevo.", time: "11:02" }
    ],
    participants: ["NoobMaster", "KevDev", "PixelArt"]
  },
  // SALA PRIVADA DE PRUEBA: NO SE VE EN EL FEED PÚBLICO
  {
    id: "SECRET-100",
    title: "VIP Lounge Privado 🔒",
    description: "Sala oculta exclusiva protegida por contraseña para el grupo selecto.",
    category: "general",
    isPrivate: true,
    password: "123",
    usersCount: 12,
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    messages: [
      { author: "GhostHost", text: "Acceso VIP concedido. Bienvenidos.", time: "00:00" }
    ],
    participants: ["GhostHost", "ShadowUser"]
  }
];

// Cargar o inicializar salas en localStorage
let rooms = JSON.parse(localStorage.getItem("bloxchat_rooms")) || INITIAL_ROOMS;
function saveRooms() {
  localStorage.setItem("bloxchat_rooms", JSON.stringify(rooms));
}

// Estado de usuario y navegación
const currentUser = "Usuario_" + Math.floor(100 + Math.random() * 900);
let currentRoomId = null;
let selectedModalRoom = null;
let currentFilter = "all";

// Elementos del DOM
const catalogView = document.getElementById("catalogView");
const chatView = document.getElementById("chatView");
const roomsGrid = document.getElementById("roomsGrid");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");

// Modales
const modalDetails = document.getElementById("modalDetails");
const modalPrivateJoin = document.getElementById("modalPrivateJoin");
const modalCreateRoom = document.getElementById("modalCreateRoom");

// Controles Chat
const messagesArea = document.getElementById("messagesArea");
const chatInput = document.getElementById("chatInput");
const btnSendMessage = document.getElementById("btnSendMessage");
const btnLeaveRoom = document.getElementById("btnLeaveRoom");
const chatRoomTitle = document.getElementById("chatRoomTitle");
const chatRoomImg = document.getElementById("chatRoomImg");
const participantsList = document.getElementById("participantsList");
const userCount = document.getElementById("userCount");

/* ==================================================
   RENDERIZAR CATÁLOGO (DISCOVERY)
   ================================================== */
function renderRooms() {
  roomsGrid.innerHTML = "";
  const query = searchInput.value.toLowerCase().trim();

  // Filtrar solo las que NO son privadas (las privadas no aparecen en catálogo)
  const visibleRooms = rooms.filter(room => {
    if (room.isPrivate) return false;
    const matchesCategory = (currentFilter === "all" || room.category === currentFilter);
    const matchesSearch = room.title.toLowerCase().includes(query) || room.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (visibleRooms.length === 0) {
    roomsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No se encontraron salas públicas disponibles.</p>`;
    return;
  }

  visibleRooms.forEach(room => {
    const card = document.createElement("div");
    card.className = "room-card";
    card.innerHTML = `
      <div class="card-thumb">
        <img src="${room.image}" alt="${room.title}" loading="lazy" />
        <div class="online-badge">
          <i class="fa-solid fa-circle"></i>
          <span>${room.usersCount}</span>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${room.title}</h3>
        <p class="card-desc">${room.description}</p>
      </div>
    `;

    // Clic en la tarjeta abre el pop-up tipo Roblox para unirse
    card.addEventListener("click", () => openRoomDetails(room));
    roomsGrid.appendChild(card);
  });
}

/* ==================================================
   MODAL DE ENTRADA A SALA (BOTÓN VERDE ROBLOX)
   ================================================== */
function openRoomDetails(room) {
  selectedModalRoom = room;
  document.getElementById("modalImg").src = room.image;
  document.getElementById("modalTitle").innerText = room.title;
  document.getElementById("modalDesc").innerText = room.description;
  document.getElementById("modalUsers").innerText = room.usersCount;
  document.getElementById("modalCategory").innerText = room.category.toUpperCase();
  document.getElementById("modalCode").innerText = room.id;

  modalDetails.classList.remove("hidden");
}

document.getElementById("btnLaunchChat").addEventListener("click", () => {
  if (selectedModalRoom) {
    modalDetails.classList.add("hidden");
    joinRoom(selectedModalRoom.id);
  }
});

/* ==================================================
   ENTRAR A SALA Y SISTEMA DE CHAT
   ================================================== */
function joinRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;

  currentRoomId = roomId;

  // Actualizar UI del chat
  chatRoomTitle.innerText = room.title;
  chatRoomImg.src = room.image;
  userCount.innerText = room.participants.length + 1;

  // Renderizar participantes
  participantsList.innerHTML = `
    <div class="participant-item">
      <div class="avatar" style="background:#00b06f;">Tú</div>
      <span>${currentUser} (Tú)</span>
    </div>
  `;
  room.participants.forEach(p => {
    participantsList.innerHTML += `
      <div class="participant-item">
        <div class="avatar">${p.charAt(0)}</div>
        <span>${p}</span>
      </div>
    `;
  });

  // Renderizar mensajes
  renderMessages(room);

  // Cambiar vistas
  catalogView.classList.add("hidden");
  chatView.classList.remove("hidden");
  chatInput.focus();
}

function renderMessages(room) {
  messagesArea.innerHTML = "";
  room.messages.forEach(msg => {
    const isMe = msg.author === currentUser;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMe ? 'bubble-user' : 'bubble-other'}`;
    bubble.innerHTML = `
      ${!isMe ? `<div class="bubble-author">${msg.author}</div>` : ""}
      <div>${escapeHTML(msg.text)}</div>
      <div class="bubble-time">${msg.time}</div>
    `;
    messagesArea.appendChild(bubble);
  });
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentRoomId) return;

  const room = rooms.find(r => r.id === currentRoomId);
  if (!room) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newMsg = {
    author: currentUser,
    text: text,
    time: timeStr
  };

  room.messages.push(newMsg);
  saveRooms();
  renderMessages(room);
  chatInput.value = "";
}

// Salir del chat
btnLeaveRoom.addEventListener("click", () => {
  currentRoomId = null;
  chatView.classList.add("hidden");
  catalogView.classList.remove("hidden");
  renderRooms();
});

btnSendMessage.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* ==================================================
   SALAS PRIVADAS: ACCESO CON CÓDIGO Y CONTRASEÑA
   ================================================== */
document.getElementById("btnOpenPrivateJoin").addEventListener("click", () => {
  document.getElementById("privateErrorMsg").classList.add("hidden");
  document.getElementById("formPrivateJoin").reset();
  modalPrivateJoin.classList.remove("hidden");
});

document.getElementById("formPrivateJoin").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("privateCodeInput").value.trim();
  const pass = document.getElementById("privatePassInput").value.trim();
  const errorMsg = document.getElementById("privateErrorMsg");

  // Buscar sala privada por ID
  const room = rooms.find(r => r.id.toLowerCase() === code.toLowerCase() && r.isPrivate);

  if (room && room.password === pass) {
    modalPrivateJoin.classList.add("hidden");
    joinRoom(room.id);
  } else {
    errorMsg.classList.remove("hidden");
  }
});

/* ==================================================
   CREACIÓN DE NUEVAS SALAS
   ================================================== */
document.getElementById("btnOpenCreate").addEventListener("click", () => {
  document.getElementById("formCreateRoom").reset();
  document.getElementById("passwordGroup").classList.add("hidden");
  modalCreateRoom.classList.remove("hidden");
});

document.getElementById("createIsPrivate").addEventListener("change", (e) => {
  const pwdGroup = document.getElementById("passwordGroup");
  const pwdInput = document.getElementById("createPassword");
  if (e.target.checked) {
    pwdGroup.classList.remove("hidden");
    pwdInput.setAttribute("required", "true");
  } else {
    pwdGroup.classList.add("hidden");
    pwdInput.removeAttribute("required");
  }
});

document.getElementById("formCreateRoom").addEventListener("submit", (e) => {
  e.preventDefault();
  const isPrivate = document.getElementById("createIsPrivate").checked;
  const title = document.getElementById("createTitle").value.trim();
  const desc = document.getElementById("createDesc").value.trim();
  const category = document.getElementById("createCategory").value;
  const customImg = document.getElementById("createImgUrl").value.trim();
  const password = document.getElementById("createPassword").value.trim();

  const newId = (isPrivate ? "VIP-" : "ROOM-") + Math.floor(1000 + Math.random() * 9000);
  const defaultImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";

  const newRoom = {
    id: newId,
    title: title,
    description: desc,
    category: category,
    isPrivate: isPrivate,
    password: isPrivate ? password : null,
    usersCount: 1,
    image: customImg || defaultImg,
    messages: [
      { author: "Sistema", text: `Sala creada. ¡Bienvenido a ${title}!`, time: "Ahora" }
    ],
    participants: []
  };

  rooms.unshift(newRoom);
  saveRooms();
  modalCreateRoom.classList.add("hidden");

  if (isPrivate) {
    alert(`¡Sala Privada Creada con Éxito!\n\nID de Entrada: ${newId}\nContraseña: ${password}\n\nNo aparecerá en el catálogo. Compártelo con quienes quieras invitar.`);
  } else {
    renderRooms();
  }
});

/* ==================================================
   FILTROS, BÚSQUEDA Y CIERRE DE MODALES
   ================================================== */
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.category;
    renderRooms();
  });
});

searchInput.addEventListener("input", renderRooms);

// Cerrar modales al tocar el botón de tache o el fondo
document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", () => {
    const modalId = btn.dataset.close;
    document.getElementById(modalId).classList.add("hidden");
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.add("hidden");
  }
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Inicializar
document.getElementById("navUsername").innerText = currentUser;
document.getElementById("navAvatar").innerText = currentUser.charAt(0);
renderRooms();