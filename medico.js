const API_URL = 'http://localhost:3000';
const NOMBRES_DIAS = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };

let usuarioActual = null;
let listaCitasCache = [];
let listaConsultoriosCache = [];
let listaDoctoresCache = [];
let listaRecetasCache = [];
let listaSolicitudesEstudiosCache = [];
let bloquesDoctorSeleccionados = new Set();

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

// Control de estado de resultados de estudios clínicos (Pendiente de resultados vs Resultados listos)
function obtenerMapaEstadosEstudios() {
  try {
    return JSON.parse(localStorage.getItem('ebersys_estados_estudios') || '{}');
  } catch {
    return {};
  }
}

function marcarResultadoEstudioListo(solicitudId) {
  const mapa = obtenerMapaEstadosEstudios();
  mapa[solicitudId] = {
    estado: 'listo',
    fechaResultado: formatearFechaLocal(new Date().toISOString()),
  };
  localStorage.setItem('ebersys_estados_estudios', JSON.stringify(mapa));
  cargarEstudios();
  cargarCitas();
  mostrarAlerta('¡Estudio marcado como "Resultados Listos"! Ya puede revisarse en consulta.', 'exito');
}

function mostrarAlerta(texto, tipo = 'error') {
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
  return `${ordenados.map((h) => NOMBRES_DIAS[h.diaSemana]).join(', ')} de ${ordenados[0].horaInicio.slice(0, 5)} a ${ordenados[0].horaFin.slice(0, 5)} hrs`;
}

