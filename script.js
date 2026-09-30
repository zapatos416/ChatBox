// ==================================================
// CONFIGURACIÓN OFICIAL MODULAR DE FIREBASE
// ==================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHyOtOWEDC75bVYHyqPmpauNOiCjueltA",
  authDomain: "chatblox-561f3.firebaseapp.com",
  projectId: "chatblox-561f3",
  storageBucket: "chatblox-561f3.firebasestorage.app",
  messagingSenderId: "901780847334",
  appId: "1:901780847334:web:3c59f2d92ef185290c1927",
  measurementId: "G-9XSJF699P3"
};

// Inicializar la conexión
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================================================
// ESTADO LOCAL DE LA APLICACIÓN
// ==================================================
let rooms = [];
const currentUser = "Usuario_" + Math.floor(100 + Math.random() * 900);
let currentRoomId = null;
let selectedModalRoom = null;
let currentFilter = "all";
let unsubscribeMessages = null;

// Elementos del DOM
const catalogView = document.getElementById("catalogView");
const chatView = document.getElementById("chatView");
const roomsGrid = document.getElementById("roomsGrid");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");

const modalDetails = document.getElementById("modalDetails");
const modalPrivateJoin = document.getElementById("modalPrivateJoin");
const modalCreateRoom = document.getElementById("modalCreateRoom");

const messagesArea = document.getElementById("messagesArea");
const chatInput = document.getElementById("chatInput");
const btnSendMessage = document.getElementById("btnSendMessage");
const btnLeaveRoom = document.getElementById("btnLeaveRoom");
const chatRoomTitle = document.getElementById("chatRoomTitle");
const chatRoomImg = document.getElementById("chatRoomImg");
const participantsList = document.getElementById("participantsList");
const userCount = document.getElementById("userCount");

// ==================================================
// ESCUCHA EN TIEMPO REAL DEL CATÁLOGO DE SALAS
// ==================================================
const roomsCollectionRef = collection(db, "salas");

onSnapshot(roomsCollectionRef, (snapshot) => {
  rooms = [];
  snapshot.forEach((documentSnap) => {
    rooms.push({ id: documentSnap.id, ...documentSnap.data() });
  });
  renderRooms();
}, (error) => {
  console.error("Error al escuchar salas de Firestore:", error);
});

// ==================================================
// RENDERIZADO DEL CATÁLOGO
// ==================================================
function renderRooms() {
  roomsGrid.innerHTML = "";
  const queryText = searchInput.value.toLowerCase().trim();

  // Las salas privadas se ocultan del catálogo público
  const visibleRooms = rooms.filter(room => {
    if (room.isPrivate) return false;
    const matchesCategory = (currentFilter === "all" || room.category === currentFilter);
    const matchesSearch = (room.title || "").toLowerCase().includes(queryText) || 
                          (room.description || "").toLowerCase().includes(queryText);
    return matchesCategory && matchesSearch;
  });

  if (visibleRooms.length === 0) {
    roomsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No hay salas públicas disponibles. ¡Sé el primero en crear una!</p>`;
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
          <span>${room.usersCount || 1}</span>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${room.title}</h3>
        <p class="card-desc">${room.description}</p>
      </div>
    `;

    card.addEventListener("click", () => openRoomDetails(room));
    roomsGrid.appendChild(card);
  });
}

function openRoomDetails(room) {
  selectedModalRoom = room;
  document.getElementById("modalImg").src = room.image;
  document.getElementById("modalTitle").innerText = room.title;
  document.getElementById("modalDesc").innerText = room.description;
  document.getElementById("modalUsers").innerText = room.usersCount || 1;
  document.getElementById("modalCategory").innerText = (room.category || "GENERAL").toUpperCase();
  document.getElementById("modalCode").innerText = room.id;

  modalDetails.classList.remove("hidden");
}

document.getElementById("btnLaunchChat").addEventListener("click", () => {
  if (selectedModalRoom) {
    modalDetails.classList.add("hidden");
    joinRoom(selectedModalRoom.id);
  }
});

