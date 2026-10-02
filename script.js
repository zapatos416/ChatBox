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

// Portada por defecto 100% segura (SVG en Data URI, nunca falla ni depende de internet)
const PORTADA_DEFECTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='350' viewBox='0 0 600 350'><rect width='600' height='350' fill='%23181a20'/><circle cx='300' cy='150' r='60' fill='%2300b06f'/><text x='300' y='165' font-family='sans-serif' font-weight='900' font-size='42' fill='%23ffffff' text-anchor='middle'>BLOX</text><text x='300' y='250' font-family='sans-serif' font-weight='700' font-size='20' fill='%239ca3af' text-anchor='middle'>SALA DE CHAT</text></svg>";

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
      } else {
        perfilActual = {
          idUsuario: usuario.uid,
          nombreUsuario: nombreSugerido,
          fotoURL: usuario.photoURL || null,
          correo: usuario.email || null,
          ultimaIP: miIPActual || null,
          fechaUltimoCambioNombre: Date.now()
        };
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
        ultimaIP: miIPActual || null
      };
      actualizarInterfazUsuario(perfilActual);
    }
  } else {
    esOwnerSupremo = false;
    esModGlobal = false;
    perfilActual = null;
    if (btnOpenOwnerPanel) btnOpenOwnerPanel.classList.add("hidden");
    if (tarjetaPerfilUsuario) tarjetaPerfilUsuario.classList.add("hidden");
    if (botonAbrirAuth) botonAbrirAuth.classList.remove("hidden");
  }
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
// PERFIL (FOTO CÁMARA/GALERÍA + 60 DÍAS)
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
// CATÁLOGO DE SALAS (CON PROTECCIÓN CONTRA IMÁGENES ROTAS)
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
    if (sala.esPrivada) return false;
    const coincideCat = (filtroCategoriaActual === "all" || sala.categoria === filtroCategoriaActual);
    const coincideTxt = (sala.titulo || "").toLowerCase().includes(busqueda) || 
                        (sala.descripcion || "").toLowerCase().includes(busqueda);
    return coincideCat && coincideTxt;
  });

  if (salasVisibles.length === 0) {
    contenedorSalas.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); text-align: center; padding: 40px;">No hay salas públicas disponibles. ¡Sé el primero en crear una!</p>`;
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
          <i class="fa-solid fa-users"></i> ${registrados} registrados
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
  if (modalCode) modalCode.innerText = sala.id;
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
              <i class="fa-solid fa-shield"></i> +Mod
            </button>
          </span>
        `;
      }

      // 1. Imagen arriba si existe
      let imgHTML = "";
      if (datos.imagenURL) {
        imgHTML = `<img src="${datos.imagenURL}" class="chat-msg-img" alt="Foto adjunta" onclick="window.abrirVisorImagen('${datos.imagenURL}')" />`;
      }

      // 2. Pie de foto / texto debajo de la imagen
      let textoHTML = "";
      if (datos.texto) {
        textoHTML = `<div class="chat-caption-text">${escaparTextoHTML(datos.texto)}</div>`;
      }

      burbuja.innerHTML = `
        ${!esMio ? `
          <div class="bubble-author" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
            <div style="display:flex; align-items:center;">
              <span>${escaparTextoHTML(datos.nombreUsuario || "Anónimo")}</span>
              ${infoOwnerHTML}
            </div>
            ${tienePoderSancion ? `
              <button class="btn-ban" title="Banear IP y purgar mensajes" onclick="window.ejecutarSancion('${datos.idUsuario}', '${escaparTextoHTML(datos.nombreUsuario)}')">
                <i class="fa-solid fa-gavel"></i> ${esOwnerSupremo ? "BAN IP & PURGA" : "EXPULSAR"}
              </button>
            ` : ""}
          </div>
        ` : ""}
        ${imgHTML}
        ${textoHTML}
        <div class="bubble-time">${datos.hora || ""}</div>
      `;
      areaMensajes.appendChild(burbuja);
    });
    areaMensajes.scrollTop = areaMensajes.scrollHeight;
  });
}

// Abrir imagen en pantalla completa
window.abrirVisorImagen = function(url) {
  if (fullViewImage && modalImageViewer) {
    fullViewImage.src = url;
    modalImageViewer.classList.remove("hidden");
  }
};

// ==================================================
// BANDEJA ADJUNTA ESTILO GEMINI / WHATSAPP
// ==================================================
function fijarImagenEnBandeja(archivo) {
  if (!archivo) return;
  procesarImagenCanvas(archivo, 800, 800, 0.75, (base64) => {
    fotoPendienteDeEnvioBase64 = base64;
    if (chatAttachmentImg) chatAttachmentImg.src = base64;
    if (chatAttachmentBox) chatAttachmentBox.classList.remove("hidden");
    if (campoTextoMensaje) campoTextoMensaje.focus();
  });
}

if (inputChatCamera) {
  inputChatCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      fijarImagenEnBandeja(e.target.files[0]);
      e.target.value = "";
    }
  });
}

if (inputChatGallery) {
  inputChatGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      fijarImagenEnBandeja(e.target.files[0]);
      e.target.value = "";
    }
  });
}

if (btnRemoveChatAttachment) {
  btnRemoveChatAttachment.addEventListener("click", () => {
    fotoPendienteDeEnvioBase64 = null;
    if (chatAttachmentImg) chatAttachmentImg.src = "";
    if (chatAttachmentBox) chatAttachmentBox.classList.add("hidden");
  });
}

// Enviar Mensaje (Foto arriba + Texto pie de foto)
async function enviarMensaje() {
  if (!perfilActual) {
    if (modalAutenticacion) modalAutenticacion.classList.remove("hidden");
    return;
  }

  if (uidsBaneados.has(perfilActual.idUsuario) || (miIPActual && ipsBaneadas.has(miIPActual))) {
    mostrarPantallaBaneo();
    return;
  }

  const texto = campoTextoMensaje ? campoTextoMensaje.value.trim() : "";
  const imagen = fotoPendienteDeEnvioBase64;

  if (!texto && !imagen) return;
  if (!idSalaActual) return;

  const ahora = new Date();
  const formatoHora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  if (campoTextoMensaje) campoTextoMensaje.value = "";
  fotoPendienteDeEnvioBase64 = null;
  if (chatAttachmentImg) chatAttachmentImg.src = "";
  if (chatAttachmentBox) chatAttachmentBox.classList.add("hidden");

  try {
    const paqueteMensaje = {
      idUsuario: perfilActual.idUsuario,
      nombreUsuario: perfilActual.nombreUsuario,
      hora: formatoHora,
      fechaCreacion: serverTimestamp()
    };

    if (texto) paqueteMensaje.texto = texto;
    if (imagen) paqueteMensaje.imagenURL = imagen;

    await addDoc(collection(baseDatos, "salas", idSalaActual, "mensajes"), paqueteMensaje);
  } catch (error) {
    console.error("Error al registrar mensaje:", error);
    alert("Hubo un fallo al subir el mensaje o la imagen.");
  }
}

if (botonSalirSala) {
  botonSalirSala.addEventListener("click", () => {
    if (cancelarEscuchaMensajes) cancelarEscuchaMensajes();
    if (cancelarEscuchaSalaActual) cancelarEscuchaSalaActual();
    cancelarEscuchaMensajes = null;
    cancelarEscuchaSalaActual = null;
    idSalaActual = null;
    salaActualData = null;
    if (vistaChat) vistaChat.classList.add("hidden");
    if (vistaCatalogo) vistaCatalogo.classList.remove("hidden");
    dibujarCatalogoSalas();
  });
}

if (botonEnviarMensaje) botonEnviarMensaje.addEventListener("click", enviarMensaje);
if (campoTextoMensaje) {
  campoTextoMensaje.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviarMensaje();
  });
}

function actualizarPermisosInterfazSala() {
  if (!salaActualData || !usuarioActualAuth) {
    if (btnOpenRoomSettings) btnOpenRoomSettings.classList.add("hidden");
    return;
  }

  const soyHost = (salaActualData.idCreador === usuarioActualAuth.uid);
  const soyAdminSala = Array.isArray(salaActualData.admins) && salaActualData.admins.includes(usuarioActualAuth.uid);

  if (btnOpenRoomSettings) {
    if (soyHost || soyAdminSala || esOwnerSupremo) {
      btnOpenRoomSettings.classList.remove("hidden");
    } else {
      btnOpenRoomSettings.classList.add("hidden");
    }
  }

  dibujarListaParticipantes();
}

function dibujarListaParticipantes() {
  if (!listaParticipantes || !salaActualData) return;
  listaParticipantes.innerHTML = "";

  const miUid = usuarioActualAuth ? usuarioActualAuth.uid : null;

  const itemHost = document.createElement("div");
  itemHost.className = "participant-item";

  let infoHostOwnerHTML = "";
  if (esOwnerSupremo && salaActualData.idCreador !== miUid) {
    infoHostOwnerHTML = `
      <span class="owner-user-tag">
        ${salaActualData.idCreador.slice(0, 6)}...
        <button class="btn-owner-action-id" title="Copiar ID" onclick="window.copiarUID('${salaActualData.idCreador}')">
          <i class="fa-solid fa-copy"></i>
        </button>
        <button class="btn-owner-action-id" title="Hacer Moderador Global" onclick="window.promoverAModDirecto('${salaActualData.idCreador}', '${escaparTextoHTML(salaActualData.nombreCreador)}')">
          <i class="fa-solid fa-shield"></i> +Mod
        </button>
      </span>
    `;
  }

  itemHost.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <div class="avatar" style="background:#ffb703; color:#000;">${salaActualData.nombreCreador ? salaActualData.nombreCreador.charAt(0).toUpperCase() : "H"}</div>
      <span>${escaparTextoHTML(salaActualData.nombreCreador || "Creador")} <span class="badge-host"><i class="fa-solid fa-crown"></i> HOST</span></span>
    </div>
    ${infoHostOwnerHTML}
  `;
  listaParticipantes.appendChild(itemHost);

  if (miUid && miUid !== salaActualData.idCreador && perfilActual) {
    const itemYo = document.createElement("div");
    itemYo.className = "participant-item";
    const esAdminYo = Array.isArray(salaActualData.admins) && salaActualData.admins.includes(miUid);
    itemYo.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="avatar" style="background:#00b06f;">${perfilActual.nombreUsuario.charAt(0).toUpperCase()}</div>
        <span>${escaparTextoHTML(perfilActual.nombreUsuario)} (Tú) ${esAdminYo ? `<span class="badge-room-admin">ADMIN SALA</span>` : ""}</span>
      </div>
    `;
    listaParticipantes.appendChild(itemYo);
  }
}

// ==================================================
// EDICIÓN DE SALA (PORTADA POR CÁMARA O GALERÍA)
// ==================================================
if (inputEditRoomGallery) {
  inputEditRoomGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 700, 400, 0.8, (base64) => {
        nuevaFotoPortadaEditBase64 = base64;
        if (editRoomPreviewImg) editRoomPreviewImg.src = base64;
      });
    }
  });
}

if (inputEditRoomCamera) {
  inputEditRoomCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 700, 400, 0.8, (base64) => {
        nuevaFotoPortadaEditBase64 = base64;
        if (editRoomPreviewImg) editRoomPreviewImg.src = base64;
      });
    }
  });
}

if (btnOpenRoomSettings) {
  btnOpenRoomSettings.addEventListener("click", () => {
    if (!salaActualData) return;
    nuevaFotoPortadaEditBase64 = null;
    if (editRoomTitle) editRoomTitle.value = salaActualData.titulo || "";
    if (editRoomDesc) editRoomDesc.value = salaActualData.descripcion || "";
    if (editRoomPreviewImg) {
      editRoomPreviewImg.src = (salaActualData.imagen && salaActualData.imagen.trim().length > 10) ? salaActualData.imagen : PORTADA_DEFECTO;
    }

    if (editPasswordContainer && editRoomPass) {
      if (salaActualData.esPrivada) {
        editPasswordContainer.classList.remove("hidden");
        editRoomPass.value = salaActualData.clave || "";
      } else {
        editPasswordContainer.classList.add("hidden");
      }
    }

    if (modalEditRoom) modalEditRoom.classList.remove("hidden");
  });
}

if (formEditRoom) {
  formEditRoom.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!salaActualData || !idSalaActual) return;

    const datosActualizados = {
      titulo: editRoomTitle ? editRoomTitle.value.trim() : salaActualData.titulo,
      descripcion: editRoomDesc ? editRoomDesc.value.trim() : salaActualData.descripcion,
      imagen: nuevaFotoPortadaEditBase64 || salaActualData.imagen || PORTADA_DEFECTO
    };

    if (salaActualData.esPrivada && editRoomPass && editRoomPass.value.trim()) {
      datosActualizados.clave = editRoomPass.value.trim();
    }

    try {
      await updateDoc(doc(baseDatos, "salas", idSalaActual), datosActualizados);
      if (modalEditRoom) modalEditRoom.classList.add("hidden");
      alert("Ajustes de sala guardados.");
    } catch (error) {
      console.error("Error al editar sala:", error);
      alert("No se pudieron guardar los cambios.");
    }
  });
}

// ==================================================
// CREACIÓN DE SALAS (PORTADA POR CÁMARA O GALERÍA)
// ==================================================
if (inputCreateRoomGallery) {
  inputCreateRoomGallery.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 700, 400, 0.8, (base64) => {
        nuevaFotoPortadaCreateBase64 = base64;
        if (createRoomPreviewImg) createRoomPreviewImg.src = base64;
      });
    }
  });
}

if (inputCreateRoomCamera) {
  inputCreateRoomCamera.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      procesarImagenCanvas(e.target.files[0], 700, 400, 0.8, (base64) => {
        nuevaFotoPortadaCreateBase64 = base64;
        if (createRoomPreviewImg) createRoomPreviewImg.src = base64;
      });
    }
  });
}

const btnOpenCreate = document.getElementById("btnOpenCreate");
const formCreateRoom = document.getElementById("formCreateRoom");
const createIsPrivate = document.getElementById("createIsPrivate");

if (btnOpenCreate) {
  btnOpenCreate.addEventListener("click", () => {
    if (!perfilActual) {
      if (modalAutenticacion) modalAutenticacion.classList.remove("hidden");
      return;
    }
    nuevaFotoPortadaCreateBase64 = null;
    if (formCreateRoom) formCreateRoom.reset();
    if (createRoomPreviewImg) createRoomPreviewImg.src = PORTADA_DEFECTO;
    const passwordGroup = document.getElementById("passwordGroup");
    if (passwordGroup) passwordGroup.classList.add("hidden");
    if (modalCrearSala) modalCrearSala.classList.remove("hidden");
  });
}

if (createIsPrivate) {
  createIsPrivate.addEventListener("change", (evento) => {
    const grupoClave = document.getElementById("passwordGroup");
    const campoClave = document.getElementById("createPassword");
    if (evento.target.checked) {
      if (grupoClave) grupoClave.classList.remove("hidden");
      if (campoClave) campoClave.setAttribute("required", "true");
    } else {
      if (grupoClave) grupoClave.classList.add("hidden");
      if (campoClave) campoClave.removeAttribute("required");
    }
  });
}

if (formCreateRoom) {
  formCreateRoom.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const esPrivada = createIsPrivate ? createIsPrivate.checked : false;
    const titulo = document.getElementById("createTitle").value.trim();
    const descripcion = document.getElementById("createDesc").value.trim();
    const categoria = document.getElementById("createCategory").value;
    const clave = document.getElementById("createPassword") ? document.getElementById("createPassword").value.trim() : null;

    const idGenerado = (esPrivada ? "VIP-" : "SALA-") + Math.floor(1000 + Math.random() * 9000);

    const datosSala = {
      titulo: titulo,
      descripcion: descripcion,
      categoria: categoria,
      esPrivada: esPrivada,
      clave: esPrivada ? clave : null,
      idCreador: perfilActual.idUsuario,
      nombreCreador: perfilActual.nombreUsuario,
      admins: [],
      bloqueados: [],
      usuariosRegistrados: [perfilActual.idUsuario],
      imagen: nuevaFotoPortadaCreateBase64 || PORTADA_DEFECTO,
      fechaCreacion: serverTimestamp()
    };

    try {
      await setDoc(doc(baseDatos, "salas", idGenerado), datosSala);

      await addDoc(collection(baseDatos, "salas", idGenerado, "mensajes"), {
        nombreUsuario: "Sistema",
        texto: `Sala fundada por ${perfilActual.nombreUsuario}. ¡Bienvenidos!`,
        hora: "Ahora",
        fechaCreacion: serverTimestamp()
      });

      if (modalCrearSala) modalCrearSala.classList.add("hidden");

      if (esPrivada) {
        alert(`¡Sala Privada Creada!\n\nID: ${idGenerado}\nContraseña: ${clave}`);
      }
    } catch (error) {
      console.error("Error al crear sala:", error);
      alert("Hubo un error al registrar la sala.");
    }
  });
}

// ==================================================
// EVENTOS MODALES Y FILTROS
// ==================================================
const btnOpenPrivateJoin = document.getElementById("btnOpenPrivateJoin");
const formPrivateJoin = document.getElementById("formPrivateJoin");

if (btnOpenPrivateJoin) {
  btnOpenPrivateJoin.addEventListener("click", () => {
    const errorMsg = document.getElementById("privateErrorMsg");
    if (errorMsg) errorMsg.classList.add("hidden");
    if (formPrivateJoin) formPrivateJoin.reset();
    if (modalUnirsePrivada) modalUnirsePrivada.classList.remove("hidden");
  });
}

if (formPrivateJoin) {
  formPrivateJoin.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const codigo = document.getElementById("privateCodeInput").value.trim();
    const clave = document.getElementById("privatePassInput").value.trim();
    const mensajeError = document.getElementById("privateErrorMsg");

    const salaEncontrada = listaSalas.find(s => s.id.toLowerCase() === codigo.toLowerCase() && s.esPrivada);

    if (!salaEncontrada || salaEncontrada.clave !== clave) {
      if (mensajeError) {
        mensajeError.innerText = "Código o contraseña incorrectos.";
        mensajeError.classList.remove("hidden");
      }
      return;
    }

    if (usuarioActualAuth && Array.isArray(salaEncontrada.bloqueados) && salaEncontrada.bloqueados.includes(usuarioActualAuth.uid)) {
      if (mensajeError) {
        mensajeError.innerText = "Has sido bloqueado de esta sala privada.";
        mensajeError.classList.remove("hidden");
      }
      return;
    }

    if (modalUnirsePrivada) modalUnirsePrivada.classList.add("hidden");
    unirseASala(salaEncontrada.id);
  });
}

botonesFiltro.forEach(boton => {
  boton.addEventListener("click", () => {
    botonesFiltro.forEach(b => b.classList.remove("active"));
    boton.classList.add("active");
    filtroCategoriaActual = boton.dataset.category;
    dibujarCatalogoSalas();
  });
});

if (barraBusqueda) barraBusqueda.addEventListener("input", dibujarCatalogoSalas);

document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", () => {
    const idModal = btn.dataset.close;
    const modal = document.getElementById(idModal);
    if (modal) modal.classList.add("hidden");
  });
});

window.addEventListener("click", (evento) => {
  if (evento.target.classList.contains("modal-overlay")) {
    evento.target.classList.add("hidden");
  }
});

function escaparTextoHTML(cadena) {
  if (!cadena) return "";
  return String(cadena).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
