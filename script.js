// ==================================================
// IMPORTACIONES DE FIREBASE MODULAR (CDN)
// ==================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Credenciales oficiales de tu proyecto
const configuracionFirebase = {
  apiKey: "AIzaSyAHyOtOWEDC75bVYHyqPmpauNOiCjueltA",
  authDomain: "chatblox-561f3.firebaseapp.com",
  projectId: "chatblox-561f3",
  storageBucket: "chatblox-561f3.firebasestorage.app",
  messagingSenderId: "901780847334",
  appId: "1:901780847334:web:3c59f2d92ef185290c1927",
  measurementId: "G-9XSJF699P3"
};

const app = initializeApp(configuracionFirebase);
const baseDatos = getFirestore(app);
const autenticacion = getAuth(app);

autenticacion.languageCode = "es";

const proveedorGoogle = new GoogleAuthProvider();
proveedorGoogle.setCustomParameters({ prompt: "select_account" });
const proveedorFacebook = new FacebookAuthProvider();

// Portada por defecto 100% segura (SVG en Data URI, nunca falla)
const PORTADA_DEFECTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='350' viewBox='0 0 600 350'><rect width='600' height='350' fill='%23181a20'/><circle cx='300' cy='150' r='60' fill='%2300b06f'/><text x='300' y='165' font-family='sans-serif' font-weight='900' font-size='42' fill='%23ffffff' text-anchor='middle'>BLOX</text><text x='300' y='250' font-family='sans-serif' font-weight='700' font-size='20' fill='%239ca3af' text-anchor='middle'>SALA DE CHAT</text></svg>";

// Helper para escapar HTML y evitar XSS
function escaparTextoHTML(cadena) {
  if (!cadena) return "";
  return String(cadena)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==================================================
// CONTROL JERÁRQUICO: OWNER SUPREMO Y MODS GLOBALES
// ==================================================
const CORREOS_OWNER = [
  "jose.ignacio.ramirez.lizarraga@gmail.com",
  "dj.nacho676667373@gmail.com"
];

let esOwnerSupremo = false;
let esModGlobal = false;
let listaModsGlobales = new Map();

let miIPActual = null;
let ipsBaneadas = new Set();
let uidsBaneados = new Set();

async function capturarIPVisitante() {
  try {
    const respuesta = await fetch("https://api.ipify.org?format=json");
    const datos = await respuesta.json();
    miIPActual = datos.ip.replace(/\./g, "_");
    verificarBaneo();
  } catch (error) {
    console.warn("Aviso de red:", error);
  }
}
capturarIPVisitante();

onSnapshot(collection(baseDatos, "ips_baneadas"), (snap) => {
  ipsBaneadas.clear();
  snap.forEach(docIP => ipsBaneadas.add(docIP.id));
  verificarBaneo();
});

onSnapshot(collection(baseDatos, "baneados"), (snap) => {
  uidsBaneados.clear();
  snap.forEach(docBan => uidsBaneados.add(docBan.id));
  verificarBaneo();
});

onSnapshot(collection(baseDatos, "moderadores_globales"), (snap) => {
  listaModsGlobales.clear();
  snap.forEach(docMod => listaModsGlobales.set(docMod.id, docMod.data()));

  if (usuarioActualAuth) {
    esModGlobal = listaModsGlobales.has(usuarioActualAuth.uid);
    actualizarInterfazUsuario(perfilActual);
    if (esOwnerSupremo) renderizarListaModsPanel();
  }
});

function verificarBaneo() {
  if ((miIPActual && ipsBaneadas.has(miIPActual)) || (usuarioActualAuth && uidsBaneados.has(usuarioActualAuth.uid))) {
    mostrarPantallaBaneo();
  }
}

function mostrarPantallaBaneo() {
  signOut(autenticacion);
  document.body.innerHTML = `
    <div class="banned-screen">
      <i class="fa-solid fa-ban" style="font-size: 5rem; color: #d90429; margin-bottom: 20px;"></i>
      <h1 style="font-size: 2.2rem; font-weight: 900; margin-bottom: 10px;">ACCESO BLOQUEADO PERMANENTEMENTE</h1>
      <p style="color: #94969c; max-width: 480px; line-height: 1.6;">Tu dirección de red y cuenta han sido vetadas de BloxChat por infracciones a las normas comunitarias.</p>
    </div>
  `;
}

// ==================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==================================================
let usuarioActualAuth = null;
let perfilActual = null;
let listaSalas = [];
let salaActualData = null;
let idSalaActual = null;
let salaSeleccionadaModal = null;
let filtroCategoriaActual = "all";
let cancelarEscuchaMensajes = null;
let cancelarEscuchaSalaActual = null;

// Array local con los IDs de las salas privadas desbloqueadas por el usuario
let salasPrivadasDesbloqueadas = [];

// Elementos DOM
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
const botonIngresoGoogle = document.getElementById("btnLoginGoogle");
const botonIngresoFacebook = document.getElementById("btnLoginFacebook");
const textoErrorAuth = document.getElementById("authErrorMsg");

// Modal de Perfil
const modalPerfil = document.getElementById("modalUserProfile");
const formPerfil = document.getElementById("formUserProfile");
const campoNombrePerfil = document.getElementById("profileUsernameInput");
const avisoEnfriamiento = document.getElementById("usernameCooldownNotice");
const textoDiasRestantes = document.getElementById("daysRemainingText");
const avatarPreviewImg = document.getElementById("avatarPreviewImg");
const avatarPreviewText = document.getElementById("avatarPreviewText");
const inputGaleria = document.getElementById("inputAvatarGallery");
const inputCamara = document.getElementById("inputAvatarCamera");
const btnSwitchAccount = document.getElementById("btnSwitchAccount");

let nuevaFotoTemporalBase64 = null;
const DIAS_ENFRIAMIENTO = 60;
const TIEMPO_ENFRIAMIENTO_MS = DIAS_ENFRIAMIENTO * 24 * 60 * 60 * 1000;

// Panel del Owner
const btnOpenOwnerPanel = document.getElementById("btnOpenOwnerPanel");
const modalOwnerPanel = document.getElementById("modalOwnerPanel");
const newModInput = document.getElementById("newModInput");
const btnAddModGlobal = document.getElementById("btnAddModGlobal");
const activeModsList = document.getElementById("activeModsList");

// Ajustes de sala
const btnOpenRoomSettings = document.getElementById("btnOpenRoomSettings");
const modalEditRoom = document.getElementById("modalEditRoom");
const formEditRoom = document.getElementById("formEditRoom");
const editRoomTitle = document.getElementById("editRoomTitle");
const editRoomDesc = document.getElementById("editRoomDesc");
const editRoomPreviewImg = document.getElementById("editRoomPreviewImg");
const inputEditRoomGallery = document.getElementById("inputEditRoomGallery");
const inputEditRoomCamera = document.getElementById("inputEditRoomCamera");
const editPasswordContainer = document.getElementById("editPasswordContainer");
const editRoomPass = document.getElementById("editRoomPass");
let nuevaFotoPortadaEditBase64 = null;

// Modales del sistema
const modalDetallesSala = document.getElementById("modalDetails");
const modalUnirsePrivada = document.getElementById("modalPrivateJoin");
const modalCrearSala = document.getElementById("modalCreateRoom");
const createRoomPreviewImg = document.getElementById("createRoomPreviewImg");
const inputCreateRoomGallery = document.getElementById("inputCreateRoomGallery");
const inputCreateRoomCamera = document.getElementById("inputCreateRoomCamera");
let nuevaFotoPortadaCreateBase64 = null;

// Chat y previsualización de imagen adjunta
const areaMensajes = document.getElementById("messagesArea");
const campoTextoMensaje = document.getElementById("chatInput");
const botonEnviarMensaje = document.getElementById("btnSendMessage");
const botonSalirSala = document.getElementById("btnLeaveRoom");
const tituloSalaChat = document.getElementById("chatRoomTitle");
const imagenSalaChat = document.getElementById("chatRoomImg");
const listaParticipantes = document.getElementById("participantsList");

const inputChatCamera = document.getElementById("inputChatCamera");
const inputChatGallery = document.getElementById("inputChatGallery");
const chatAttachmentBox = document.getElementById("chatAttachmentBox");
const chatAttachmentImg = document.getElementById("chatAttachmentImg");
const btnRemoveChatAttachment = document.getElementById("btnRemoveChatAttachment");
let fotoPendienteDeEnvioBase64 = null;

// Visor de imagen
const modalImageViewer = document.getElementById("modalImageViewer");
const fullViewImage = document.getElementById("fullViewImage");

// ==================================================
// FUNCIÓN UNIVERSAL: COMPRESIÓN DE IMÁGENES
// ==================================================
function procesarImagenCanvas(archivo, maxAncho, maxAlto, calidad, callback) {
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxAncho || h > maxAlto) {
        if (w > h) {
          h = Math.round((h * maxAncho) / w);
          w = maxAncho;
        } else {
          w = Math.round((w * maxAlto) / h);
          h = maxAlto;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const resultadoBase64 = canvas.toDataURL("image/jpeg", calidad);
      callback(resultadoBase64);
    };
    img.src = e.target.result;
  };
  lector.readAsDataURL(archivo);
}

