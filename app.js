const STORAGE_KEY = 'ruta_escolar_app_v1';
const rutasBase = ['Bachillerato 1', 'Bachillerato 2', 'Primaria', 'Transición', 'Especial'];

const state = {
  estudiantes: [],
  barrios: [],
  rutaActiva: 'Bachillerato 1',
  subrutaActiva: 'Todas',
  currentIndex: 0,
  modoOrden: 'recogida',
  gpsWatchId: null,
  ubicacionActual: null,
  barrioActualNotificado: null,
  markers: [],
  map: null,
  busMarker: null,
  config: {
    canal: 'demo',
    radioAviso: 250,
    backendUrl: '',
    apiKey: ''
  }
};

const $ = (id) => document.getElementById(id);

async function init() {
  await cargarDatos();
  montarMapa();
  bindUI();
  pintarRutas();
  cargarConfigUI();
  renderTodo();
}

async function cargarDatos() {
  const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  const [estRes, barRes] = await Promise.all([
    fetch('data/estudiantes.json').then(r => r.json()),
    fetch('data/barrios.json').then(r => r.json())
  ]);
  state.estudiantes = persisted?.estudiantes?.length ? persisted.estudiantes : estRes;
  state.barrios = Array.isArray(barRes) ? barRes : [];
  if (persisted?.config) state.config = { ...state.config, ...persisted.config };
}

function persistir() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ estudiantes: state.estudiantes, config: state.config }));
}

function bindUI() {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => cambiarTab(btn.dataset.tab)));
  $('btnIniciar').onclick = iniciarRuta;
  $('btnGps').onclick = activarGPS;
  $('btnSubio').onclick = marcarSubio;
  $('btnVistaPrevia').onclick = actualizarVistaPrevia;
  $('btnRutaMasivo').onclick = enviarMasivoRuta;
  $('btnBarrioMasivo').onclick = enviarMasivoBarrioActual;
  $('btnEnviarActual').onclick = enviarActual;
  $('btnLlegadaColegio').onclick = enviarLlegadaColegio;
  $('btnPreguntarIA').onclick = responderIA;
  $('btnSugerirIA').onclick = sugerirIA;
  $('btnGuardarBackend').onclick = guardarBackend;
  $('btnProbarBackend').onclick = probarBackend;
  $('btnGuardarTodo').onclick = () => { persistir(); bitacora('Cambios guardados.'); };
  $('rutaActiva').onchange = (e) => { state.rutaActiva = e.target.value; state.currentIndex = 0; renderTodo(); };
  $('subrutaActiva').onchange = (e) => { state.subrutaActiva = e.target.value; state.currentIndex = 0; renderTodo(); };
  $('tipoMensaje').onchange = actualizarVistaPrevia;
  $('tonoMensaje').onchange = actualizarVistaPrevia;
  $('notaMensaje').oninput = actualizarVistaPrevia;
  $('btnNuevo').onclick = limpiarFormulario;
  $('btnEliminar').onclick = eliminarEstudiante;
  $('btnVerDejada').onclick = toggleModoOrden;
  $('formEstudiante').addEventListener('submit', guardarEstudiante);
  $('canalEnvio').onchange = (e) => state.config.canal = e.target.value;
  $('radioAviso').onchange = (e) => state.config.radioAviso = Number(e.target.value || 250);
}

function cambiarTab(tab) {
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
}

function pintarRutas() {
  const selects = [$('rutaActiva'), $('estRuta')];
  selects.forEach(sel => {
    sel.innerHTML = '';
    rutasBase.forEach(r => {
      const o = document.createElement('option');
      o.value = r; o.textContent = r;
      sel.appendChild(o);
    });
  });
  $('rutaActiva').value = state.rutaActiva;
  const dl = $('barriosList');
  dl.innerHTML = '';
  state.barrios.forEach(b => {
    const o = document.createElement('option'); o.value = b; dl.appendChild(o);
  });
}

function cargarConfigUI() {
  $('canalEnvio').value = state.config.canal;
  $('radioAviso').value = state.config.radioAviso;
  $('backendUrl').value = state.config.backendUrl;
  $('apiKey').value = state.config.apiKey;
}

function getRutaActivaList() {
  return state.estudiantes
    .filter(e => e.ruta === state.rutaActiva)
    .filter(e => state.subrutaActiva === 'Todas' ? true : e.subruta === state.subrutaActiva)
    .sort((a, b) => state.modoOrden === 'recogida' ? a.ordenRecogida - b.ordenRecogida : a.ordenDejada - b.ordenDejada);
}

