const API_URL = 'http://localhost:3000';
const NOMBRES_DIAS = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };
function formatearFechaLocal(fechaISO) {
  if (!fechaISO) return '';
  const d = new Date(fechaISO);
  if (isNaN(d.getTime())) return String(fechaISO).replace('T', ' ').slice(0, 16);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hrs = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${anio}-${mes}-${dia} ${hrs}:${min}`;
}

let usuarioActual = null;
let listaConsultoriosCache = [];
let listaDoctoresCache = [];
let listaRecetasCache = [];

function asegurarEstilosToast() {
  if (document.getElementById('ebersys-toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'ebersys-toast-styles';
  style.textContent = `
    #alertaGlobal { display: none !important; }
    .ebersys-toast-container {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      display: flex; flex-direction: column-reverse; gap: 12px;
      max-width: 420px; width: calc(100vw - 48px); pointer-events: none;
    }
    .ebersys-toast {
      pointer-events: auto; position: relative; display: flex; align-items: flex-start;
      gap: 12px; padding: 15px 18px; border-radius: 16px;
      background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(16px);
      box-shadow: 0 18px 38px rgba(35, 113, 186, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.9); overflow: hidden;
      animation: toastPushUpIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ebersys-toast.closing { animation: toastPushUpOut 0.28s ease forwards; }
    .ebersys-toast.error { border-left: 6px solid #900C3F; background: linear-gradient(135deg, rgba(255, 245, 248, 0.98), rgba(255, 255, 255, 0.96)); }
    .ebersys-toast.exito { border-left: 6px solid #06D6A0; background: linear-gradient(135deg, rgba(240, 253, 249, 0.98), rgba(255, 255, 255, 0.96)); }
    .ebersys-toast-icon { font-size: 1.25rem; line-height: 1; margin-top: 2px; flex-shrink: 0; }
    .ebersys-toast-body { flex: 1; min-width: 0; text-align: left; }
    .ebersys-toast-title { font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 3px; }
    .ebersys-toast.error .ebersys-toast-title { color: #900C3F; }
    .ebersys-toast.exito .ebersys-toast-title { color: #047857; }
    .ebersys-toast-msg { font-size: 0.87rem; font-weight: 500; color: #333333; line-height: 1.4; word-wrap: break-word; }
    .ebersys-toast-close { background: transparent; border: none; color: #666666; font-size: 1rem; font-weight: 700; cursor: pointer; padding: 2px 6px; border-radius: 8px; line-height: 1; }
    .ebersys-toast-progress { position: absolute; bottom: 0; left: 0; height: 3.5px; width: 100%; transform-origin: left; animation: toastProgressShrink linear forwards; }
    .ebersys-toast.error .ebersys-toast-progress { background: linear-gradient(90deg, #900C3F, #FF66C4); }
    .ebersys-toast.exito .ebersys-toast-progress { background: linear-gradient(90deg, #06D6A0, #2371BA); }
    @keyframes toastPushUpIn { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes toastPushUpOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(16px) scale(0.95); } }
    @keyframes toastProgressShrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `;
  document.head.appendChild(style);
}

function mostrarAlerta(texto, tipo = 'error') {
  asegurarEstilosToast();
  const mensaje = Array.isArray(texto) ? texto.join(' | ') : texto;
  const esExito = tipo === 'exito';
  const duracionMs = esExito ? 4500 : 7000;

  const dialogAbierto = document.querySelector('dialog[open]');
  const nodoPadre = dialogAbierto || document.body;

  let contenedor = nodoPadre.querySelector('.ebersys-toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'ebersys-toast-container';
    nodoPadre.appendChild(contenedor);
  }

  const toast = document.createElement('div');
  toast.className = `ebersys-toast ${esExito ? 'exito' : 'error'}`;
  toast.innerHTML = `
    <div class="ebersys-toast-icon">${esExito ? '✅' : '🚫'}</div>
    <div class="ebersys-toast-body">
      <div class="ebersys-toast-title">${esExito ? 'Operación Exitosa' : 'Aviso de Validación'}</div>
      <div class="ebersys-toast-msg"></div>
    </div>
    <button type="button" class="ebersys-toast-close" aria-label="Cerrar notificación">✕</button>
    <div class="ebersys-toast-progress" style="animation-duration: ${duracionMs}ms;"></div>
  `;

  toast.querySelector('.ebersys-toast-msg').textContent = mensaje;

  const cerrarToast = () => {
    if (toast.classList.contains('closing')) return;
    toast.classList.add('closing');
    setTimeout(() => toast.remove(), 280);
  };

  toast.querySelector('.ebersys-toast-close').addEventListener('click', cerrarToast);
  contenedor.appendChild(toast);

  setTimeout(cerrarToast, duracionMs);
}

function formatearHorarios(horarios) {
  if (!horarios || horarios.length === 0) return 'Sin horario configurado';
  const ordenados = [...horarios].sort((a, b) => a.diaSemana - b.diaSemana);
  const dias = ordenados.map((h) => NOMBRES_DIAS[h.diaSemana]).join(', ');
  return `${dias} de ${ordenados[0].horaInicio.slice(0, 5)} a ${ordenados[0].horaFin.slice(0, 5)} hrs`;
}

function cambiarVista(vista) {
  document.getElementById('vistaCitas').classList.toggle('hidden', vista !== 'citas');
  document.getElementById('vistaEstudios').classList.toggle('hidden', vista !== 'estudios');
  document.getElementById('vistaFarmacia').classList.toggle('hidden', vista !== 'farmacia');

  document.getElementById('btnTabCitas').classList.toggle('active', vista === 'citas');
  document.getElementById('btnTabEstudios').classList.toggle('active', vista === 'estudios');
  document.getElementById('btnTabFarmacia').classList.toggle('active', vista === 'farmacia');

  const titulosPac = {
    citas: ['Portal del Paciente — Mis Citas Médicas', 'Agendamiento de consultas (máx. 2 activas) y seguimiento de Créditos de Confianza'],
    estudios: ['Estudios Clínicos y Solicitud de Análisis (CU-09 / CU-15)', 'Solicita análisis con generación automática de cita y consulta el estado de tus resultados'],
    farmacia: ['Mis Recetas Médicas (CU-10)', 'Consulta tus recetas autorizadas/surtidas y pendientes por folio físico'],
  };
  const h1 = document.querySelector('.workspace-header h1');
  const sub = document.querySelector('.workspace-header .subtitle');
  if (h1 && titulosPac[vista]) h1.textContent = titulosPac[vista][0];
  if (sub && titulosPac[vista]) sub.textContent = titulosPac[vista][1];
}

function cerrarSesion() {
  localStorage.removeItem('hospital_sesion');
  window.location.href = 'login.html';
}

async function inicializarPaciente() {
  asegurarEstilosToast();
  const hoy = new Date();
  const fechaLocalHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const inputFecha = document.getElementById('inputFechaCita');
  if (inputFecha) {
    inputFecha.min = fechaLocalHoy;
    inputFecha.value = fechaLocalHoy;
  }

  const sesion = localStorage.getItem('hospital_sesion');
  if (!sesion) {
    window.location.href = 'login.html';
    return;
  }

  usuarioActual = JSON.parse(sesion);
  document.getElementById('lblNombreUsuario').textContent = `${usuarioActual.nombre} ${usuarioActual.apellidoPaterno}`;

  await Promise.all([cargarCatalogos(), cargarCitas(), cargarEstudios(), cargarRecetas(), cargarNotificacionesUI()]);
}

async function cargarCatalogos() {
  const [resPac, resDoc, resCon] = await Promise.all([
    fetch(`${API_URL}/catalogos/pacientes`),
    fetch(`${API_URL}/catalogos/doctores`),
    fetch(`${API_URL}/catalogos/consultorios`),
  ]);
  const pacientes = await resPac.json();
  listaDoctoresCache = await resDoc.json();
  listaConsultoriosCache = await resCon.json();

  const miPerfil = pacientes.find((p) =>
    p.usuarioId === usuarioActual?.id ||
    p.id === usuarioActual?.id ||
    (usuarioActual?.correo && p.usuario?.correo?.toLowerCase() === usuarioActual.correo.toLowerCase())
  );

  if (miPerfil) {
    usuarioActual.id = miPerfil.usuarioId;
    localStorage.setItem('hospital_sesion', JSON.stringify(usuarioActual));

    const creditos = miPerfil.creditosConfianza ?? 100;

    document.getElementById('selectPaciente').innerHTML =
      `<option value="${miPerfil.usuarioId}">${miPerfil.usuario.nombre} ${miPerfil.usuario.apellidoPaterno} (NSS: ${miPerfil.numSeguridadSocial})</option>`;

    if (document.getElementById('kpiReincidencias')) {
      document.getElementById('kpiReincidencias').textContent = miPerfil.conteoReincidencias || 0;
    }
    if (document.getElementById('kpiSanciones')) {
      document.getElementById('kpiSanciones').textContent = miPerfil.conteoSanciones || 0;
    }

    // Inyectar o actualizar tarjeta KPI de Créditos de Confianza en el grid superior
    const kpiGrid = document.querySelector('.kpi-grid');
    if (kpiGrid && !document.getElementById('kpiCardCreditos')) {
      const cardCreditos = document.createElement('div');
      cardCreditos.id = 'kpiCardCreditos';
      cardCreditos.className = 'kpi-card kpi-lavender';
      cardCreditos.innerHTML = `
        <div class="kpi-top">
          <div class="kpi-avatar">💳</div>
          <span class="kpi-pill">Confianza</span>
        </div>
        <div class="kpi-label">Créditos Disponibles</div>
        <div class="kpi-value" id="kpiCreditosValor">${creditos} / 100</div>
      `;
      kpiGrid.prepend(cardCreditos);
    } else if (document.getElementById('kpiCreditosValor')) {
      document.getElementById('kpiCreditosValor').textContent = `${creditos} / 100`;
    }

    const badges = [
      `<span class="badge badge-programada" style="font-weight:800;">💳 CRÉDITOS: ${creditos} / 100</span>`,
    ];
    if (miPerfil.listaEsperaPrioritaria) badges.push(`<span class="badge badge-doctor">⭐ Lista Espera Prioritaria</span>`);
    if (miPerfil.flagReincidencia) badges.push(`<span class="badge badge-pendiente">⚠️ Reincidencias: ${miPerfil.conteoReincidencias}</span>`);
    if (miPerfil.conteoSanciones > 0) badges.push(`<span class="badge badge-cancelada">🚫 Sanciones: ${miPerfil.conteoSanciones}</span>`);
    const lblFlags = document.getElementById('lblFlagsPaciente');
    if (lblFlags) lblFlags.innerHTML = badges.join(' ');
  }

  // Solo mostrar consultorios que tengan médicos asignados de su especialidad
  const consultoriosValidos = listaConsultoriosCache.filter(
    (c) => (c.doctoresAsignados || []).some((d) => (d.especialidad || '').trim() === (c.especialidad || '').trim())
  );
  const listaUsar = consultoriosValidos.length > 0 ? consultoriosValidos : listaConsultoriosCache;

  const grupos = {};
  for (const c of listaUsar) {
    const esp = c.especialidad || 'Medicina General';
    if (!grupos[esp]) grupos[esp] = [];
    grupos[esp].push(c);
  }

  const selectCon = document.getElementById('selectConsultorio');
  if (selectCon) {
    selectCon.innerHTML = Object.keys(grupos)
      .map((esp) => `<optgroup label="🩺 ${esp}">${grupos[esp].map((c) => `<option value="${c.id}">${c.numero} (${c.ubicacionPiso})</option>`).join('')}</optgroup>`)
      .join('');
    actualizarInfoConsultorioCita();
  }
}

function actualizarInfoConsultorioCita() {
  const consultorioId = document.getElementById('selectConsultorio').value;
  const consultorio = listaConsultoriosCache.find((c) => c.id === consultorioId);
  if (!consultorio) return;

  const doctores = (consultorio.doctoresAsignados || []).filter(
    (d) => (d.especialidad || '').trim() === (consultorio.especialidad || '').trim()
  );

  document.getElementById('infoHorarioConsultorio').innerHTML = `
    <strong>📌 Especialidad:</strong> ${consultorio.especialidad}<br>
    <strong>🕒 Horario de atención:</strong> ${formatearHorarios(consultorio.horarios)}<br>
    <strong>🩺 Médicos asignados:</strong> ${doctores.map((d) => `${d.usuario.nombre} ${d.usuario.apellidoPaterno} (Turno: ${(d.horaInicioTurno || '08:00').slice(0,5)}-${(d.horaFinTurno || '16:00').slice(0,5)})`).join(', ') || 'Sin médicos asignados'}
  `;
  document.getElementById('selectDoctor').innerHTML = doctores
    .map((d) => `<option value="${d.usuarioId}">${d.usuario.nombre} ${d.usuario.apellidoPaterno} - ${d.especialidad}</option>`)
    .join('');

  cargarSlotsDisponiblesUI();
}

async function cargarSlotsDisponiblesUI() {
  const consultorioId = document.getElementById('selectConsultorio').value;
  const doctorId = document.getElementById('selectDoctor').value;
  const fecha = document.getElementById('inputFechaCita').value;
  const contenedor = document.getElementById('contenedorSlots');
  document.getElementById('inputSlotSeleccionado').value = '';

  if (!consultorioId || !doctorId || !fecha) return;
  const res = await fetch(`${API_URL}/citas/slots-disponibles?consultorioId=${consultorioId}&doctorId=${doctorId}&fecha=${fecha}`);
  const slots = await res.json();

  if (!Array.isArray(slots) || slots.length === 0) {
    const consultorio = listaConsultoriosCache.find((c) => c.id === consultorioId);
    const diasHabiles = formatearHorarios(consultorio?.horarios);
    contenedor.innerHTML = `<span style="grid-column: 1 / -1; color: var(--danger); font-weight: 600; font-size: 0.82rem;">⚠️ El consultorio no labora en este día de la semana (Horario: ${diasHabiles}).</span>`;
    return;
  }

  contenedor.innerHTML = slots.map((s) => {
    if (s.disponible) return `<button type="button" class="slot-btn" onclick="seleccionarSlot('${s.fechaHoraISO}', this)">${s.hora}</button>`;
    const clase = (s.estadoSlot === 'BLOQUEADO' || s.estadoSlot === 'INACTIVO') ? 'slot-bloqueado' : (s.estadoSlot === 'PASADO' ? 'slot-pasado' : 'slot-ocupado');
    return `<button type="button" class="slot-btn ${clase}" disabled>${s.hora}<br><small style="font-size:0.65rem">${s.estadoSlot}</small></button>`;
  }).join('');
}

function seleccionarSlot(fechaHoraISO, btn) {
  document.getElementById('inputSlotSeleccionado').value = fechaHoraISO;
  document.querySelectorAll('#contenedorSlots .slot-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
}

async function cargarCitas() {
  const res = await fetch(`${API_URL}/citas`);
  const todas = await res.json();
  const ahora = new Date();
  const misCitas = usuarioActual ? todas.filter((c) => c.pacienteId === usuarioActual.id) : todas;

  // Solo contar como activas las citas programadas cuya fecha/hora sea futura
  const citasActivasVigentes = misCitas.filter(
    (c) => c.estado === 'programada' && new Date(c.fechaHora) > ahora
  );

  const kpiCitasActivas = document.getElementById('kpiCitasActivas');
  if (kpiCitasActivas) kpiCitasActivas.textContent = `${citasActivasVigentes.length} / 2`;

  const tbody = document.getElementById('tablaCitas');
  if (!tbody) return;

  tbody.innerHTML = misCitas.length === 0
    ? '<tr><td colspan="6" style="text-align:center;">No tienes citas registradas.</td></tr>'
    : misCitas.map((c) => {
        const fechaCitaObj = new Date(c.fechaHora);
        const limiteTolerancia = new Date(fechaCitaObj.getTime() + 30 * 60 * 1000);
        const yaPaso = ahora > limiteTolerancia;
        const fecha = formatearFechaLocal(c.fechaHora);
        const pac = c.paciente ? `${c.paciente.usuario.nombre} ${c.paciente.usuario.apellidoPaterno}` : '';
        const doc = c.doctor ? `${c.doctor.usuario.nombre} ${c.doctor.usuario.apellidoPaterno}` : '';
        const con = c.consultorio ? `${c.consultorio.numero} (${c.consultorio.especialidad})` : '';
        const diag = c.diagnostico ? `<strong>${c.diagnostico}</strong><br><small>${c.observaciones || ''}</small>` : '<span style="color:#94a3b8">Sin registrar</span>';
        const detalle = c.motivoCancelacion ? `<br><small style="color:var(--muted)">${c.motivoCancelacion}</small>` : '';

        let acciones = '<span style="color:#94a3b8; font-size:0.8rem;">Cerrada</span>';
        if (c.estado === 'programada' && !yaPaso) {
          acciones = `<button class="btn btn-sm btn-danger" onclick="cancelarCita('${c.id}')">Cancelar Cita</button>`;
        } else if (yaPaso && c.estado === 'programada') {
          acciones = `<span style="color:#94a3b8; font-size:0.8rem;">🔒 Fecha vencida</span>`;
        }

        const estadoMostrar = (c.estado === 'programada' && yaPaso) ? 'inasistencia' : c.estado;

        return `<tr><td><strong>${fecha}</strong></td><td>${pac}</td><td>${doc}<br><small>${con}</small></td><td><span class="badge badge-${estadoMostrar}">${estadoMostrar.replace('_', ' ')}</span>${detalle}</td><td>${diag}</td><td>${acciones}</td></tr>`;
      }).join('');
}

const formCita = document.getElementById('formCita');
if (formCita) {
  formCita.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fechaHora = document.getElementById('inputSlotSeleccionado').value;
    if (!fechaHora) return mostrarAlerta('Selecciona un bloque de horario disponible.', 'error');

    const res = await fetch(`${API_URL}/citas/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pacienteId: document.getElementById('selectPaciente').value,
        doctorId: document.getElementById('selectDoctor').value,
        consultorioId: document.getElementById('selectConsultorio').value,
        fechaHora,
      }),
    });
    const data = await res.json();
    if (!res.ok) return mostrarAlerta(data.message, 'error');
    mostrarAlerta('¡Cita agendada exitosamente!', 'exito');
    await Promise.all([cargarCatalogos(), cargarCitas(), cargarSlotsDisponiblesUI()]);
  });
}

async function cancelarCita(id) {
  if (!confirm('¿Deseas cancelar tu cita? Se aplicarán las reglas de anticipación y Créditos de Confianza.')) return;
  const res = await fetch(`${API_URL}/citas/${id}/cancelar`, { method: 'PATCH' });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  await Promise.all([cargarCatalogos(), cargarCitas(), cargarSlotsDisponiblesUI()]);
  mostrarAlerta(data.avisoRegla || 'Cita cancelada.', 'exito');
}

async function cargarEstudios() {
  const [resCat, resSol] = await Promise.all([
    fetch(`${API_URL}/estudios/catalogo`),
    fetch(`${API_URL}/estudios/solicitudes`),
  ]);
  const catalogo = resCat.ok ? await resCat.json() : [];
  let solicitudes = resSol.ok ? await resSol.json() : [];
  if (usuarioActual) solicitudes = solicitudes.filter((s) => s.pacienteId === usuarioActual.id);

  if (document.getElementById('kpiEstudiosTotal')) {
    document.getElementById('kpiEstudiosTotal').textContent = solicitudes.length;
  }

  // Inyectar formulario de Solicitud de Análisis con Cita Automática (CU-09 / CU-15) en #vistaEstudios si no existe
  const secEstudios = document.getElementById('vistaEstudios');
  if (secEstudios && !document.getElementById('cardSolicitarAnalisisPaciente')) {
    secEstudios.classList.add('bento-grid');
    const cardForm = document.createElement('div');
    cardForm.id = 'cardSolicitarAnalisisPaciente';
    cardForm.className = 'glass-card';
    const hoy = new Date();
    const hoyLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    cardForm.innerHTML = `
      <h2>🧪 Solicitar Análisis y Generar Cita (CU-09 / CU-15)</h2>
      <form id="formAnalisisPaciente">
        <div class="form-group">
          <label>1. Análisis o Estudio Clínico Requerido *</label>
          <select id="pacSelectEstudio" required></select>
        </div>
        <div class="form-group">
          <label>2. Consultorio donde se tomará la muestra / estudio *</label>
          <select id="pacEstudioConsultorio" onchange="cargarSlotsEstudioPaciente()" required></select>
        </div>
        <div class="form-group">
          <label>3. Fecha Futura del Estudio *</label>
          <input type="date" id="pacEstudioFecha" min="${hoyLocal}" value="${hoyLocal}" onchange="cargarSlotsEstudioPaciente()" required />
        </div>
        <div class="form-group">
          <label>4. Bloque Horario Disponible (30 min) *</label>
          <input type="hidden" id="pacEstudioSlotISO" required />
          <div id="pacContenedorSlotsEstudio" class="slots-grid"></div>
        </div>
        <button type="submit" class="btn">Solicitar Análisis y Agendar Cita Automática</button>
      </form>
    `;
    secEstudios.prepend(cardForm);

    document.getElementById('formAnalisisPaciente').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fechaHora = document.getElementById('pacEstudioSlotISO').value;
      if (!fechaHora) return mostrarAlerta('Selecciona un bloque de horario disponible para tu estudio.', 'error');

      const consultorioId = document.getElementById('pacEstudioConsultorio').value;
      const cons = listaConsultoriosCache.find((c) => c.id === consultorioId);
      const docAsignado = (cons?.doctoresAsignados || [])[0];
      if (!docAsignado) return mostrarAlerta('El consultorio elegido no tiene médico asignado.', 'error');

      const resCita = await fetch(`${API_URL}/citas/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: usuarioActual.id,
          doctorId: docAsignado.usuarioId,
          consultorioId,
          fechaHora,
        }),
      });
      const dataCita = await resCita.json();
      if (!resCita.ok) return mostrarAlerta(dataCita.message, 'error');

      const resOrden = await fetch(`${API_URL}/estudios/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citaId: dataCita.id,
          pacienteId: usuarioActual.id,
          estudioId: document.getElementById('pacSelectEstudio').value,
        }),
      });

      if (resOrden.ok) {
        await Promise.all([cargarCatalogos(), cargarCitas(), cargarEstudios(), cargarSlotsEstudioPaciente()]);
        mostrarAlerta('¡Análisis clínico solicitado y cita generada automáticamente (CU-09)!', 'exito');
      }
    });
  }

  const selEst = document.getElementById('pacSelectEstudio');
  if (selEst) {
    selEst.innerHTML = catalogo.map((e) => `<option value="${e.id}">${e.nombreEstudio} — ${e.descripcion || ''}</option>`).join('');
  }
  const selConEst = document.getElementById('pacEstudioConsultorio');
  if (selConEst && selConEst.options.length === 0 && listaConsultoriosCache.length > 0) {
    const validos = listaConsultoriosCache.filter((c) => (c.doctoresAsignados || []).length > 0);
    selConEst.innerHTML = validos.map((c) => `<option value="${c.id}">${c.numero} - ${c.especialidad} (${c.ubicacionPiso})</option>`).join('');
    cargarSlotsEstudioPaciente();
  }

  let mapaEstudios = {};
  try { mapaEstudios = JSON.parse(localStorage.getItem('ebersys_estados_estudios') || '{}'); } catch {}

  const tbody = document.getElementById('tablaSolicitudesEstudios');
  if (tbody) {
    tbody.innerHTML = solicitudes.length === 0
      ? '<tr><td colspan="5" style="text-align:center;">No hay estudios registrados.</td></tr>'
      : solicitudes.map((s) => {
          const listo = mapaEstudios[s.id]?.estado === 'listo';
          const badgeEstado = listo
            ? `<span class="badge badge-finalizada">✅ Resultados listos</span>`
            : `<span class="badge badge-pendiente">⏳ Pendiente de resultados</span>`;
          return `
            <tr>
              <td><strong>${s.fechaSolicitud ? formatearFechaLocal(s.fechaSolicitud) : ''}</strong></td>
              <td>${s.paciente ? `${s.paciente.usuario.nombre} ${s.paciente.usuario.apellidoPaterno}` : ''}</td>
              <td><span class="badge badge-programada">${s.estudio ? s.estudio.nombreEstudio : ''}</span><br>${badgeEstado}</td>
              <td>${s.estudio?.descripcion || 'Sin indicaciones'}</td>
              <td><strong>${s.citaOrigen ? formatearFechaLocal(s.citaOrigen.fechaHora) : ''}</strong></td>
            </tr>`;
        }).join('');
  }
}