// ==================================================
// CONTROL DE AUTENTICACIÓN
// ==================================================
onAuthStateChanged(autenticacion, async (usuario) => {
  usuarioActualAuth = usuario;

  if (usuario) {
    if (uidsBaneados.has(usuario.uid)) {
      mostrarPantallaBaneo();
      return;
    }

    esOwnerSupremo = usuario.email && CORREOS_OWNER.includes(usuario.email.toLowerCase());
    esModGlobal = listaModsGlobales.has(usuario.uid);

    if (botonAbrirAuth) botonAbrirAuth.classList.add("hidden");
    if (tarjetaPerfilUsuario) tarjetaPerfilUsuario.classList.remove("hidden");

    if (btnOpenOwnerPanel) {
      if (esOwnerSupremo) btnOpenOwnerPanel.classList.remove("hidden");
      else btnOpenOwnerPanel.classList.add("hidden");
    }

    const nombreSugerido = usuario.displayName || (usuario.email ? usuario.email.split('@')[0] : "Usuario");

    try {
      const refDocUsuario = doc(baseDatos, "usuarios", usuario.uid);
      const snapUsuario = await getDoc(refDocUsuario);

      if (snapUsuario.exists()) {
        perfilActual = snapUsuario.data();
        salasPrivadasDesbloqueadas = perfilActual.salasDesbloqueadas || [];
      } else {
        perfilActual = {
          idUsuario: usuario.uid,
          nombreUsuario: nombreSugerido,
          fotoURL: usuario.photoURL || null,
          correo: usuario.email || null,
          ultimaIP: miIPActual || null,
          fechaUltimoCambioNombre: Date.now(),
          salasDesbloqueadas: []
        };
        salasPrivadasDesbloqueadas = [];
        await setDoc(refDocUsuario, perfilActual);
      }

      actualizarInterfazUsuario(perfilActual);

      if (miIPActual) {
        await updateDoc(refDocUsuario, { ultimaIP: miIPActual }).catch(() => {});
      }
    } catch (error) {
      console.warn("Aviso Firestore:", error);
      perfilActual = {
        idUsuario: usuario.uid,
        nombreUsuario: nombreSugerido,
        fotoURL: usuario.photoURL || null,
        correo: usuario.email || null,
        ultimaIP: miIPActual || null,
        salasDesbloqueadas: []
      };
      salasPrivadasDesbloqueadas = [];
      actualizarInterfazUsuario(perfilActual);
    }
  } else {
    esOwnerSupremo = false;
    esModGlobal = false;
    perfilActual = null;
    salasPrivadasDesbloqueadas = [];
    if (btnOpenOwnerPanel) btnOpenOwnerPanel.classList.add("hidden");
    if (tarjetaPerfilUsuario) tarjetaPerfilUsuario.classList.add("hidden");
    if (botonAbrirAuth) botonAbrirAuth.classList.remove("hidden");
  }

  dibujarCatalogoSalas();
});

