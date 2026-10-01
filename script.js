// ==================================================
// IMPORTACIONES DE FIREBASE MODULAR (POR CDN)
// ==================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Credenciales oficiales de tu proyecto en Firebase
const configuracionFirebase = {
  apiKey: "AIzaSyAHyOtOWEDC75bVYHyqPmpauNOiCjueltA",
  authDomain: "chatblox-561f3.firebaseapp.com",
  projectId: "chatblox-561f3",
  storageBucket: "chatblox-561f3.firebasestorage.app",
  messagingSenderId: "901780847334",
  appId: "1:901780847334:web:3c59f2d92ef185290c1927",
  measurementId: "G-9XSJF699P3"
};

// Inicialización de la aplicación y servicios
const app = initializeApp(configuracionFirebase);
const baseDatos = getFirestore(app);
const autenticacion = getAuth(app);

// Forzar idioma en español
autenticacion.languageCode = "es";

const proveedorGoogle = new GoogleAuthProvider();
const proveedorFacebook = new FacebookAuthProvider();

// ==================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==================================================
let usuarioActualAuth = null;
let perfilActual = null;
let listaSalas = [];
let idSalaActual = null;
let salaSeleccionadaModal = null;
let filtroCategoriaActual = "all";
let cancelarEscuchaMensajes = null;

// Elementos del DOM
const vistaCatalogo = document.getElementById("catalogView");
const vistaChat = document.getElementById("chatView");
const contenedorSalas = document.getElementById("roomsGrid");
const barraBusqueda = document.getElementById("searchInput");
const botonesFiltro = document.querySelectorAll(".filter-btn");

const botonAbrirAuth = document.getElementById("btnOpenAuth");
const tarjetaPerfilUsuario = document.getElementById("userProfileChip");
const avatarNavegacion = document.getElementById("navAvatar");
const nombreUsuarioNavegacion = document.getElementById("navUsername");
const botonCerrarSesion = document.getElementById("btnLogout");

const modalAutenticacion = document.getElementById("modalAuth");
const modalAsignarNombre = document.getElementById("modalSetUsername");
const formularioAsignarNombre = document.getElementById("formSetUsername");
const campoNombreUsuario = document.getElementById("customUsernameInput");
const botonIngresoGoogle = document.getElementById("btnLoginGoogle");
const botonIngresoFacebook = document.getElementById("btnLoginFacebook");
const textoErrorAuth = document.getElementById("authErrorMsg");

const modalDetallesSala = document.getElementById("modalDetails");
const modalUnirsePrivada = document.getElementById("modalPrivateJoin");
const modalCrearSala = document.getElementById("modalCreateRoom");

const areaMensajes = document.getElementById("messagesArea");
const campoTextoMensaje = document.getElementById("chatInput");
const botonEnviarMensaje = document.getElementById("btnSendMessage");
const botonSalirSala = document.getElementById("btnLeaveRoom");
const tituloSalaChat = document.getElementById("chatRoomTitle");
const imagenSalaChat = document.getElementById("chatRoomImg");
const listaParticipantes = document.getElementById("participantsList");

// ==================================================
// CONTROL DE SESIÓN Y APODO EN FIRESTORE
// ==================================================
onAuthStateChanged(autenticacion, async (usuario) => {
  usuarioActualAuth = usuario;

  if (usuario) {
    botonAbrirAuth.classList.add("hidden");
    tarjetaPerfilUsuario.classList.remove("hidden");

    // 1. Mostrar de inmediato el nombre de su cuenta mientras consulta la base de datos
    const nombreInicial = usuario.displayName || usuario.email.split('@')[0] || "Usuario";
    const apodoGuardadoLocal = localStorage.getItem("bloxchat_username_" + usuario.uid);

    perfilActual = {
      idUsuario: usuario.uid,
      nombreUsuario: apodoGuardadoLocal || nombreInicial,
      fotoURL: usuario.photoURL || null,
      correo: usuario.email || null
    };

    actualizarInterfazUsuario(perfilActual);

    // 2. Comprobar en Firestore si ya existe un perfil personalizado guardado
    try {
      const refDocUsuario = doc(baseDatos, "usuarios", usuario.uid);
      const snapUsuario = await getDoc(refDocUsuario);

      if (snapUsuario.exists() && snapUsuario.data().nombreUsuario) {
        perfilActual = snapUsuario.data();
        localStorage.setItem("bloxchat_username_" + usuario.uid, perfilActual.nombreUsuario);
        actualizarInterfazUsuario(perfilActual);
      } else if (!apodoGuardadoLocal) {
        // Si no tiene apodo guardado, abrir el modal para que lo elija
        campoNombreUsuario.value = nombreInicial.replace(/\s+/g, "_");
        modalAsignarNombre.classList.remove("hidden");
      }
    } catch (error) {
      console.warn("Aviso al consultar perfil en Firestore:", error);
      // Si la consulta tarda o falla, se conserva el nombre inicial sin bloquearse
    }
  } else {
    perfilActual = null;
    tarjetaPerfilUsuario.classList.add("hidden");
    botonAbrirAuth.classList.remove("hidden");
  }
});