async function cargarSlotsEstudioPaciente() {
  const consultorioId = document.getElementById('pacEstudioConsultorio')?.value;
  const fecha = document.getElementById('pacEstudioFecha')?.value;
  const contenedor = document.getElementById('pacContenedorSlotsEstudio');
  const inputISO = document.getElementById('pacEstudioSlotISO');
  if (inputISO) inputISO.value = '';
  if (!consultorioId || !fecha || !contenedor) return;

  const cons = listaConsultoriosCache.find((c) => c.id === consultorioId);
  const docId = cons?.doctoresAsignados?.[0]?.usuarioId;
  if (!docId) return;

  const res = await fetch(`${API_URL}/citas/slots-disponibles?consultorioId=${consultorioId}&doctorId=${docId}&fecha=${fecha}`);
  const slots = await res.json();
  if (!Array.isArray(slots) || slots.length === 0) {
    contenedor.innerHTML = `<span style="grid-column:1/-1; color:var(--danger); font-size:0.8rem;">⚠️ Sin servicio este día.</span>`;
    return;
  }
  contenedor.innerHTML = slots.map((s) =>
    s.disponible
      ? `<button type="button" class="slot-btn" onclick="seleccionarSlotEstudioPac('${s.fechaHoraISO}', this)">${s.hora}</button>`
      : `<button type="button" class="slot-btn slot-ocupado" disabled>${s.hora}</button>`
  ).join('');
}