function actualizarInterfazUsuario(perfil) {
  if (!perfil || !nombreUsuarioNavegacion) return;

  let insigniaHTML = "";
  if (esOwnerSupremo) {
    insigniaHTML = `<span class="badge-owner"><i class="fa-solid fa-crown"></i> OWNER</span>`;
  } else if (esModGlobal) {
    insigniaHTML = `<span class="badge-mod-global"><i class="fa-solid fa-shield"></i> MOD</span>`;
  }

  nombreUsuarioNavegacion.innerHTML = `${escaparTextoHTML(perfil.nombreUsuario)} ${insigniaHTML}`;

  if (avatarNavegacion) {
    if (perfil.fotoURL) {
      avatarNavegacion.innerHTML = `<img src="${perfil.fotoURL}" alt="avatar" />`;
    } else {
      avatarNavegacion.innerText = (perfil.nombreUsuario || "U").charAt(0).toUpperCase();
    }
  }
}

// ==================================================
// PERFIL Y OPCIÓN DE CAMBIAR DE CUENTA
// ==================================================
if (tarjetaPerfilUsuario) {
  tarjetaPerfilUsuario.addEventListener("click", (evento) => {
    if (evento.target.closest("#btnLogout")) return;
    if (!perfilActual || !modalPerfil) return;

    nuevaFotoTemporalBase64 = null;
    if (campoNombrePerfil) campoNombrePerfil.value = perfilActual.nombreUsuario || "";

    if (avatarPreviewImg && avatarPreviewText) {
      if (perfilActual.fotoURL) {
        avatarPreviewImg.src = perfilActual.fotoURL;
        avatarPreviewImg.classList.remove("hidden");
        avatarPreviewText.classList.add("hidden");
      } else {
        avatarPreviewImg.classList.add("hidden");
        avatarPreviewText.innerText = (perfilActual.nombreUsuario || "U").charAt(0).toUpperCase();
        avatarPreviewText.classList.remove("hidden");
      }
    }

    const ahora = Date.now();
    const fechaUltimoCambio = perfilActual.fechaUltimoCambioNombre || 0;
    const tiempoTranscurrido = ahora - fechaUltimoCambio;

    if (campoNombrePerfil && avisoEnfriamiento) {
      if (fechaUltimoCambio && tiempoTranscurrido < TIEMPO_ENFRIAMIENTO_MS) {
        const msRestantes = TIEMPO_ENFRIAMIENTO_MS - tiempoTranscurrido;
        const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));
        campoNombrePerfil.disabled = true;
        if (textoDiasRestantes) textoDiasRestantes.innerText = diasRestantes;
        avisoEnfriamiento.classList.remove("hidden");
      } else {
        campoNombrePerfil.disabled = false;
        avisoEnfriamiento.classList.add("hidden");
      }
    }

    modalPerfil.classList.remove("hidden");
  });
}

if (btnSwitchAccount) {
  btnSwitchAccount.addEventListener("click", async () => {
    if (modalPerfil) modalPerfil.classList.add("hidden");
    await signOut(autenticacion);
    if (idSalaActual && botonSalirSala) botonSalirSala.click();

    if (modalAutenticacion) modalAutenticacion.classList.remove("hidden");
  });
}

function actualizarAvatarPerfilModal(base64) {
  nuevaFotoTemporalBase64 = base64;
  if (avatarPreviewImg && avatarPreviewText) {
    avatarPreviewImg.src = base64;
    avatarPreviewImg.classList.remove("hidden");
    avatarPreviewText.classList.add("hidden");
  }
}

if (inputGaleria) {
  inputGaleria.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 250, 250, 0.85, actualizarAvatarPerfilModal);
    }
  });
}

if (inputCamara) {
  inputCamara.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 250, 250, 0.85, actualizarAvatarPerfilModal);
    }
  });
}

if (formPerfil) {
  formPerfil.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!usuarioActualAuth || !perfilActual) return;

    const nuevoNombre = campoNombrePerfil ? campoNombrePerfil.value.trim() : perfilActual.nombreUsuario;
    const haCambiadoNombre = (nuevoNombre !== perfilActual.nombreUsuario) && !(campoNombrePerfil && campoNombrePerfil.disabled);

    const datosActualizados = {
      fotoURL: nuevaFotoTemporalBase64 || perfilActual.fotoURL || null,
      ultimaIP: perfilActual.ultimaIP || miIPActual || null,
      fechaActualizacion: serverTimestamp()
    };

    if (haCambiadoNombre) {
      datosActualizados.nombreUsuario = nuevoNombre;
      datosActualizados.fechaUltimoCambioNombre = Date.now();
    }

    try {
      const refDocUsuario = doc(baseDatos, "usuarios", usuarioActualAuth.uid);
      await setDoc(refDocUsuario, datosActualizados, { merge: true });

      perfilActual = { ...perfilActual, ...datosActualizados };
      actualizarInterfazUsuario(perfilActual);
      if (modalPerfil) modalPerfil.classList.add("hidden");
      alert("¡Perfil actualizado con éxito!");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      alert("Hubo un fallo al guardar los cambios.");
    }
  });
}

// ==================================================
// AUTENTICACIÓN
// ==================================================
if (botonIngresoGoogle) {
  botonIngresoGoogle.addEventListener("click", async () => {
    if (textoErrorAuth) textoErrorAuth.classList.add("hidden");
    try {
      await signInWithPopup(autenticacion, proveedorGoogle);
      if (modalAutenticacion) modalAutenticacion.classList.add("hidden");
    } catch (error) {
      if (textoErrorAuth) {
        textoErrorAuth.innerText = "Error con Google Sign-In.";
        textoErrorAuth.classList.remove("hidden");
      }
    }
  });
}

