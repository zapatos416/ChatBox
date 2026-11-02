import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const configuracionFirebase = {
  apiKey: "AIzaSyAHyOtOWEDC75bVYHyqPmpauNOiCjueltA",
  authDomain: "chatblox-561f3.firebaseapp.com",
  projectId: "chatblox-561f3",
  storageBucket: "chatblox-561f3.firebasestorage.app",
  messagingSenderId: "901780847334",
  appId: "1:901780847334:web:3c59f2d92ef185290c1927"
};

const app = initializeApp(configuracionFirebase);
const baseDatos = getFirestore(app);
const autenticacion = getAuth(app);
const proveedorGoogle = new GoogleAuthProvider();

let usuarioActualAuth = null;
let perfilActual = null;
let idSalaActual = null;
let listaSalas = [];
let salasDesbloqueadas = [];
let cancelarEscuchaMensajes = null;
let adjuntoBase64 = null;

// Escuchar cambios de autenticación
onAuthStateChanged(autenticacion, async (usuario) => {
  usuarioActualAuth = usuario;
  const btnAuth = document.getElementById("btnOpenAuth");
  const chipUser = document.getElementById("userProfileChip");
  
  if (usuario) {
    if (btnAuth) btnAuth.classList.add("hidden");
    if (chipUser) chipUser.classList.remove("hidden");
    
    const refDoc = doc(baseDatos, "usuarios", usuario.uid);
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      perfilActual = snap.data();
      salasDesbloqueadas = perfilActual.salasDesbloqueadas || [];
    } else {
      perfilActual = { idUsuario: usuario.uid, nombreUsuario: usuario.displayName || "Usuario", salasDesbloqueadas: [] };
      await setDoc(refDoc, perfilActual);
    }
    const navUsername = document.getElementById("navUsername");
    if(navUsername) navUsername.innerText = perfilActual.nombreUsuario;
  } else {
    if (btnAuth) btnAuth.classList.remove("hidden");
    if (chipUser) chipUser.classList.add("hidden");
    perfilActual = null;
    salasDesbloqueadas = [];
  }
  renderizarSalas();
});

// Autenticación Google
const btnGoogle = document.getElementById("btnLoginGoogle");
if (btnGoogle) {
  btnGoogle.addEventListener("click", async () => {
    try {
      await signInWithPopup(autenticacion, proveedorGoogle);
      document.getElementById("modalAuth").classList.add("hidden");
    } catch (error) { console.error("Error Login:", error); }
  });
}

// Catálogo de Salas
onSnapshot(collection(baseDatos, "salas"), (snap) => {
  listaSalas = [];
  snap.forEach(d => listaSalas.push({ id: d.id, ...d.data() }));
  renderizarSalas();
});

function renderizarSalas() {
  const grid = document.getElementById("roomsGrid");
  if(!grid) return;
  grid.innerHTML = "";
  
  listaSalas.forEach(sala => {
    if (sala.esPrivada && (!usuarioActualAuth || (!salasDesbloqueadas.includes(sala.id) && sala.idCreador !== usuarioActualAuth.uid))) return;
    
    const card = document.createElement("div");
    card.className = "room-card";
    card.innerHTML = `<div class="card-thumb"><img src="${sala.imagen || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg width=\\'600\\' height=\\'350\\' xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23181a20\\'/></svg>'"/></div><div class="card-content"><h3>${sala.titulo}</h3><p>${sala.descripcion}</p></div>`;
    card.onclick = () => abrirSala(sala.id, sala.titulo);
    grid.appendChild(card);
  });
}

// Entrar al Chat
function abrirSala(id, titulo) {
  idSalaActual = id;
  document.getElementById("catalogView").classList.add("hidden");
  document.getElementById("chatView").classList.remove("hidden");
  document.getElementById("chatRoomTitle").innerText = titulo;
  
  if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();
  
  cancelarEscuchaMensajes = onSnapshot(query(collection(baseDatos, "salas", id, "mensajes"), orderBy("fechaCreacion", "asc")), (snap) => {
    const area = document.getElementById("messagesArea");
    area.innerHTML = "";
    snap.forEach(docMsg => {
      const d = docMsg.data();
      const esMio = perfilActual && d.idUsuario === perfilActual.idUsuario;
      const imgHtml = d.imagenAdjunta ? `<img src="${d.imagenAdjunta}" style="max-width:100%; border-radius:8px; margin-top:5px;"/>` : "";
      
      area.innerHTML += `
        <div class="chat-bubble ${esMio ? 'bubble-user' : 'bubble-other'}">
          <strong>${d.nombreUsuario}</strong>
          <div>${d.texto}</div>
          ${imgHtml}
        </div>`;
    });
    area.scrollTop = area.scrollHeight; // Auto-scroll
  });
}

// Enviar Mensaje
const btnSend = document.getElementById("btnSendMessage");
const inputChat = document.getElementById("chatInput");

async function mandarMensaje() {
  if (!idSalaActual || !usuarioActualAuth) return document.getElementById("modalAuth").classList.remove("hidden");
  const texto = inputChat.value.trim();
  if (!texto && !adjuntoBase64) return;
  
  await addDoc(collection(baseDatos, "salas", idSalaActual, "mensajes"), {
    idUsuario: perfilActual.idUsuario,
    nombreUsuario: perfilActual.nombreUsuario,
    texto,
    imagenAdjunta: adjuntoBase64,
    fechaCreacion: serverTimestamp()
  });
  
  inputChat.value = "";
  adjuntoBase64 = null;
}

if (btnSend) btnSend.addEventListener("click", mandarMensaje);
if (inputChat) inputChat.addEventListener("keypress", (e) => { if (e.key === "Enter") mandarMensaje(); });

// Botón Volver
const btnLeave = document.getElementById("btnLeaveRoom");
if (btnLeave) {
  btnLeave.addEventListener("click", () => {
    if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();
    idSalaActual = null;
    document.getElementById("chatView").classList.add("hidden");
    document.getElementById("catalogView").classList.remove("hidden");
  });
}

// Control Universal de Modales
document.querySelectorAll(".btn-close-modal").forEach(btn => {
  btn.addEventListener("click", () => btn.closest(".modal-overlay").classList.add("hidden"));
});
document.getElementById("btnOpenAuth")?.addEventListener("click", () => document.getElementById("modalAuth").classList.remove("hidden"));