function cambiarVista(vista) {
  ['citas', 'estudios', 'farmacia', 'soporte'].forEach((v) => {
    const sec = document.getElementById(`vista${v.charAt(0).toUpperCase() + v.slice(1)}`);
    const btn = document.getElementById(`btnTab${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (sec) sec.classList.toggle('hidden', v !== vista);
    if (btn) btn.classList.toggle('active', v === vista);
  });

  const titulos = {
    citas: ['Agenda y Consultas Médicas (CU-04 a CU-06)', 'Atención de consultas con CIE-10, reagendamiento y bloqueo de horarios'],
    estudios: ['Órdenes y Resultados de Estudios Clínicos (CU-07)', 'Asignación de estudios en consulta activa y validación de resultados listos'],
    farmacia: ['Emisión y Historial de Recetas Médicas (CU-12 y CU-14)', 'Prescripción de medicamentos con folio físico impreso'],
    soporte: ['Soporte Técnico y Credenciales Médicas (CU-18)', 'Solicitud de actualización de Cédula Profesional, Especialidad o Núm. de Empleado'],
  };

  const h1 = document.querySelector('.workspace-header h1');
  const sub = document.querySelector('.workspace-header .subtitle');
  if (h1 && titulos[vista]) h1.textContent = titulos[vista][0];
  if (sub && titulos[vista]) sub.textContent = titulos[vista][1];
}

function cerrarSesion() {
  localStorage.removeItem('hospital_sesion');
  window.location.href = 'login.html';
}

async function inicializarMedico() {
  const hoy = new Date();
  const fechaLocalHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  ['inputFechaCita', 'bloqueoFecha', 'cancelDocNuevaFecha'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.min = fechaLocalHoy; el.value = fechaLocalHoy; }
  });

  const sesion = localStorage.getItem('hospital_sesion');
  if (sesion) {
    usuarioActual = JSON.parse(sesion);
  } else {
    const resDoc = await fetch(`${API_URL}/catalogos/doctores`);
    const docs = await resDoc.json();
    if (docs.length > 0) {
      usuarioActual = { id: docs[0].usuarioId, nombre: docs[0].usuario.nombre, apellidoPaterno: docs[0].usuario.apellidoPaterno, rol: 'doctor' };
    }
  }

  if (usuarioActual) {
    document.getElementById('lblNombreUsuario').textContent = `${usuarioActual.nombre} ${usuarioActual.apellidoPaterno}`;
  }

  cargarBloquesParaCancelarUI();
  await Promise.all([
    cargarCatalogos(),
    cargarEstudios(),
    cargarCitas(),
    cargarRecetas(),
    cargarMisTickets(),
  ]);
}

async function cargarCatalogos() {
  const [resPac, resDoc, resCon] = await Promise.all([
    fetch(`${API_URL}/catalogos/pacientes`),
    fetch(`${API_URL}/catalogos/doctores`),
    fetch(`${API_URL}/catalogos/consultorios`),
  ]);
  const pacientes = await resPac.json();
  listaDoctoresCache = await resDoc.json();
  const todosConsultorios = await resCon.json();

  // Solución Punto 1: Solo listar consultorios que tengan al menos un médico asignado de su misma especialidad
  listaConsultoriosCache = todosConsultorios.filter((c) =>
    (c.doctoresAsignados || []).some(
      (d) => (d.especialidad || '').trim() === (c.especialidad || '').trim()
    )
  );

  document.getElementById('selectPaciente').innerHTML = pacientes
    .map((p) => `<option value="${p.usuarioId}">${p.usuario.nombre} ${p.usuario.apellidoPaterno} (NSS: ${p.numSeguridadSocial})</option>`)
    .join('');

  const miDoc = listaDoctoresCache.find((d) => d.usuarioId === usuarioActual?.id) || listaDoctoresCache[0];
  if (miDoc) {
    document.getElementById('selectDoctorBloqueo').innerHTML =
      `<option value="${miDoc.usuarioId}">${miDoc.usuario.nombre} ${miDoc.usuario.apellidoPaterno} (${miDoc.especialidad})</option>`;

    const boxCred = document.getElementById('boxMisCredencialesActuales');
    if (boxCred) {
      boxCred.innerHTML = `
        <strong>👤 Nombre Oficial:</strong> ${miDoc.usuario.nombre} ${miDoc.usuario.apellidoPaterno} ${miDoc.usuario.apellidoMaterno || ''}<br>
        <strong>🔢 Núm. Empleado Actual:</strong> <code>${miDoc.numEmpleado}</code><br>
        <strong>🪪 Cédula Profesional:</strong> <code>${miDoc.cedulaProfesional || 'Sin registrar'}</code> |
        <strong>Cédula Especialidad:</strong> <code>${miDoc.cedulaEspecialidad || 'Sin registrar'}</code>
      `;
    }
  }

  const grupos = {};
  for (const c of listaConsultoriosCache) {
    const esp = c.especialidad || 'Medicina General';
    if (!grupos[esp]) grupos[esp] = [];
    grupos[esp].push(c);
  }
  document.getElementById('selectConsultorio').innerHTML = Object.keys(grupos)
    .map((esp) => `<optgroup label="🩺 ${esp}">${grupos[esp].map((c) => `<option value="${c.id}">${c.numero} (${c.ubicacionPiso})</option>`).join('')}</optgroup>`)
    .join('');

  actualizarInfoConsultorioCita();
}

// Solución Punto 1: Filtrar estrictamente por la especialidad del consultorio (nunca mezclar doctores de otras áreas)
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
    <strong>🩺 Médicos asignados:</strong> ${
      doctores.length > 0
        ? doctores.map((d) => `${d.usuario.nombre} ${d.usuario.apellidoPaterno}`).join(', ')
        : 'Sin médicos de esta especialidad asignados'
    }
  `;

  document.getElementById('selectDoctor').innerHTML =
    doctores.length > 0
      ? doctores
          .map((d) => `<option value="${d.usuarioId}">${d.usuario.nombre} ${d.usuario.apellidoPaterno} - ${d.especialidad}</option>`)
          .join('')
      : '<option value="">Sin médico disponible</option>';

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

  contenedor.innerHTML = (!Array.isArray(slots) || slots.length === 0)
    ? `<span style="grid-column: 1 / -1; color: var(--danger); font-size: 0.82rem;">⚠️ El consultorio no labora este día.</span>`
    : slots.map((s) => {
        if (s.disponible) return `<button type="button" class="slot-btn" onclick="seleccionarSlot('${s.fechaHoraISO}', this)">${s.hora}</button>`;
        const clase = (s.estadoSlot === 'BLOQUEADO' || s.estadoSlot === 'INACTIVO') ? 'slot-bloqueado' : 'slot-ocupado';
        return `<button type="button" class="slot-btn ${clase}" disabled>${s.hora}<br><small style="font-size:0.65rem">${s.estadoSlot}</small></button>`;
      }).join('');
}

function seleccionarSlot(fechaHoraISO, btn) {
  document.getElementById('inputSlotSeleccionado').value = fechaHoraISO;
  document.querySelectorAll('#contenedorSlots .slot-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function cargarBloquesParaCancelarUI() {
  const contenedor = document.getElementById('contenedorBloquesDoctor');
  bloquesDoctorSeleccionados.clear();
  const bloques = [];
  for (let h = 8; h < 20; h++) {
    bloques.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`);
  }
  contenedor.innerHTML = bloques.map((hora) =>
    `<button type="button" class="slot-btn btn-bloque-doc" data-hora="${hora}" onclick="toggleBloqueDoctor('${hora}', this)">${hora}</button>`
  ).join('');
}

function toggleBloqueDoctor(hora, btn) {
  if (bloquesDoctorSeleccionados.has(hora)) {
    bloquesDoctorSeleccionados.delete(hora);
    btn.classList.remove('selected-danger');
  } else {
    bloquesDoctorSeleccionados.add(hora);
    btn.classList.add('selected-danger');
  }
}

function seleccionarTodosBloquesDoctor() {
  const botones = document.querySelectorAll('#contenedorBloquesDoctor .btn-bloque-doc');
  const todos = bloquesDoctorSeleccionados.size === botones.length;
  bloquesDoctorSeleccionados.clear();
  botones.forEach((btn) => {
    const hora = btn.getAttribute('data-hora');
    if (!todos) { bloquesDoctorSeleccionados.add(hora); btn.classList.add('selected-danger'); }
    else { btn.classList.remove('selected-danger'); }
  });
}

async function cargarCitas() {
  const res = await fetch(`${API_URL}/citas`);
  listaCitasCache = await res.json();
  const misCitas = usuarioActual ? listaCitasCache.filter((c) => c.doctorId === usuarioActual.id) : listaCitasCache;

  document.getElementById('kpiProgramadas').textContent = misCitas.filter((c) => c.estado === 'programada').length;
  document.getElementById('kpiFinalizadas').textContent = misCitas.filter((c) => c.estado === 'finalizada').length;

  const ahora = new Date();
  const mapaEstudios = obtenerMapaEstadosEstudios();

  document.getElementById('tablaCitas').innerHTML = misCitas.map((c) => {
    const fecha = formatearFechaLocal(c.fechaHora);
    const fechaCitaObj = new Date(c.fechaHora);
    // Permite atender desde 10 minutos antes de la cita y durante los 30 minutos de tolerancia
    const yaEsHoraDeAtender = ahora.getTime() >= (fechaCitaObj.getTime() - 10 * 60 * 1000);

    const pac = c.paciente ? `${c.paciente.usuario.nombre} ${c.paciente.usuario.apellidoPaterno}` : '';
    const doc = c.doctor ? `${c.doctor.usuario.nombre} ${c.doctor.usuario.apellidoPaterno}` : '';
    const con = c.consultorio ? `${c.consultorio.numero} (${c.consultorio.especialidad})` : '';
    const diag = c.diagnostico ? `<strong>${c.diagnostico}</strong><br><small>${c.observaciones || ''}</small>` : '<span style="color:#94a3b8">Sin registrar</span>';
    const detalle = c.motivoCancelacion ? `<br><small style="color:var(--muted)">${c.motivoCancelacion}</small>` : '';

    // Verificar si el paciente tiene algún estudio clínico con resultados aún pendientes (Punto 13)
    const estudiosPendientesPac = listaSolicitudesEstudiosCache.filter(
      (s) => s.pacienteId === c.pacienteId && mapaEstudios[s.id]?.estado !== 'listo'
    );
    const badgeEstudioPendiente =
      estudiosPendientesPac.length > 0 && c.estado === 'programada'
        ? `<br><span class="badge badge-pendiente" style="font-size:0.68rem;">🔬 Estudio pendiente (${estudiosPendientesPac[0].estudio?.nombreEstudio || 'Lab'})</span>`
        : '';

    let acciones = '<span style="color:#94a3b8; font-size:0.8rem;">Cerrada</span>';
    if (c.estado === 'programada') {
      // Solución Punto 2: Solo habilitar "Atender" cuando ya sea la fecha y hora de la cita
      const btnAtender = yaEsHoraDeAtender
        ? `<button class="btn btn-sm btn-success" onclick="abrirModalDiagnostico('${c.id}')">Atender (CIE-10)</button>`
        : `<button class="btn btn-sm btn-secondary" disabled title="Disponible a partir de ${fecha}" style="opacity:0.65; cursor:not-allowed;">🕒 Espera horario (${fecha.slice(11)})</button>`;

      const btnPosponerEstudio =
        estudiosPendientesPac.length > 0
          ? `<button class="btn btn-sm" style="background:#FFD166; color:#333;" onclick="abrirModalPosponerPorEstudio('${c.id}')">📅 Posponer (Estudio no listo)</button>`
          : '';

      acciones = `
        <div style="display:flex; flex-direction:column; gap:0.35rem;">
          ${btnAtender}
          ${btnPosponerEstudio}
          <button class="btn btn-sm btn-danger" onclick="abrirModalCancelarDoctor('${c.id}')">Cancelar / Reagendar</button>
        </div>`;
    }

    return `<tr><td><strong>${fecha}</strong></td><td>${pac}${badgeEstudioPendiente}</td><td>${doc}<br><small>${con}</small></td><td><span class="badge badge-${c.estado}">${c.estado.replace('_', ' ')}</span>${detalle}</td><td>${diag}</td><td>${acciones}</td></tr>`;
  }).join('');

  // Solución Punto 9 (RN-01 / CU-07): Para ordenar estudios solo permitir citas en atención (programadas vigentes), NO citas antiguas ya cerradas
  const citasActivasParaEstudios = misCitas.filter((c) => c.estado === 'programada');
  document.getElementById('selectCitaOrigen').innerHTML =
    citasActivasParaEstudios.length > 0
      ? citasActivasParaEstudios
          .map((c) => `<option value="${c.id}">${formatearFechaLocal(c.fechaHora)} - ${c.paciente?.usuario.nombre || 'Paciente'} (En atención)</option>`)
          .join('')
      : '<option value="">-- Solo puedes asignar estudios durante una consulta activa --</option>';

  // Para recetas médicas se permiten citas programadas o recién finalizadas del médico
  const opcionesReceta = misCitas
    .filter((c) => c.estado === 'programada' || c.estado === 'finalizada')
    .map((c) => `<option value="${c.id}">${formatearFechaLocal(c.fechaHora)} - ${c.paciente?.usuario.nombre || 'Paciente'}</option>`)
    .join('');
  document.getElementById('selectCitaReceta').innerHTML = opcionesReceta;
}

async function cargarMisTickets() {
  if (!usuarioActual) return;
  const res = await fetch(`${API_URL}/catalogos/tickets?doctorId=${usuarioActual.id}`);
  if (!res.ok) return;
  const tickets = await res.json();

  const tbody = document.getElementById('tablaMisTickets');
  if (!Array.isArray(tickets) || tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No has levantado tickets de soporte técnico.</td></tr>';
    return;
  }

  tbody.innerHTML = tickets.map((t) => {
    const fecha = formatearFechaLocal(t.fechaCreacion);
    const cambios = [];
    if (t.nuevoNumEmpleado) cambios.push(`• Núm. Empleado: <code>${t.nuevoNumEmpleado}</code>`);
    if (t.nuevaCedulaProfesional) cambios.push(`• Céd. Prof: <code>${t.nuevaCedulaProfesional}</code>`);
    if (t.nuevaCedulaEspecialidad) cambios.push(`• Céd. Esp: <code>${t.nuevaCedulaEspecialidad}</code>`);

    const badgeClass = t.estado === 'aprobado' ? 'badge-finalizada' : (t.estado === 'rechazado' ? 'badge-cancelada' : 'badge-pendiente');
    return `
      <tr>
        <td><strong>${fecha}</strong></td>
        <td>${t.motivo}</td>
        <td>${cambios.join('<br>')}</td>
        <td>
          <span class="badge ${badgeClass}">${t.estado}</span><br>
          <small style="color:var(--muted)">${t.respuestaAdmin || 'En revisión por Administración'}</small>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('formTicketSoporte').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!usuarioActual) return;

  const nuevoNumEmpleado = document.getElementById('ticketNuevoEmpleado').value.trim() || undefined;
  const nuevaCedulaProfesional = document.getElementById('ticketNuevaCedulaProf').value.trim() || undefined;
  const nuevaCedulaEspecialidad = document.getElementById('ticketNuevaCedulaEsp').value.trim() || undefined;

  if (!nuevoNumEmpleado && !nuevaCedulaProfesional && !nuevaCedulaEspecialidad) {
    return mostrarAlerta('Ingresa al menos un dato nuevo (Núm. de Empleado, Cédula Profesional o Cédula de Especialidad).', 'error');
  }

  const res = await fetch(`${API_URL}/catalogos/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorId: usuarioActual.id,
      motivo: document.getElementById('ticketMotivo').value.trim(),
      nuevoNumEmpleado,
      nuevaCedulaProfesional,
      nuevaCedulaEspecialidad,
    }),
  });

  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  e.target.reset();
  await cargarMisTickets();
  mostrarAlerta('¡Ticket enviado a Administración! En cuanto lo aprueben se actualizarán tus datos.', 'exito');
});

document.getElementById('formCita').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fechaHora = document.getElementById('inputSlotSeleccionado').value;
  if (!fechaHora) return mostrarAlerta('Selecciona un bloque disponible.', 'error');
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
  await Promise.all([cargarCitas(), cargarSlotsDisponiblesUI()]);
});

document.getElementById('formBloqueoDoctor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bloques = Array.from(bloquesDoctorSeleccionados);
  if (bloques.length === 0) return mostrarAlerta('Selecciona al menos un bloque de 30 minutos.', 'error');
  const res = await fetch(`${API_URL}/citas/cancelar-bloque-doctor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorId: document.getElementById('selectDoctorBloqueo').value,
      fecha: document.getElementById('bloqueoFecha').value,
      bloques,
      estadoSlot: document.getElementById('bloqueoEstadoSlot').value,
      motivo: document.getElementById('bloqueoMotivo').value.trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  document.getElementById('bloqueoMotivo').value = '';
  cargarBloquesParaCancelarUI();
  await Promise.all([cargarCitas(), cargarSlotsDisponiblesUI()]);
  mostrarAlerta(data.mensaje, 'exito');
});

function abrirModalDiagnostico(id) {
  const cita = listaCitasCache.find((c) => c.id === id);
  if (!cita) return;

  if (new Date().getTime() < new Date(cita.fechaHora).getTime() - 10 * 60 * 1000) {
  return mostrarAlerta(
    `Aún no es la hora programada de la cita (${formatearFechaLocal(cita.fechaHora)} hrs). Puedes atenderla desde 10 minutos antes de su inicio.`,
    'error'
  );
}

  document.getElementById('citaIdDiagnostico').value = id;
  const selCIE = document.getElementById('selectCodigoCIE10');
  if (selCIE) selCIE.value = '';
  document.getElementById('inputDiagnostico').value = '';
  document.getElementById('inputObservaciones').value = '';
  const selEstudioModal = document.getElementById('selectEstudioEnConsulta');
  if (selEstudioModal) selEstudioModal.value = '';

  document.getElementById('modalDiagnostico').showModal();
}

document.getElementById('formDiagnostico').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('citaIdDiagnostico').value;
  const cita = listaCitasCache.find((c) => c.id === id);

  const codigoCIE10 = document.getElementById('selectCodigoCIE10')?.value || '';
  const detalleClinico = document.getElementById('inputDiagnostico').value.trim();
  const diagnosticoNormalizado = codigoCIE10 ? `${codigoCIE10} — ${detalleClinico}` : detalleClinico;
  const estudioEnConsultaId = document.getElementById('selectEstudioEnConsulta')?.value;

  // Si el médico ordenó un estudio clínico durante la consulta (CU-07), registrarlo antes de cerrar la cita
  if (estudioEnConsultaId && cita) {
    await fetch(`${API_URL}/estudios/solicitudes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citaId: cita.id,
        pacienteId: cita.pacienteId,
        estudioId: estudioEnConsultaId,
      }),
    });
  }

  const res = await fetch(`${API_URL}/citas/${id}/diagnostico`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      diagnostico: diagnosticoNormalizado,
      observaciones: document.getElementById('inputObservaciones').value.trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  document.getElementById('modalDiagnostico').close();
  await Promise.all([cargarEstudios(), cargarCitas()]);
  mostrarAlerta(
    estudioEnConsultaId
      ? 'Diagnóstico CIE-10 registrado, estudio clínico ordenado (CU-07) y consulta finalizada.'
      : 'Diagnóstico CIE-10 registrado y consulta finalizada.',
    'exito'
  );
});

// Posponer cita sin penalizar al paciente cuando sus estudios clínicos aún no están listos (Punto 13)
function abrirModalPosponerPorEstudio(citaId) {
  abrirModalCancelarDoctor(citaId);
  document.getElementById('cancelDocMotivo').value =
    'Reprogramación sin penalización: Resultados de estudios clínicos aún en proceso de laboratorio.';
  document.getElementById('cancelDocQuiereReagendar').value = 'si';
  toggleSeccionReagendarDoctor();
}

function abrirModalCancelarDoctor(citaId) {
  const cita = listaCitasCache.find((c) => c.id === citaId);
  if (!cita) return;
  document.getElementById('cancelDocCitaId').value = cita.id;
  document.getElementById('cancelDocMotivo').value = '';
  document.getElementById('cancelDocQuiereReagendar').value = 'no';
  toggleSeccionReagendarDoctor();
  document.getElementById('modalCancelarCitaDoctor').showModal();
}

function toggleSeccionReagendarDoctor() {
  const quiere = document.getElementById('cancelDocQuiereReagendar').value === 'si';
  document.getElementById('seccionReagendarEnModal').classList.toggle('hidden', !quiere);
  if (quiere) cargarSlotsModalReagendarDoctor();
}

async function cargarSlotsModalReagendarDoctor() {
  const cita = listaCitasCache.find((c) => c.id === document.getElementById('cancelDocCitaId').value);
  const fecha = document.getElementById('cancelDocNuevaFecha').value;
  const contenedor = document.getElementById('contenedorSlotsModalDoctor');
  const inputSlotModal = document.getElementById('cancelDocNuevoSlotISO');

  if (inputSlotModal) inputSlotModal.value = '';
  if (!cita || !fecha || !contenedor) return;

  const res = await fetch(`${API_URL}/citas/slots-disponibles?consultorioId=${cita.consultorioId}&doctorId=${cita.doctorId}&fecha=${fecha}`);
  const slots = await res.json();

  if (!Array.isArray(slots) || slots.length === 0) {
    contenedor.innerHTML = `<span style="grid-column: 1 / -1; color: var(--danger); font-size: 0.82rem; font-weight: 600;">⚠️ El consultorio o el médico no tienen turnos disponibles en esta fecha.</span>`;
    return;
  }

  contenedor.innerHTML = slots.map((s) => {
    if (s.disponible) {
      return `<button type="button" class="slot-btn" onclick="seleccionarSlotModalDoctor('${s.fechaHoraISO}', this)">${s.hora}</button>`;
    }
    const clase = (s.estadoSlot === 'BLOQUEADO' || s.estadoSlot === 'INACTIVO') ? 'slot-bloqueado' : 'slot-ocupado';
    return `<button type="button" class="slot-btn ${clase}" disabled>${s.hora}<br><small style="font-size:0.65rem">${s.estadoSlot}</small></button>`;
  }).join('');
}

function seleccionarSlotModalDoctor(fechaHoraISO, btn) {
  document.getElementById('cancelDocNuevoSlotISO').value = fechaHoraISO;
  document
    .querySelectorAll('#contenedorSlotsModalDoctor .slot-btn')
    .forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
}

document.getElementById('formCancelarCitaDoctor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('cancelDocCitaId').value;
  const reagendar = document.getElementById('cancelDocQuiereReagendar').value === 'si';
  const nuevaFechaHora = document.getElementById('cancelDocNuevoSlotISO').value;

  if (reagendar && !nuevaFechaHora) {
    return mostrarAlerta('Selecciona un bloque de horario disponible (30 min) para reagendar la cita.', 'error');
  }

  const res = await fetch(`${API_URL}/citas/${id}/cancelar-doctor`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      motivo: document.getElementById('cancelDocMotivo').value.trim(),
      reagendar,
      nuevaFechaHora: reagendar ? nuevaFechaHora : undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  document.getElementById('modalCancelarCitaDoctor').close();
  await Promise.all([cargarCitas(), cargarSlotsDisponiblesUI()]);
  mostrarAlerta(data.mensaje, 'exito');
});

async function cargarEstudios() {
  const [resCat, resSol] = await Promise.all([fetch(`${API_URL}/estudios/catalogo`), fetch(`${API_URL}/estudios/solicitudes`)]);
  const catalogo = await resCat.json();
  const solicitudes = await resSol.json();
  listaSolicitudesEstudiosCache = Array.isArray(solicitudes) ? solicitudes : [];
  document.getElementById('kpiEstudiosDoc').textContent = listaSolicitudesEstudiosCache.length;

  const opEstudios = catalogo.map((e) => `<option value="${e.id}">${e.nombreEstudio} (${e.descripcion || 'Estudio clínico'})</option>`).join('');
  document.getElementById('selectEstudioClinico').innerHTML = opEstudios;

  const selEnConsulta = document.getElementById('selectEstudioEnConsulta');
  if (selEnConsulta) {
    selEnConsulta.innerHTML = `<option value="">-- No requiere estudio clínico adicional --</option>${opEstudios}`;
  }

  const mapaEstudios = obtenerMapaEstadosEstudios();

  document.getElementById('tablaSolicitudesEstudios').innerHTML = listaSolicitudesEstudiosCache.map((s) => {
    const infoEstado = mapaEstudios[s.id];
    const estaListo = infoEstado?.estado === 'listo';
    const badgeEstado = estaListo
      ? `<span class="badge badge-finalizada">✅ Resultados listos</span><br><small>Entregado: ${infoEstado.fechaResultado}</small>`
      : `<span class="badge badge-pendiente">⏳ Pendiente de resultados</span>`;

    const btnListo = estaListo
      ? ''
      : `<br><button class="btn btn-sm btn-success" style="margin-top:0.35rem;" onclick="marcarResultadoEstudioListo('${s.id}')">✅ Marcar Resultados Listos</button>`;

    return `
      <tr>
        <td><strong>${s.fechaSolicitud ? formatearFechaLocal(s.fechaSolicitud) : ''}</strong></td>
        <td>${s.paciente ? `${s.paciente.usuario.nombre} ${s.paciente.usuario.apellidoPaterno}` : ''}</td>
        <td><span class="badge badge-programada">${s.estudio?.nombreEstudio || ''}</span></td>
        <td>${s.estudio?.descripcion || 'Sin indicaciones'}</td>
        <td>
          Cita: ${s.citaOrigen ? formatearFechaLocal(s.citaOrigen.fechaHora) : 'Directa'}<br>
          ${badgeEstado}
          ${btnListo}
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('formSolicitudEstudio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const citaId = document.getElementById('selectCitaOrigen').value;
  if (!citaId) {
    return mostrarAlerta('Por regla clínica (RN-01 / CU-07), los estudios se asignan durante una consulta activa y no sobre citas cerradas.', 'error');
  }
  const cita = listaCitasCache.find((c) => c.id === citaId);
  if (!cita) return;
  const res = await fetch(`${API_URL}/estudios/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citaId: cita.id, pacienteId: cita.pacienteId, estudioId: document.getElementById('selectEstudioClinico').value }),
  });
  if (res.ok) {
    await Promise.all([cargarEstudios(), cargarCitas()]);
    mostrarAlerta('¡Orden de estudio registrada con estado "Pendiente de resultados"!', 'exito');
  }
});

function agregarCampoMedicamento() {
  const div = document.createElement('div');
  div.className = 'med-box';
  div.innerHTML = `
    <div class="form-group"><label>Medicamento</label><input type="text" class="med-nombre" required /></div>
    <div class="form-group"><label>Dosis e Indicaciones</label><input type="text" class="med-dosis" required /></div>
    <div class="form-group"><label>Cantidad</label><input type="number" class="med-cantidad" value="1" min="1" required /></div>
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">Quitar</button>`;
  document.getElementById('contenedorMedicamentos').appendChild(div);
}

async function cargarRecetas() {
  const res = await fetch(`${API_URL}/farmacia/recetas`);
  const todas = await res.json();
  listaRecetasCache = usuarioActual ? todas.filter((r) => r.doctorId === usuarioActual.id) : todas;
  document.getElementById('kpiRecetasDoc').textContent = listaRecetasCache.length;
  renderizarTablaRecetas();
}

function renderizarTablaRecetas() {
  const filtro = document.getElementById('inputBuscarFolio').value.trim().toLowerCase();
  const filtradas = listaRecetasCache.filter((r) => r.folioFisico.toLowerCase().includes(filtro));
  document.getElementById('tablaRecetas').innerHTML = filtradas.length === 0
    ? '<tr><td colspan="4" style="text-align:center;">Sin recetas emitidas.</td></tr>'
    : filtradas.map((r) => `
      <tr>
        <td><strong>${r.folioFisico}</strong><br><small>${r.fechaEmision ? formatearFechaLocal(r.fechaEmision) : ''}</small></td>
        <td>${r.paciente ? `${r.paciente.usuario.nombre} ${r.paciente.usuario.apellidoPaterno}` : ''}</td>
        <td>${(r.detalles || []).map((d) => `• <strong>${d.medicamento}</strong> (${d.cantidadEntregar} u.) - ${d.dosis}`).join('<br>')}</td>
        <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
      </tr>`).join('');
}

document.getElementById('formReceta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cita = listaCitasCache.find((c) => c.id === document.getElementById('selectCitaReceta').value);
  if (!cita) return;
  const detalles = Array.from(document.querySelectorAll('#contenedorMedicamentos .med-box')).map((b) => ({
    medicamento: b.querySelector('.med-nombre').value.trim(),
    dosis: b.querySelector('.med-dosis').value.trim(),
    cantidadEntregar: parseInt(b.querySelector('.med-cantidad').value, 10),
  }));
  const res = await fetch(`${API_URL}/farmacia/recetas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folioFisico: document.getElementById('recFolio').value.trim(), citaId: cita.id, pacienteId: cita.pacienteId, doctorId: cita.doctorId, detalles }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message || 'El folio físico ya existe o es inválido.', 'error');
  e.target.reset();
  await cargarRecetas();
  mostrarAlerta('¡Receta emitida exitosamente!', 'exito');
});

inicializarMedico();