// ==================================================
// ENTRAR AL CHAT Y SINCRONIZACIÓN DE MENSAJES
// ==================================================
function joinRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;

  currentRoomId = roomId;
  chatRoomTitle.innerText = room.title;
  chatRoomImg.src = room.image;
  userCount.innerText = "En vivo";

  participantsList.innerHTML = `
    <div class="participant-item">
      <div class="avatar" style="background:#00b06f;">Tú</div>
      <span>${currentUser} (Tú)</span>
    </div>
  `;

  catalogView.classList.add("hidden");
  chatView.classList.remove("hidden");
  chatInput.focus();

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  // Escuchar mensajes en tiempo real dentro de la sala elegida
  const messagesRef = collection(db, "salas", roomId, "mensajes");
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    messagesArea.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMe = msg.author === currentUser;
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${isMe ? 'bubble-user' : 'bubble-other'}`;
      bubble.innerHTML = `
        ${!isMe ? `<div class="bubble-author">${msg.author}</div>` : ""}
        <div>${escapeHTML(msg.text || "")}</div>
        <div class="bubble-time">${msg.time || ""}</div>
      `;
      messagesArea.appendChild(bubble);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }, (err) => {
    console.error("Error al recibir mensajes de Firestore:", err);
  });
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !currentRoomId) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  chatInput.value = "";

  try {
    const messagesRef = collection(db, "salas", currentRoomId, "mensajes");
    await addDoc(messagesRef, {
      author: currentUser,
      text: text,
      time: timeStr,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Error al registrar mensaje:", err);
  }
}

btnLeaveRoom.addEventListener("click", () => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  currentRoomId = null;
  chatView.classList.add("hidden");
  catalogView.classList.remove("hidden");
  renderRooms();
});

btnSendMessage.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ==================================================
// ENTRADA A SALA PRIVADA CON CÓDIGO Y CONTRASEÑA
// ==================================================
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

  const targetRoom = rooms.find(r => r.id.toLowerCase() === code.toLowerCase() && r.isPrivate);

  if (targetRoom && targetRoom.password === pass) {
    modalPrivateJoin.classList.add("hidden");
    joinRoom(targetRoom.id);
  } else {
    errorMsg.classList.remove("hidden");
  }
});

// ==================================================
// CREACIÓN DE SALA EN FIRESTORE
// ==================================================
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

document.getElementById("formCreateRoom").addEventListener("submit", async (e) => {
  e.preventDefault();
  const isPrivate = document.getElementById("createIsPrivate").checked;
  const title = document.getElementById("createTitle").value.trim();
  const desc = document.getElementById("createDesc").value.trim();
  const category = document.getElementById("createCategory").value;
  const customImg = document.getElementById("createImgUrl").value.trim();
  const password = document.getElementById("createPassword").value.trim();

  const newId = (isPrivate ? "VIP-" : "ROOM-") + Math.floor(1000 + Math.random() * 9000);
  const defaultImg = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";

  const roomData = {
    title: title,
    description: desc,
    category: category,
    isPrivate: isPrivate,
    password: isPrivate ? password : null,
    usersCount: 1,
    image: customImg || defaultImg,
    createdAt: serverTimestamp()
  };

  try {
    const roomDocRef = doc(db, "salas", newId);
    await setDoc(roomDocRef, roomData);

    const messagesRef = collection(db, "salas", newId, "mensajes");
    await addDoc(messagesRef, {
      author: "Sistema",
      text: `Sala creada. ¡Bienvenido a ${title}!`,
      time: "Ahora",
      timestamp: serverTimestamp()
    });

    modalCreateRoom.classList.add("hidden");

    if (isPrivate) {
      alert(`¡Sala Privada Creada con Éxito!\n\nID: ${newId}\nContraseña: ${password}\n\nComparte el ID y la clave con tus amigos para que puedan entrar.`);
    }
  } catch (err) {
    console.error("Error al crear sala:", err);
    alert("Hubo un error al registrar la sala. Comprueba las reglas de Firestore.");
  }
});

// ==================================================
// FILTROS Y CIERRE DE MODALES
// ==================================================
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.category;
    renderRooms();
  });
});

searchInput.addEventListener("input", renderRooms);

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

// Inicializar chip de usuario
document.getElementById("navUsername").innerText = currentUser;
document.getElementById("navAvatar").innerText = currentUser.charAt(0);