function seleccionarSlotEstudioPac(iso, btn) {
  document.getElementById('pacEstudioSlotISO').value = iso;
  document.querySelectorAll('#pacContenedorSlotsEstudio .slot-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
}

async function cargarRecetas() {
  const res = await fetch(`${API_URL}/farmacia/recetas`);
  const todas = await res.json();
  listaRecetasCache = usuarioActual ? todas.filter((r) => r.pacienteId === usuarioActual.id) : todas;
  renderizarTablaRecetas();
}

function renderizarTablaRecetas() {
  const inputFiltro = document.getElementById('inputBuscarFolio');
  if (!inputFiltro) return;
  const filtro = inputFiltro.value.trim().toLowerCase();
  const filtradas = listaRecetasCache.filter((r) => r.folioFisico.toLowerCase().includes(filtro));

  const tbody = document.getElementById('tablaRecetas');
  if (tbody) {
    tbody.innerHTML = filtradas.length === 0
      ? '<tr><td colspan="5" style="text-align:center;">No hay recetas médicas.</td></tr>'
      : filtradas.map((r) => `
          <tr>
            <td><strong>${r.folioFisico}</strong><br><small>${r.fechaEmision ? r.fechaEmision.replace('T', ' ').slice(0, 16) : ''}</small></td>
            <td>${r.paciente ? `${r.paciente.usuario.nombre} ${r.paciente.usuario.apellidoPaterno}` : ''}<br><small>${r.doctor ? `${r.doctor.usuario.nombre} ${r.doctor.usuario.apellidoPaterno}` : ''}</small></td>
            <td>${(r.detalles || []).map((d) => `• <strong>${d.medicamento}</strong> (${d.cantidadEntregar} u.)<br><small>${d.dosis}</small>`).join('<br>')}</td>
            <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
            <td><small>${r.estado === 'surtida' ? 'Entregada' : 'Pendiente en Farmacia'}</small></td>
          </tr>`).join('');
  }
}

async function cargarNotificacionesUI() {
  if (!usuarioActual) return;
  const res = await fetch(`${API_URL}/citas/notificaciones?pacienteId=${usuarioActual.id}`);
  const notifs = await res.json();
  const panel = document.getElementById('panelNotificacionesPaciente');
  if (!panel) return;

  if (!Array.isArray(notifs) || notifs.length === 0) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  document.getElementById('listaNotificacionesPaciente').innerHTML = notifs.map((n) => `
    <div class="notif-item">
      <div>${n.mensaje}</div>
      <div style="margin-top:0.45rem;">
        ${n.requiereConfirmacion && !n.doctorSustitutoId
          ? `<button class="btn btn-sm btn-success" onclick="responderNotificacion('${n.id}', 'aceptar_nuevo_horario')">✅ Aceptar Horario</button>
             <button class="btn btn-sm btn-warning" onclick="responderNotificacion('${n.id}', 'rechazar_nuevo_horario')">📅 Elegir otro</button>`
          : `<button class="btn btn-sm btn-secondary" onclick="marcarNotificacionLeidaUI('${n.id}')">✓ Entendido</button>`}
      </div>
    </div>`).join('');
}

async function marcarNotificacionLeidaUI(id) {
  await fetch(`${API_URL}/citas/notificaciones/${id}/leer`, { method: 'PATCH' });
  await cargarNotificacionesUI();
}

async function responderNotificacion(id, accion) {
  await fetch(`${API_URL}/citas/notificaciones/${id}/responder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion }),
  });
  await Promise.all([cargarCatalogos(), cargarCitas(), cargarNotificacionesUI()]);
}

window.addEventListener('DOMContentLoaded', inicializarPaciente);