if (botonIngresoFacebook) {
  botonIngresoFacebook.addEventListener("click", async () => {
    if (textoErrorAuth) textoErrorAuth.classList.add("hidden");
    try {
      await signInWithPopup(autenticacion, proveedorFacebook);
      if (modalAutenticacion) modalAutenticacion.classList.add("hidden");
    } catch (error) {
      if (textoErrorAuth) {
        textoErrorAuth.innerText = "Facebook Login requiere configuración en Meta.";
        textoErrorAuth.classList.remove("hidden");
      }
    }
  });
}

if (botonCerrarSesion) {
  botonCerrarSesion.addEventListener("click", async () => {
    await signOut(autenticacion);
    if (idSalaActual && botonSalirSala) botonSalirSala.click();
  });
}

if (botonAbrirAuth) {
  botonAbrirAuth.addEventListener("click", () => {
    if (textoErrorAuth) textoErrorAuth.classList.add("hidden");
    if (modalAutenticacion) modalAutenticacion.classList.remove("hidden");
  });
}

// ==================================================
// PANEL DEL OWNER (UID Y ASCENSO DIRECTO)
// ==================================================
window.copiarUID = function(uid) {
  navigator.clipboard.writeText(uid);
  alert(`ID copiado al portapapeles:\n${uid}`);
};

window.promoverAModDirecto = async function(uidObjetivo, nombreObjetivo) {
  if (!esOwnerSupremo) return;
  if (uidObjetivo === usuarioActualAuth.uid) return alert("Tú ya eres el Owner Supremo.");
  if (listaModsGlobales.has(uidObjetivo)) return alert(`@${nombreObjetivo} ya es Moderador Global.`);

  const confirmar = confirm(`¿Deseas ascender a "@${nombreObjetivo}" a Moderador Global de BloxChat?`);
  if (!confirmar) return;

  try {
    await setDoc(doc(baseDatos, "moderadores_globales", uidObjetivo), {
      nombreUsuario: nombreObjetivo,
      asignadoPor: perfilActual.nombreUsuario,
      fechaAsignacion: serverTimestamp()
    });
    alert(`¡@${nombreObjetivo} ahora es Moderador Global!`);
  } catch (error) {
    console.error("Error al ascender:", error);
    alert("No se pudo otorgar el rango.");
  }
};

if (btnOpenOwnerPanel) {
  btnOpenOwnerPanel.addEventListener("click", () => {
    if (!esOwnerSupremo) return;
    renderizarListaModsPanel();
    if (modalOwnerPanel) modalOwnerPanel.classList.remove("hidden");
  });
}