function actualizarInterfazUsuario(perfil) {
  if (!perfil) return;
  nombreUsuarioNavegacion.innerText = perfil.nombreUsuario;
  if (perfil.fotoURL) {
    avatarNavegacion.innerHTML = `<img src="${perfil.fotoURL}" alt="avatar" />`;
  } else {
    avatarNavegacion.innerText = perfil.nombreUsuario.charAt(0).toUpperCase();
  }
}

// Guardar apodo personalizado
formularioAsignarNombre.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const nombreDeseado = campoNombreUsuario.value.trim();
  if (!nombreDeseado || !usuarioActualAuth) return;

  const datosPerfil = {
    idUsuario: usuarioActualAuth.uid,
    nombreUsuario: nombreDeseado,
    fotoURL: usuarioActualAuth.photoURL || null,
    correo: usuarioActualAuth.email || null,
    fechaActualizacion: serverTimestamp()
  };

  // Guardar en memoria local inmediatamente para que nunca espere
  perfilActual = datosPerfil;
  localStorage.setItem("bloxchat_username_" + usuarioActualAuth.uid, nombreDeseado);
  actualizarInterfazUsuario(datosPerfil);
  modalAsignarNombre.classList.add("hidden");

  // Guardar en Firestore
  try {
    await setDoc(doc(baseDatos, "usuarios", usuarioActualAuth.uid), datosPerfil, { merge: true });
  } catch (error) {
    console.error("Error al registrar nombre en Firestore:", error);
  }
});

// Cambiar apodo al hacer clic sobre el chip de perfil
tarjetaPerfilUsuario.addEventListener("click", (evento) => {
  if (evento.target.closest("#btnLogout")) return;
  if (perfilActual) {
    campoNombreUsuario.value = perfilActual.nombreUsuario;
    modalAsignarNombre.classList.remove("hidden");
  }
});

// Iniciar sesión con Google
botonIngresoGoogle.addEventListener("click", async () => {
  textoErrorAuth.classList.add("hidden");
  try {
    await signInWithPopup(autenticacion, proveedorGoogle);
    modalAutenticacion.classList.add("hidden");
  } catch (error) {
    console.error("Error al autenticar con Google:", error);
    textoErrorAuth.innerText = "Error con Google Sign-In. Comprueba los dominios autorizados en Firebase.";
    textoErrorAuth.classList.remove("hidden");
  }
});

// Iniciar sesión con Facebook
botonIngresoFacebook.addEventListener("click", async () => {
  textoErrorAuth.classList.add("hidden");
  try {
    await signInWithPopup(autenticacion, proveedorFacebook);
    modalAutenticacion.classList.add("hidden");
  } catch (error) {
    console.error("Error al autenticar con Facebook:", error);
    textoErrorAuth.innerText = "Facebook Login requiere registrar la App en Meta for Developers.";
    textoErrorAuth.classList.remove("hidden");
  }
});

// Cerrar sesión
botonCerrarSesion.addEventListener("click", async () => {
  await signOut(autenticacion);
  if (idSalaActual) {
    botonSalirSala.click();
  }
});

botonAbrirAuth.addEventListener("click", () => {
  textoErrorAuth.classList.add("hidden");
  modalAutenticacion.classList.remove("hidden");
});

// ==================================================
// CATÁLOGO DE SALAS PÚBLICAS EN TIEMPO REAL
// ==================================================
const refColeccionSalas = collection(baseDatos, "salas");

onSnapshot(refColeccionSalas, (instantanea) => {
  listaSalas = [];
  instantanea.forEach((docSala) => {
    listaSalas.push({ id: docSala.id, ...docSala.data() });
  });
  dibujarCatalogoSalas();
}, (error) => {
  console.error("Error al escuchar salas de Firestore:", error);
});