function getActual() {
  const list = getRutaActivaList();
  return list[state.currentIndex] || null;
}

function renderTodo() {
  renderResumen();
  renderOrden();
  renderListaEstudiantes();
  renderMapa();
  actualizarVistaPrevia();
}

function renderResumen() {
  const list = getRutaActivaList();
  const actual = getActual();
  $('actualNombre').textContent = actual ? actual.nombre : 'Sin pendiente';
  $('actualBarrio').textContent = actual ? actual.barrio : '-';
  $('pendientes').textContent = Math.max(list.length - state.currentIndex, 0);
}

function renderOrden() {
  const list = getRutaActivaList();
  $('listaOrden').innerHTML = list.map((e, idx) => `
    <div class="item ${idx === state.currentIndex ? 'current' : ''}">
      <h3>${state.modoOrden === 'recogida' ? e.ordenRecogida : e.ordenDejada}. ${e.nombre}</h3>
      <p>${e.acudiente} · ${e.telefono}</p>
      <div class="badges">
        <span class="badge">${e.barrio}</span>
        <span class="badge">${e.ruta}</span>
        <span class="badge">${e.subruta}</span>
      </div>
    </div>`).join('') || '<div class="item"><p>No hay estudiantes en esta ruta.</p></div>';
}

function renderListaEstudiantes() {
  $('listaEstudiantes').innerHTML = state.estudiantes
    .sort((a, b) => a.ruta.localeCompare(b.ruta) || a.ordenRecogida - b.ordenRecogida)
    .map(e => `
      <div class="item" onclick="editarEstudiante(${e.id})">
        <h3>${e.nombre}</h3>
        <p>${e.ruta} · ${e.subruta} · ${e.barrio}</p>
        <div class="badges">
          <span class="badge">Recogida ${e.ordenRecogida}</span>
          <span class="badge">Dejada ${e.ordenDejada}</span>
        </div>
      </div>`).join('');
}

function actualizarVistaPrevia() {
  const actual = getActual();
  const tipo = $('tipoMensaje').value;
  const tono = $('tonoMensaje').value;
  const nota = $('notaMensaje').value.trim();
  const list = getRutaActivaList();
  const data = actual ? {
    estudiante: actual.nombre,
    acudiente: actual.acudiente,
    ruta: actual.ruta,
    subtitulo: actual.subruta,
    barrio: actual.barrio,
    minutos: 3,
    lista: list,
    nota
  } : { ruta: state.rutaActiva, subtitulo: state.subrutaActiva, lista: list, nota };
  $('previewMensaje').textContent = generarMensajeIA(tipo, tono, data);
}

function iniciarRuta() {
  state.currentIndex = 0;
  renderTodo();
  bitacora(`Ruta iniciada: ${state.rutaActiva} / ${state.subrutaActiva}`);
}

function marcarSubio() {
  const actual = getActual();
  if (!actual) return bitacora('No hay estudiante actual.');
  bitacora(`${actual.nombre} marcado como recogido.`);
  state.currentIndex += 1;
  renderTodo();
}

function toggleModoOrden() {
  state.modoOrden = state.modoOrden === 'recogida' ? 'dejada' : 'recogida';
  $('btnVerDejada').textContent = state.modoOrden === 'recogida' ? 'Ver dejada' : 'Ver recogida';
  renderOrden();
}

function respuestaBase(tipo, estudiante) {
  return {
    estudiante: estudiante?.nombre || '',
    acudiente: estudiante?.acudiente || '',
    ruta: estudiante?.ruta || state.rutaActiva,
    subtitulo: estudiante?.subruta || state.subrutaActiva,
    barrio: estudiante?.barrio || '',
    minutos: 3,
    nota: $('notaMensaje').value.trim(),
    lista: getRutaActivaList()
  };
}

async function enviarActual() {
  const actual = getActual();
  if (!actual) return bitacora('No hay estudiante actual.');
  const mensaje = generarMensajeIA($('tipoMensaje').value, $('tonoMensaje').value, respuestaBase($('tipoMensaje').value, actual));
  await enviarPorCanal([{ telefono: actual.telefono, mensaje, nombre: actual.nombre }]);
}