function renderizarListaModsPanel() {
  if (!activeModsList) return;
  activeModsList.innerHTML = "";

  if (listaModsGlobales.size === 0) {
    activeModsList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No hay moderadores globales activos.</p>`;
    return;
  }

  listaModsGlobales.forEach((datos, uid) => {
    const item = document.createElement("div");
    item.className = "mod-list-item";
    item.innerHTML = `
      <div>
        <strong>${escaparTextoHTML(datos.nombreUsuario || "Moderador")}</strong>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${escaparTextoHTML(datos.correo || uid)}</div>
      </div>
      <button class="btn-revoke-mod" onclick="window.revocarModGlobal('${uid}', '${escaparTextoHTML(datos.nombreUsuario || 'Usuario')}')">
        <i class="fa-solid fa-user-xmark"></i> Quitar Rango
      </button>
    `;
    activeModsList.appendChild(item);
  });
}

if (btnAddModGlobal) {
  btnAddModGlobal.addEventListener("click", async () => {
    if (!esOwnerSupremo || !newModInput) return;
    const identificador = newModInput.value.trim();
    if (!identificador) return;

    try {
      let uidObjetivo = identificador;
      let datosUsuario = { nombreUsuario: "Mod_" + identificador.slice(0, 5), correo: identificador };

      if (identificador.includes("@")) {
        const q = query(collection(baseDatos, "usuarios"), where("correo", "==", identificador.toLowerCase()));
        const snap = await getDocs(q);
        if (snap.empty) return alert("No se encontró usuario con ese correo.");
        uidObjetivo = snap.docs[0].id;
        datosUsuario = snap.docs[0].data();
      }

      if (uidObjetivo === usuarioActualAuth.uid) return alert("Tú ya eres el Owner Supremo.");

      await setDoc(doc(baseDatos, "moderadores_globales", uidObjetivo), {
        nombreUsuario: datosUsuario.nombreUsuario || "Moderador",
        correo: datosUsuario.correo || identificador,
        asignadoPor: perfilActual.nombreUsuario,
        fechaAsignacion: serverTimestamp()
      });

      newModInput.value = "";
      alert(`Rango de Moderador Global otorgado.`);
    } catch (error) {
      console.error("Error al asignar mod:", error);
    }
  });
}

window.revocarModGlobal = async function(uidMod, nombreMod) {
  if (!esOwnerSupremo) return;
  const confirmar = confirm(`¿Deseas quitar el rango a "${nombreMod}"?`);
  if (!confirmar) return;

  try {
    await deleteDoc(doc(baseDatos, "moderadores_globales", uidMod));
    alert(`Rango revocado a ${nombreMod}.`);
  } catch (error) {
    console.error("Error al revocar mod:", error);
  }
};

window.ejecutarSancion = async function(uidABanear, nombreABanear) {
  if (!esOwnerSupremo && !esModGlobal) return alert("No tienes rango de moderador global.");

  const docInfractor = await getDoc(doc(baseDatos, "usuarios", uidABanear));
  const correoInfractor = (docInfractor.exists() && docInfractor.data().correo) ? docInfractor.data().correo.toLowerCase() : "";
  
  if (CORREOS_OWNER.includes(correoInfractor) || uidABanear === usuarioActualAuth.uid) {
    return alert("ACCESO DENEGADO: El Creador y Owner Supremo es intocable.");
  }

  if (!esOwnerSupremo && listaModsGlobales.has(uidABanear)) {
    return alert("Un Moderador Global no puede sancionar a otro Moderador Global.");
  }

  const confirmar = confirm(`¿Confirmar baneo definitivo y purga para "${nombreABanear}"?`);
  if (!confirmar) return;

  try {
    let ipInfractor = (docInfractor.exists() && docInfractor.data().ultimaIP) ? docInfractor.data().ultimaIP : null;

    await setDoc(doc(baseDatos, "baneados", uidABanear), {
      nombreUsuario: nombreABanear,
      ejecutadoPor: perfilActual.nombreUsuario,
      rangoEjecutor: esOwnerSupremo ? "OWNER" : "MOD_GLOBAL",
      fecha: serverTimestamp()
    });

    if (ipInfractor) {
      await setDoc(doc(baseDatos, "ips_baneadas", ipInfractor), {
        idUsuarioOriginal: uidABanear,
        nombreUsuarioOriginal: nombreABanear,
        fecha: serverTimestamp()
      });
    }

    if (idSalaActual) {
      const refMensajesSala = collection(baseDatos, "salas", idSalaActual, "mensajes");
      const consultaMensajes = query(refMensajesSala, where("idUsuario", "==", uidABanear));
      const snap = await getDocs(consultaMensajes);

      const borrados = [];
      snap.forEach(d => borrados.push(deleteDoc(doc(baseDatos, "salas", idSalaActual, "mensajes", d.id))));
      await Promise.all(borrados);

      await addDoc(refMensajesSala, {
        nombreUsuario: "🛡️ SISTEMA",
        texto: `El usuario @${nombreABanear} fue sancionado por ${esOwnerSupremo ? "el Creador Supremo" : "la Moderación Global"}. Mensajes purgados.`,
        hora: "Ahora",
        fechaCreacion: serverTimestamp()
      });
    }

    alert(`Sanción aplicada a ${nombreABanear}.`);
  } catch (error) {
    console.error("Error al sancionar:", error);
  }
};

// ==================================================
// CATÁLOGO DE SALAS PÚBLICAS Y PRIVADAS DESBLOQUEADAS
// ==================================================
const refColeccionSalas = collection(baseDatos, "salas");

onSnapshot(refColeccionSalas, (instantanea) => {
  listaSalas = [];
  instantanea.forEach((docSala) => {
    listaSalas.push({ id: docSala.id, ...docSala.data() });
  });
  dibujarCatalogoSalas();
});

function dibujarCatalogoSalas() {
  if (!contenedorSalas) return;
  contenedorSalas.innerHTML = "";
  const busqueda = barraBusqueda ? barraBusqueda.value.toLowerCase().trim() : "";

  const salasVisibles = listaSalas.filter(sala => {
    // Si la sala es privada, SOLO se muestra en el catálogo si el usuario es el creador
    // O si la sala fue desbloqueada previamente y guardada en su perfil
    if (sala.esPrivada) {
      const esCreador = usuarioActualAuth && (sala.idCreador === usuarioActualAuth.uid);
      const estaDesbloqueada = salasPrivadasDesbloqueadas.includes(sala.id) || 
                               (sala.codigo && salasPrivadasDesbloqueadas.includes(sala.codigo));

      if (!esCreador && !estaDesbloqueada) {
        return false;
      }
    }

    const coincideCat = (filtroCategoriaActual === "all" || sala.categoria === filtroCategoriaActual);
    const coincideTxt = (sala.titulo || "").toLowerCase().includes(busqueda) || 
                        (sala.descripcion || "").toLowerCase().includes(busqueda);
    return coincideCat && coincideTxt;
  });

  if (salasVisibles.length === 0) {
    contenedorSalas.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No hay salas disponibles en esta sección. ¡Sé el primero en crear una o unirte a una privada!</p>`;
    return;
  }

  salasVisibles.forEach(sala => {
    const registrados = Array.isArray(sala.usuariosRegistrados) ? sala.usuariosRegistrados.length : 1;
    const portadaSegura = (sala.imagen && sala.imagen.trim().length > 10) ? sala.imagen : PORTADA_DEFECTO;

    const tarjeta = document.createElement("div");
    tarjeta.className = "room-card";
    tarjeta.innerHTML = `
      <div class="card-thumb">
        <img src="${portadaSegura}" alt="${escaparTextoHTML(sala.titulo)}" loading="lazy" onerror="this.onerror=null; this.src='${PORTADA_DEFECTO}';" />
        <span class="room-registered-badge">
          <i class="fa-solid ${sala.esPrivada ? 'fa-lock' : 'fa-users'}"></i> ${sala.esPrivada ? 'PRIVADA' : registrados + ' registrados'}
        </span>
      </div>
      <div class="card-content">
        <h3 class="card-title">${escaparTextoHTML(sala.titulo)}</h3>
        <p class="card-desc">${escaparTextoHTML(sala.descripcion)}</p>
      </div>
    `;
    tarjeta.addEventListener("click", () => abrirDetallesSala(sala));
    contenedorSalas.appendChild(tarjeta);
  });
}

// Filtros por Categoría
botonesFiltro.forEach(btn => {
  btn.addEventListener("click", () => {
    botonesFiltro.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filtroCategoriaActual = btn.getAttribute("data-category") || "all";
    dibujarCatalogoSalas();
  });
});

if (barraBusqueda) {
  barraBusqueda.addEventListener("input", () => {
    dibujarCatalogoSalas();
  });
}

function abrirDetallesSala(sala) {
  salaSeleccionadaModal = sala;
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalCategory = document.getElementById("modalCategory");
  const modalCode = document.getElementById("modalCode");
  const modalRegisteredCount = document.getElementById("modalRegisteredCount");

  const registrados = Array.isArray(sala.usuariosRegistrados) ? sala.usuariosRegistrados.length : 1;
  const portadaSegura = (sala.imagen && sala.imagen.trim().length > 10) ? sala.imagen : PORTADA_DEFECTO;

  if (modalImg) {
    modalImg.src = portadaSegura;
    modalImg.onerror = () => { modalImg.src = PORTADA_DEFECTO; };
  }
  if (modalTitle) modalTitle.innerText = sala.titulo;
  if (modalDesc) modalDesc.innerText = sala.descripcion;
  if (modalCategory) modalCategory.innerText = (sala.categoria || "GENERAL").toUpperCase();
  if (modalCode) modalCode.innerText = sala.codigo || sala.id;
  if (modalRegisteredCount) modalRegisteredCount.innerText = registrados;

  if (modalDetallesSala) modalDetallesSala.classList.remove("hidden");
}