function dibujarCatalogoSalas() {
  contenedorSalas.innerHTML = "";
  const busqueda = barraBusqueda.value.toLowerCase().trim();

  // Ocultar salas privadas del catálogo público
  const salasVisibles = listaSalas.filter(sala => {
    if (sala.esPrivada) return false;
    const coincideCategoria = (filtroCategoriaActual === "all" || sala.categoria === filtroCategoriaActual);
    const coincideBusqueda = (sala.titulo || "").toLowerCase().includes(busqueda) || 
                             (sala.descripcion || "").toLowerCase().includes(busqueda);
    return coincideCategoria && coincideBusqueda;
  });

  if (salasVisibles.length === 0) {
    contenedorSalas.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No hay salas públicas disponibles. ¡Sé el primero en fundar una!</p>`;
    return;
  }

  salasVisibles.forEach(sala => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "room-card";
    tarjeta.innerHTML = `
      <div class="card-thumb">
        <img src="${sala.imagen}" alt="${sala.titulo}" loading="lazy" />
        <div class="online-badge">
          <i class="fa-solid fa-circle"></i>
          <span>${sala.contadorUsuarios || 1}</span>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-title">${sala.titulo}</h3>
        <p class="card-desc">${sala.descripcion}</p>
      </div>
    `;

    tarjeta.addEventListener("click", () => abrirDetallesSala(sala));
    contenedorSalas.appendChild(tarjeta);
  });
}

function abrirDetallesSala(sala) {
  salaSeleccionadaModal = sala;
  document.getElementById("modalImg").src = sala.imagen;
  document.getElementById("modalTitle").innerText = sala.titulo;
  document.getElementById("modalDesc").innerText = sala.descripcion;
  document.getElementById("modalUsers").innerText = sala.contadorUsuarios || 1;
  document.getElementById("modalCategory").innerText = (sala.categoria || "GENERAL").toUpperCase();
  document.getElementById("modalCode").innerText = sala.id;

  modalDetallesSala.classList.remove("hidden");
}

document.getElementById("btnLaunchChat").addEventListener("click", () => {
  if (salaSeleccionadaModal) {
    modalDetallesSala.classList.add("hidden");
    unirseASala(salaSeleccionadaModal.id);
  }
});

// ==================================================
// SISTEMA DE CHATROOM EN VIVO
// ==================================================
function unirseASala(idSala) {
  const sala = listaSalas.find(s => s.id === idSala);
  if (!sala) return;

  idSalaActual = idSala;
  tituloSalaChat.innerText = sala.titulo;
  imagenSalaChat.src = sala.imagen;

  const nombreMostrar = perfilActual ? perfilActual.nombreUsuario : "Invitado";
  listaParticipantes.innerHTML = `
    <div class="participant-item">
      <div class="avatar" style="background:#00b06f;">${nombreMostrar.charAt(0).toUpperCase()}</div>
      <span>${nombreMostrar} (Tú)</span>
    </div>
  `;

  vistaCatalogo.classList.add("hidden");
  vistaChat.classList.remove("hidden");
  campoTextoMensaje.focus();

  if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();

  // Escuchar subcolección "mensajes" ordenada cronológicamente
  const refMensajes = collection(baseDatos, "salas", idSala, "mensajes");
  const consultaMensajes = query(refMensajes, orderBy("fechaCreacion", "asc"));

  cancelarEscuchaMensajes = onSnapshot(consultaMensajes, (instantanea) => {
    areaMensajes.innerHTML = "";
    instantanea.forEach((docMensaje) => {
      const datos = docMensaje.data();
      const esMio = (perfilActual && datos.idUsuario === perfilActual.idUsuario) || datos.nombreUsuario === nombreMostrar;
      const burbuja = document.createElement("div");
      burbuja.className = `chat-bubble ${esMio ? 'bubble-user' : 'bubble-other'}`;
      burbuja.innerHTML = `
        ${!esMio ? `<div class="bubble-author">${escaparTextoHTML(datos.nombreUsuario || "Anónimo")}</div>` : ""}
        <div>${escaparTextoHTML(datos.texto || "")}</div>
        <div class="bubble-time">${datos.hora || ""}</div>
      `;
      areaMensajes.appendChild(burbuja);
    });
    areaMensajes.scrollTop = areaMensajes.scrollHeight;
  }, (error) => {
    console.error("Error al recibir mensajes:", error);
  });
}

async function enviarMensaje() {
  if (!perfilActual) {
    modalAutenticacion.classList.remove("hidden");
    return;
  }

  const texto = campoTextoMensaje.value.trim();
  if (!texto || !idSalaActual) return;

  const ahora = new Date();
  const formatoHora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  campoTextoMensaje.value = "";

  try {
    const refMensajes = collection(baseDatos, "salas", idSalaActual, "mensajes");
    await addDoc(refMensajes, {
      idUsuario: perfilActual.idUsuario,
      nombreUsuario: perfilActual.nombreUsuario,
      texto: texto,
      hora: formatoHora,
      fechaCreacion: serverTimestamp()
    });
  } catch (error) {
    console.error("Error al registrar mensaje:", error);
  }
}

botonSalirSala.addEventListener("click", () => {
  if (cancelarEscuchaMensajes) {
    cancelarEscuchaMensajes();
    cancelarEscuchaMensajes = null;
  }
  idSalaActual = null;
  vistaChat.classList.add("hidden");
  vistaCatalogo.classList.remove("hidden");
  dibujarCatalogoSalas();
});

botonEnviarMensaje.addEventListener("click", enviarMensaje);
campoTextoMensaje.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") enviarMensaje();
});

// ==================================================
// ACCESO A SALA PRIVADA CON CONTRASEÑA
// ==================================================
document.getElementById("btnOpenPrivateJoin").addEventListener("click", () => {
  document.getElementById("privateErrorMsg").classList.add("hidden");
  document.getElementById("formPrivateJoin").reset();
  modalUnirsePrivada.classList.remove("hidden");
});

document.getElementById("formPrivateJoin").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const codigo = document.getElementById("privateCodeInput").value.trim();
  const clave = document.getElementById("privatePassInput").value.trim();
  const mensajeError = document.getElementById("privateErrorMsg");

  const salaEncontrada = listaSalas.find(s => s.id.toLowerCase() === codigo.toLowerCase() && s.esPrivada);

  if (salaEncontrada && salaEncontrada.clave === clave) {
    modalUnirsePrivada.classList.add("hidden");
    unirseASala(salaEncontrada.id);
  } else {
    mensajeError.classList.remove("hidden");
  }
});

// ==================================================
// CREACIÓN DE SALA EN FIRESTORE
// ==================================================
document.getElementById("btnOpenCreate").addEventListener("click", () => {
  if (!perfilActual) {
    modalAutenticacion.classList.remove("hidden");
    return;
  }
  document.getElementById("formCreateRoom").reset();
  document.getElementById("passwordGroup").classList.add("hidden");
  modalCrearSala.classList.remove("hidden");
});

document.getElementById("createIsPrivate").addEventListener("change", (evento) => {
  const grupoClave = document.getElementById("passwordGroup");
  const campoClave = document.getElementById("createPassword");
  if (evento.target.checked) {
    grupoClave.classList.remove("hidden");
    campoClave.setAttribute("required", "true");
  } else {
    grupoClave.classList.add("hidden");
    campoClave.removeAttribute("required");
  }
});

document.getElementById("formCreateRoom").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const esPrivada = document.getElementById("createIsPrivate").checked;
  const titulo = document.getElementById("createTitle").value.trim();
  const descripcion = document.getElementById("createDesc").value.trim();
  const categoria = document.getElementById("createCategory").value;
  const imagenPersonalizada = document.getElementById("createImgUrl").value.trim();
  const clave = document.getElementById("createPassword").value.trim();

  const idGenerado = (esPrivada ? "VIP-" : "SALA-") + Math.floor(1000 + Math.random() * 9000);
  const imagenDefecto = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";

  const datosSala = {
    titulo: titulo,
    descripcion: descripcion,
    categoria: categoria,
    esPrivada: esPrivada,
    clave: esPrivada ? clave : null,
    idCreador: perfilActual.idUsuario,
    nombreCreador: perfilActual.nombreUsuario,
    contadorUsuarios: 1,
    imagen: imagenPersonalizada || imagenDefecto,
    fechaCreacion: serverTimestamp()
  };

  try {
    const docSalaRef = doc(baseDatos, "salas", idGenerado);
    await setDoc(docSalaRef, datosSala);

    // Primer mensaje emitido por el sistema
    const refMensajes = collection(baseDatos, "salas", idGenerado, "mensajes");
    await addDoc(refMensajes, {
      nombreUsuario: "Sistema",
      texto: `Sala creada por ${perfilActual.nombreUsuario}. ¡Bienvenidos!`,
      hora: "Ahora",
      fechaCreacion: serverTimestamp()
    });

    modalCrearSala.classList.add("hidden");

    if (esPrivada) {
      alert(`¡Sala Privada Creada con Éxito!\n\nID: ${idGenerado}\nContraseña: ${clave}\n\nComparte estos datos únicamente con quienes quieras que entren.`);
    }
  } catch (error) {
    console.error("Error al registrar sala:", error);
    alert("Hubo un error al registrar la sala en Firebase.");
  }
});

// ==================================================
// FILTROS Y EVENTOS DE INTERFAZ
// ==================================================
botonesFiltro.forEach(boton => {
  boton.addEventListener("click", () => {
    botonesFiltro.forEach(b => b.classList.remove("active"));
    boton.classList.add("active");
    filtroCategoriaActual = boton.dataset.category;
    dibujarCatalogoSalas();
  });
});

barraBusqueda.addEventListener("input", dibujarCatalogoSalas);

document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", () => {
    const idModal = btn.dataset.close;
    document.getElementById(idModal).classList.add("hidden");
  });
});

window.addEventListener("click", (evento) => {
  if (evento.target.classList.contains("modal-overlay")) {
    evento.target.classList.add("hidden");
  }
});

function escaparTextoHTML(cadena) {
  return cadena.replace(/[&<>'"]/g, 
    etiqueta => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[etiqueta] || etiqueta)
  );
}