async function enviarMasivoRuta() {
  const list = getRutaActivaList();
  if (!list.length) return bitacora('No hay estudiantes en la ruta.');
  const tipo = $('tipoMensaje').value;
  const tono = $('tonoMensaje').value;
  const mensajeBase = generarMensajeIA(tipo, tono, { ...respuestaBase(tipo), lista: list });
  const payload = list.map(e => ({ telefono: e.telefono, mensaje: mensajeBase, nombre: e.nombre }));
  await enviarPorCanal(payload);
}

async function enviarLlegadaColegio() {
  $('tipoMensaje').value = 'llegada_colegio';
  actualizarVistaPrevia();
  await enviarMasivoRuta();
}

async function enviarMasivoBarrioActual() {
  const actual = getActual();
  if (!actual?.barrio) return bitacora('No hay barrio actual.');
  const list = getRutaActivaList().filter(e => e.barrio === actual.barrio);
  if (!list.length) return bitacora('No hay estudiantes en el barrio actual.');
  const tono = $('tonoMensaje').value;
  const payload = list.map(e => ({
    telefono: e.telefono,
    nombre: e.nombre,
    mensaje: generarMensajeIA('ingreso_barrio', tono, respuestaBase('ingreso_barrio', e))
  }));
  await enviarPorCanal(payload);
}