const btnLaunchChat = document.getElementById("btnLaunchChat");
if (btnLaunchChat) {
  btnLaunchChat.addEventListener("click", () => {
    if (salaSeleccionadaModal) {
      if (modalDetallesSala) modalDetallesSala.classList.add("hidden");
      unirseASala(salaSeleccionadaModal.id);
    }
  });
}

// ==================================================
// UNIRSE A SALA PRIVADA CON CLAVE Y GUARDAR EN PERFIL
// ==================================================
const btnOpenJoinPrivate = document.getElementById("btnOpenJoinPrivate");
const formJoinPrivate = document.getElementById("formJoinPrivate");
const joinPrivateCodeInput = document.getElementById("joinPrivateCodeInput");
const joinPrivatePassInput = document.getElementById("joinPrivatePassInput");

if (btnOpenJoinPrivate) {
  btnOpenJoinPrivate.addEventListener("click", () => {
    if (modalUnirsePrivada) modalUnirsePrivada.classList.remove("hidden");
  });
}

if (formJoinPrivate) {
  formJoinPrivate.addEventListener("submit", async (e) => {
    e.preventDefault();
    const codigoIngresado = joinPrivateCodeInput.value.trim();
    const claveIngresada = joinPrivatePassInput.value.trim();

    if (!codigoIngresado || !claveIngresada) return alert("Completa ambos campos.");

    const salaEncontrada = listaSalas.find(s => 
      s.esPrivada && 
      (s.id === codigoIngresado || s.codigo === codigoIngresado) && 
      s.clave === claveIngresada
    );

    if (salaEncontrada) {
      if (usuarioActualAuth) {
        if (!salasPrivadasDesbloqueadas.includes(salaEncontrada.id)) {
          salasPrivadasDesbloqueadas.push(salaEncontrada.id);
        }

        try {
          const userRef = doc(baseDatos, "usuarios", usuarioActualAuth.uid);
          await updateDoc(userRef, {
            salasDesbloqueadas: arrayUnion(salaEncontrada.id)
          });
        } catch (err) {
          console.error("Error al guardar sala privada en perfil:", err);
        }
      }

      joinPrivateCodeInput.value = "";
      joinPrivatePassInput.value = "";
      if (modalUnirsePrivada) modalUnirsePrivada.classList.add("hidden");

      dibujarCatalogoSalas();
      unirseASala(salaEncontrada.id);
    } else {
      alert("Código de sala o contraseña incorrectos.");
    }
  });
}

// ==================================================
// CREACIÓN DE SALAS (PÚBLICAS O PRIVADAS)
// ==================================================
const btnOpenCreateRoom = document.getElementById("btnOpenCreateRoom");
const formCreateRoom = document.getElementById("formCreateRoom");
const createRoomTitle = document.getElementById("createRoomTitle");
const createRoomDesc = document.getElementById("createRoomDesc");
const createRoomCategory = document.getElementById("createRoomCategory");
const createRoomIsPrivate = document.getElementById("createRoomIsPrivate");
const createPasswordContainer = document.getElementById("createPasswordContainer");
const createRoomPass = document.getElementById("createRoomPass");

if (btnOpenCreateRoom) {
  btnOpenCreateRoom.addEventListener("click", () => {
    if (!usuarioActualAuth) {
      if (modalAutenticacion) modalAutenticacion.classList.remove("hidden");
      return;
    }
    nuevaFotoPortadaCreateBase64 = null;
    if (formCreateRoom) formCreateRoom.reset();
    if (createRoomPreviewImg) createRoomPreviewImg.src = PORTADA_DEFECTO;
    if (createPasswordContainer) createPasswordContainer.classList.add("hidden");
    if (modalCrearSala) modalCrearSala.classList.remove("hidden");
  });
}

if (createRoomIsPrivate) {
  createRoomIsPrivate.addEventListener("change", (e) => {
    if (e.target.checked) {
      createPasswordContainer.classList.remove("hidden");
    } else {
      createPasswordContainer.classList.add("hidden");
    }
  });
}

function actualizarPortadaCrearModal(base64) {
  nuevaFotoPortadaCreateBase64 = base64;
  if (createRoomPreviewImg) createRoomPreviewImg.src = base64;
}

if (inputCreateRoomGallery) {
  inputCreateRoomGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 600, 350, 0.8, actualizarPortadaCrearModal);
    }
  });
}

if (inputCreateRoomCamera) {
  inputCreateRoomCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 600, 350, 0.8, actualizarPortadaCrearModal);
    }
  });
}

if (formCreateRoom) {
  formCreateRoom.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!usuarioActualAuth) return;

    const titulo = createRoomTitle.value.trim();
    const descripcion = createRoomDesc.value.trim();
    const categoria = createRoomCategory.value;
    const esPrivada = createRoomIsPrivate.checked;
    const clave = esPrivada ? createRoomPass.value.trim() : "";

    if (esPrivada && !clave) return alert("Ingresa una contraseña para la sala privada.");

    const codigoGenerado = "BLX-" + Math.floor(100000 + Math.random() * 900000);

    const nuevaSala = {
      titulo,
      descripcion,
      categoria,
      esPrivada,
      clave: esPrivada ? clave : "",
      codigo: codigoGenerado,
      imagen: nuevaFotoPortadaCreateBase64 || PORTADA_DEFECTO,
      idCreador: usuarioActualAuth.uid,
      nombreCreador: perfilActual.nombreUsuario,
      usuariosRegistrados: [usuarioActualAuth.uid],
      bloqueados: [],
      fechaCreacion: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(baseDatos, "salas"), nuevaSala);
      
      if (esPrivada) {
        salasPrivadasDesbloqueadas.push(docRef.id);
        const userRef = doc(baseDatos, "usuarios", usuarioActualAuth.uid);
        await updateDoc(userRef, {
          salasDesbloqueadas: arrayUnion(docRef.id)
        }).catch(() => {});
      }

      if (modalCrearSala) modalCrearSala.classList.add("hidden");
      alert(`¡Sala creada con éxito! ${esPrivada ? 'Código: ' + codigoGenerado : ''}`);
      unirseASala(docRef.id);
    } catch (error) {
      console.error("Error al crear la sala:", error);
      alert("Ocurrió un fallo al crear la sala.");
    }
  });
}

// ==================================================
// EDICIÓN Y AJUSTES DE SALA
// ==================================================
if (btnOpenRoomSettings) {
  btnOpenRoomSettings.addEventListener("click", () => {
    if (!salaActualData) return;
    nuevaFotoPortadaEditBase64 = null;
    if (editRoomTitle) editRoomTitle.value = salaActualData.titulo || "";
    if (editRoomDesc) editRoomDesc.value = salaActualData.descripcion || "";
    if (editRoomPreviewImg) editRoomPreviewImg.src = salaActualData.imagen || PORTADA_DEFECTO;

    if (salaActualData.esPrivada) {
      if (editPasswordContainer) editPasswordContainer.classList.remove("hidden");
      if (editRoomPass) editRoomPass.value = salaActualData.clave || "";
    } else {
      if (editPasswordContainer) editPasswordContainer.classList.add("hidden");
    }

    if (modalEditRoom) modalEditRoom.classList.remove("hidden");
  });
}

function actualizarPortadaEditarModal(base64) {
  nuevaFotoPortadaEditBase64 = base64;
  if (editRoomPreviewImg) editRoomPreviewImg.src = base64;
}

if (inputEditRoomGallery) {
  inputEditRoomGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 600, 350, 0.8, actualizarPortadaEditarModal);
    }
  });
}

if (inputEditRoomCamera) {
  inputEditRoomCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 600, 350, 0.8, actualizarPortadaEditarModal);
    }
  });
}

if (formEditRoom) {
  formEditRoom.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!idSalaActual || !salaActualData) return;

    const datosGuardar = {
      titulo: editRoomTitle.value.trim(),
      descripcion: editRoomDesc.value.trim(),
      imagen: nuevaFotoPortadaEditBase64 || salaActualData.imagen || PORTADA_DEFECTO
    };

    if (salaActualData.esPrivada && editRoomPass) {
      datosGuardar.clave = editRoomPass.value.trim();
    }

    try {
      await updateDoc(doc(baseDatos, "salas", idSalaActual), datosGuardar);
      if (modalEditRoom) modalEditRoom.classList.add("hidden");
      alert("Configuración de la sala actualizada.");
    } catch (error) {
      console.error("Error al actualizar sala:", error);
      alert("Error al actualizar los ajustes.");
    }
  });
}

function actualizarPermisosInterfazSala() {
  if (!salaActualData || !usuarioActualAuth) return;
  const esCreador = salaActualData.idCreador === usuarioActualAuth.uid;

  if (btnOpenRoomSettings) {
    if (esCreador || esOwnerSupremo) btnOpenRoomSettings.classList.remove("hidden");
    else btnOpenRoomSettings.classList.add("hidden");
  }
}

// ==================================================
// SALA DE CHAT EN VIVO Y MENSAJES CON FOTOS
// ==================================================
async function unirseASala(idSala) {
  const sala = listaSalas.find(s => s.id === idSala);
  if (!sala) return;

  if (sala.esPrivada && usuarioActualAuth && Array.isArray(sala.bloqueados) && sala.bloqueados.includes(usuarioActualAuth.uid)) {
    return alert("Acceso denegado: Fuiste bloqueado de esta sala privada.");
  }

  idSalaActual = idSala;
  salaActualData = sala;

  if (usuarioActualAuth) {
    try {
      await updateDoc(doc(baseDatos, "salas", idSala), {
        usuariosRegistrados: arrayUnion(usuarioActualAuth.uid)
      });
    } catch (e) {}
  }

  if (vistaCatalogo) vistaCatalogo.classList.add("hidden");
  if (vistaChat) vistaChat.classList.remove("hidden");
  if (campoTextoMensaje) campoTextoMensaje.focus();

  if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();
  if (cancelarEscuchaSalaActual) cancelarEscuchaSalaActual();

  cancelarEscuchaSalaActual = onSnapshot(doc(baseDatos, "salas", idSala), (docSnap) => {
    if (!docSnap.exists()) {
      alert("Esta sala ha sido eliminada.");
      if (botonSalirSala) botonSalirSala.click();
      return;
    }

    salaActualData = { id: docSnap.id, ...docSnap.data() };
    if (tituloSalaChat) tituloSalaChat.innerText = salaActualData.titulo;
    if (imagenSalaChat) {
      imagenSalaChat.src = (salaActualData.imagen && salaActualData.imagen.trim().length > 10) ? salaActualData.imagen : PORTADA_DEFECTO;
      imagenSalaChat.onerror = () => { imagenSalaChat.src = PORTADA_DEFECTO; };
    }

    if (salaActualData.esPrivada && usuarioActualAuth && Array.isArray(salaActualData.bloqueados) && salaActualData.bloqueados.includes(usuarioActualAuth.uid)) {
      alert("Has sido bloqueado de esta sala.");
      if (botonSalirSala) botonSalirSala.click();
      return;
    }

    actualizarPermisosInterfazSala();
  });

  const refMensajes = collection(baseDatos, "salas", idSala, "mensajes");
  const consultaMensajes = query(refMensajes, orderBy("fechaCreacion", "asc"));

  cancelarEscuchaMensajes = onSnapshot(consultaMensajes, (instantanea) => {
    if (!areaMensajes) return;
    areaMensajes.innerHTML = "";
    instantanea.forEach((docMensaje) => {
      const datos = docMensaje.data();
      const esMio = (perfilActual && datos.idUsuario === perfilActual.idUsuario);
      
      const burbuja = document.createElement("div");
      burbuja.className = `chat-bubble ${esMio ? 'bubble-user' : 'bubble-other'}`;

      const tienePoderSancion = (esOwnerSupremo || esModGlobal) && !esMio && datos.idUsuario;

      let infoOwnerHTML = "";
      if (esOwnerSupremo && !esMio && datos.idUsuario) {
        infoOwnerHTML = `
          <span class="owner-user-tag" title="UID exclusivo para ti (Owner)">
            ID: ${datos.idUsuario.slice(0, 6)}...
            <button class="btn-owner-action-id" title="Copiar ID completo" onclick="window.copiarUID('${datos.idUsuario}')">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button class="btn-owner-action-id" title="Hacer Moderador Global" onclick="window.promoverAModDirecto('${datos.idUsuario}', '${escaparTextoHTML(datos.nombreUsuario)}')">
              <i class="fa-solid fa-user-shield"></i>
            </button>
          </span>
        `;
      }

      let htmlBotonBan = "";
      if (tienePoderSancion) {
        htmlBotonBan = `
          <button class="btn-ban-message" title="Baneal al usuario" onclick="window.ejecutarSancion('${datos.idUsuario}', '${escaparTextoHTML(datos.nombreUsuario)}')">
            <i class="fa-solid fa-gavel"></i>
          </button>
        `;
      }

      let htmlImagenAdjunta = "";
      if (datos.imagenAdjunta) {
        htmlImagenAdjunta = `
          <div class="message-attachment">
            <img src="${datos.imagenAdjunta}" alt="adjunto" onclick="window.abrirVisorImagen('${datos.imagenAdjunta}')" />
          </div>
        `;
      }

      burbuja.innerHTML = `
        <div class="bubble-header">
          <span class="bubble-author">${escaparTextoHTML(datos.nombreUsuario || 'Usuario')}</span>
          ${infoOwnerHTML}
          ${htmlBotonBan}
        </div>
        ${htmlImagenAdjunta}
        <div class="bubble-text">${escaparTextoHTML(datos.texto || '')}</div>
        <div class="bubble-time">${datos.hora || ''}</div>
      `;

      areaMensajes.appendChild(burbuja);
    });

    areaMensajes.scrollTop = areaMensajes.scrollHeight;
  });
}