async function enviarPorCanal(items) {
  if (!items.length) return;
  const canal = state.config.canal;
  if (canal === 'demo') {
    items.forEach(i => bitacora(`[DEMO] ${i.nombre}: ${i.mensaje}`));
    return;
  }
  if (canal === 'abrir_whatsapp') {
    const primero = items[0];
    abrirWhatsApp(primero.telefono, primero.mensaje);
    bitacora(`WhatsApp abierto para ${primero.nombre}.`);
    if (items.length > 1) bitacora('En modo abrir WhatsApp, los mensajes masivos se abren uno por uno.');
    return;
  }
  if (canal === 'whatsapp_business') {
    for (const item of items) {
      try {
        const res = await fetch(`${state.config.backendUrl.replace(/\/$/, '')}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': state.config.apiKey
          },
          body: JSON.stringify({ telefono: item.telefono, mensaje: item.mensaje })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          bitacora(`Error con ${item.nombre}: ${data.error || res.status}`);
        } else {
          bitacora(`Enviado a ${item.nombre}.`);
        }
      } catch (err) {
        bitacora(`Fallo al enviar a ${item.nombre}: ${err.message}`);
      }
    }
  }
}

function abrirWhatsApp(telefono, mensaje) {
  const clean = String(telefono).replace(/\D/g, '');
  const urlMobile = `whatsapp://send?phone=${clean}&text=${encodeURIComponent(mensaje)}`;
  const urlWeb = `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  window.open(isMobile ? urlMobile : urlWeb, '_blank');
}

function responderIA() {
  $('respuestaIA').textContent = preguntarIALocal({
    pregunta: $('preguntaIA').value,
    actual: getActual(),
    pendientes: Math.max(getRutaActivaList().length - state.currentIndex, 0),
    ruta: state.rutaActiva
  });
}

function sugerirIA() {
  const actual = getActual();
  $('respuestaIA').textContent = actual
    ? generarMensajeIA($('tipoMensaje').value, $('tonoMensaje').value, respuestaBase($('tipoMensaje').value, actual))
    : 'No hay estudiante actual.';
}

function bitacora(texto) {
  const el = $('bitacora');
  const row = document.createElement('div');
  row.className = 'queue-row';
  row.textContent = `${new Date().toLocaleTimeString()} · ${texto}`;
  el.prepend(row);
}

function guardarBackend() {
  state.config.backendUrl = $('backendUrl').value.trim();
  state.config.apiKey = $('apiKey').value.trim();
  state.config.canal = $('canalEnvio').value;
  state.config.radioAviso = Number($('radioAviso').value || 250);
  persistir();
  bitacora('Configuración de backend guardada.');
}

async function probarBackend() {
  try {
    const res = await fetch(`${$('backendUrl').value.trim().replace(/\/$/, '')}/health`, { headers: { 'x-api-key': $('apiKey').value.trim() }});
    const data = await res.json();
    $('backendEstado').textContent = data.ok ? 'Conectado' : 'Sin conexión';
    bitacora(data.ok ? 'Backend conectado.' : 'Backend sin conexión.');
  } catch (err) {
    $('backendEstado').textContent = 'Sin conexión';
    bitacora(`Error backend: ${err.message}`);
  }
}

function limpiarFormulario() {
  $('formEstudiante').reset();
  $('estId').value = '';
}

function guardarEstudiante(ev) {
  ev.preventDefault();
  const est = {
    id: $('estId').value ? Number($('estId').value) : Date.now(),
    nombre: $('estNombre').value.trim(),
    acudiente: $('estAcudiente').value.trim(),
    telefono: $('estTelefono').value.trim(),
    barrio: $('estBarrio').value.trim(),
    ruta: $('estRuta').value,
    subruta: $('estSubruta').value,
    ordenRecogida: Number($('estOrdenRecogida').value),
    ordenDejada: Number($('estOrdenDejada').value),
    lat: Number($('estLat').value || 0),
    lng: Number($('estLng').value || 0),
    nota: $('estNota').value.trim()
  };
  const idx = state.estudiantes.findIndex(e => e.id === est.id);
  if (idx >= 0) state.estudiantes[idx] = est; else state.estudiantes.push(est);
  persistir();
  limpiarFormulario();
  renderTodo();
  bitacora(`Estudiante guardado: ${est.nombre}`);
}

window.editarEstudiante = function (id) {
  const e = state.estudiantes.find(x => x.id === id);
  if (!e) return;
  $('estId').value = e.id;
  $('estNombre').value = e.nombre;
  $('estAcudiente').value = e.acudiente;
  $('estTelefono').value = e.telefono;
  $('estBarrio').value = e.barrio;
  $('estRuta').value = e.ruta;
  $('estSubruta').value = e.subruta;
  $('estOrdenRecogida').value = e.ordenRecogida;
  $('estOrdenDejada').value = e.ordenDejada;
  $('estLat').value = e.lat || '';
  $('estLng').value = e.lng || '';
  $('estNota').value = e.nota || '';
  cambiarTab('estudiantes');
};

function eliminarEstudiante() {
  const id = Number($('estId').value);
  if (!id) return bitacora('Selecciona un estudiante para eliminar.');
  state.estudiantes = state.estudiantes.filter(e => e.id !== id);
  persistir();
  limpiarFormulario();
  renderTodo();
  bitacora('Estudiante eliminado.');
}

function montarMapa() {
  state.map = L.map('mapa').setView([4.5639, -75.7517], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(state.map);
}

function renderMapa() {
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];
  getRutaActivaList().forEach((e, idx) => {
    if (e.lat && e.lng) {
      const marker = L.marker([e.lat, e.lng]).addTo(state.map).bindPopup(`${idx + 1}. ${e.nombre}<br>${e.barrio}`);
      state.markers.push(marker);
    }
  });
}

function activarGPS() {
  if (!navigator.geolocation) return bitacora('Este celular no permite geolocalización.');
  if (state.gpsWatchId) return bitacora('GPS ya está activo.');
  state.gpsWatchId = navigator.geolocation.watchPosition(onGpsOk, onGpsError, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
  $('gpsEstado').textContent = 'Activo';
  bitacora('GPS activado.');
}

function onGpsOk(pos) {
  state.ubicacionActual = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  if (!state.busMarker) state.busMarker = L.marker([state.ubicacionActual.lat, state.ubicacionActual.lng]).addTo(state.map).bindPopup('Ruta');
  state.busMarker.setLatLng([state.ubicacionActual.lat, state.ubicacionActual.lng]);
  state.map.setView([state.ubicacionActual.lat, state.ubicacionActual.lng], 15);
  evaluarCercania();
}

function onGpsError(err) {
  $('gpsEstado').textContent = 'Error';
  bitacora(`GPS error: ${err.message}`);
}

function distanciaMetros(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLng / 2);
  const q = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

async function evaluarCercania() {
  const actual = getActual();
  if (!actual || !actual.lat || !actual.lng || !state.ubicacionActual) return;
  const d = distanciaMetros(state.ubicacionActual, { lat: actual.lat, lng: actual.lng });
  if (d <= state.config.radioAviso) {
    $('tipoMensaje').value = 'cerca';
    actualizarVistaPrevia();
  }
  const listBarrio = getRutaActivaList().filter(e => e.barrio === actual.barrio && e.lat && e.lng);
  const barrioNear = listBarrio.some(e => distanciaMetros(state.ubicacionActual, { lat: e.lat, lng: e.lng }) <= Math.max(state.config.radioAviso, 350));
  if (barrioNear && state.barrioActualNotificado !== actual.barrio) {
    state.barrioActualNotificado = actual.barrio;
    bitacora(`Ingreso detectado al barrio ${actual.barrio}.`);
  }
}

window.addEventListener('load', init);