// ADJUNTAR IMÁGENES AL CHAT DESDE CÁMARA O GALERÍA
function prepararAdjuntoChat(base64) {
  fotoPendienteDeEnvioBase64 = base64;
  if (chatAttachmentImg) chatAttachmentImg.src = base64;
  if (chatAttachmentBox) chatAttachmentBox.classList.remove("hidden");
}

if (inputChatGallery) {
  inputChatGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 800, 800, 0.75, prepararAdjuntoChat);
    }
  });
}

if (inputChatCamera) {
  inputChatCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 800, 800, 0.75, prepararAdjuntoChat);
    }
  });
}

if (btnRemoveChatAttachment) {
  btnRemoveChatAttachment.addEventListener("click", () => {
    fotoPendienteDeEnvioBase64 = null;
    if (chatAttachmentBox) chatAttachmentBox.classList.add("hidden");
  });
}

// ENVIAR MENSAJE
async function enviarMensaje() {
  if (!idSalaActual || !usuarioActualAuth || !perfilActual) {
    if (!usuarioActualAuth && modalAutenticacion) {
      modalAutenticacion.classList.remove("hidden");
    }
    return;
  }

  const texto = campoTextoMensaje ? campoTextoMensaje.value.trim() : "";
  if (!texto && !fotoPendienteDeEnvioBase64) return;

  const ahora = new Date();
  const horaFormateada = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const nuevoMensaje = {
    idUsuario: perfilActual.idUsuario,
    nombreUsuario: perfilActual.nombreUsuario,
    texto: texto,
    imagenAdjunta: fotoPendienteDeEnvioBase64 || null,
    hora: horaFormateada,
    fechaCreacion: serverTimestamp()
  };

  if (campoTextoMensaje) campoTextoMensaje.value = "";
  fotoPendienteDeEnvioBase64 = null;
  if (chatAttachmentBox) chatAttachmentBox.classList.add("hidden");

  try {
    const refMensajes = collection(baseDatos, "salas", idSalaActual, "mensajes");
    await addDoc(refMensajes, nuevoMensaje);
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    alert("No se pudo enviar el mensaje.");
  }
}

if (botonEnviarMensaje) {
  botonEnviarMensaje.addEventListener("click", enviarMensaje);
}

if (campoTextoMensaje) {
  campoTextoMensaje.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarMensaje();
    }
  });
}

if (botonSalirSala) {
  botonSalirSala.addEventListener("click", () => {
    if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();
    if (cancelarEscuchaSalaActual) cancelarEscuchaSalaActual();

    idSalaActual = null;
    salaActualData = null;

    if (vistaChat) vistaChat.classList.add("hidden");
    if (vistaCatalogo) vistaCatalogo.classList.remove("hidden");
  });
}

// ==================================================
// VISOR DE IMÁGENES A PANTALLA COMPLETA
// ==================================================
window.abrirVisorImagen = function(url) {
  if (fullViewImage) fullViewImage.src = url;
  if (modalImageViewer) modalImageViewer.classList.remove("hidden");
};

if (modalImageViewer) {
  modalImageViewer.addEventListener("click", () => {
    modalImageViewer.classList.add("hidden");
  });
}

// ==================================================
// CIERRE UNIVERSAL DE MODALES CON BOTÓN X O OVERLAY
// ==================================================
document.querySelectorAll(".modal-overlay").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
});

document.querySelectorAll(".btn-close-modal").forEach(btn => {
  btn.addEventListener("click", () => {
    const modal = btn.closest(".modal-overlay");
    if (modal) modal.classList.add("hidden");
  });
});
