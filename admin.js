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

let listaEspecialidadesCache = [];
let listaDoctoresCache = [];
let listaConsultoriosCache = [];

function soloLetras(input) { input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''); }
function soloNumeros(input, max) { input.value = input.value.replace(/\D/g, '').slice(0, max); }

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
  if (!horarios || horarios.length === 0) return 'Sin horario';
  const ord = [...horarios].sort((a, b) => a.diaSemana - b.diaSemana);
  return `${ord.map((h) => NOMBRES_DIAS[h.diaSemana]).join(', ')} de ${ord[0].horaInicio.slice(0, 5)} a ${ord[0].horaFin.slice(0, 5)} hrs`;
}

function validarMinimo4Horas(horaInicio, horaFin) {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1) >= 240;
}

function renderizarDoctoresDeEspecialidad(especialidadSeleccionada, claseCheckbox, idsSeleccionados = []) {
  if (!especialidadSeleccionada) {
    return '<small style="color:var(--muted)">Selecciona primero una especialidad.</small>';
  }

  const doctoresDeLaEspecialidad = (listaDoctoresCache || []).filter(
    (d) => (d.especialidad || '').trim() === especialidadSeleccionada.trim()
  );

  if (doctoresDeLaEspecialidad.length === 0) {
    return `
      <div style="padding: 0.55rem; border-radius: 8px; background: rgba(144, 12, 63, 0.08); border: 1px dashed #900C3F; color: #900C3F; font-size: 0.8rem; line-height: 1.4;">
        🚫 <strong>Sin médicos de ${especialidadSeleccionada}:</strong> No hay ningún médico registrado en esta especialidad. No es posible asignar doctores hasta dar de alta un especialista en esta área.
      </div>
    `;
  }

  return `
    <div>
      <div style="font-size: 0.75rem; font-weight: 700; color: #7400B8; background: rgba(116, 0, 184, 0.1); padding: 0.25rem 0.55rem; border-radius: 6px; margin-bottom: 0.4rem;">
        🩺 Especialistas en ${especialidadSeleccionada} (${doctoresDeLaEspecialidad.length})
      </div>
      ${doctoresDeLaEspecialidad
        .map((d) => {
          const checked = idsSeleccionados.includes(d.usuarioId) ? 'checked' : '';
          return `
            <label class="checkbox-item" style="padding-left: 0.35rem;">
              <input type="checkbox" class="${claseCheckbox}" value="${d.usuarioId}" ${checked} />
              <span>${d.usuario.nombre} ${d.usuario.apellidoPaterno} (Emp: ${d.numEmpleado})</span>
            </label>`;
        })
        .join('')}
    </div>
  `;
}

function actualizarCheckboxesDoctoresAlta() {
  const esp = document.getElementById('conEspecialidad').value;
  document.getElementById('listaCheckDoctores').innerHTML =
    renderizarDoctoresDeEspecialidad(esp, 'chk-doctor-con');

  const hayMedicos = (listaDoctoresCache || []).some(
    (d) => (d.especialidad || '').trim() === esp.trim()
  );
  const btnSubmit = document.querySelector('#formConsultorio button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = !hayMedicos;
    btnSubmit.style.opacity = hayMedicos ? '1' : '0.5';
    btnSubmit.style.cursor = hayMedicos ? 'pointer' : 'not-allowed';
  }
}

function actualizarCheckboxesDoctoresEdicion(idsPreseleccionados = []) {
  const esp = document.getElementById('editConEspecialidad').value;
  document.getElementById('editListaCheckDoctores').innerHTML =
    renderizarDoctoresDeEspecialidad(esp, 'edit-chk-doctor-con', idsPreseleccionados);

  const hayMedicos = (listaDoctoresCache || []).some(
    (d) => (d.especialidad || '').trim() === esp.trim()
  );
  const btnSubmit = document.querySelector('#formEditarConsultorio button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = !hayMedicos;
    btnSubmit.style.opacity = hayMedicos ? '1' : '0.5';
    btnSubmit.style.cursor = hayMedicos ? 'pointer' : 'not-allowed';
  }
}

function actualizarPreviewConsultorio() {
  const piso = Math.min(Math.max(parseInt(document.getElementById('conPisoNum').value, 10) || 1, 1), 9);
  const num = String(Math.min(Math.max(parseInt(document.getElementById('conNumInterno').value, 10) || 1, 1), 99)).padStart(2, '0');
  document.getElementById('conCodigoPreview').value = `CONS-${piso}${num} (Piso ${piso})`;
}

function actualizarPreviewEditarConsultorio() {
  const piso = Math.min(Math.max(parseInt(document.getElementById('editConPisoNum').value, 10) || 1, 1), 9);
  const num = String(Math.min(Math.max(parseInt(document.getElementById('editConNumInterno').value, 10) || 1, 1), 99)).padStart(2, '0');
  document.getElementById('editConCodigoPreview').value = `CONS-${piso}${num} (Piso ${piso})`;
}

function cambiarVista(vista) {
  ['catalogos', 'citas', 'estudios', 'farmacia'].forEach((v) => {
    const sec = document.getElementById(`vista${v.charAt(0).toUpperCase() + v.slice(1)}`);
    const btn = document.getElementById(`btnTab${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (sec) sec.classList.toggle('hidden', v !== vista);
    if (btn) btn.classList.toggle('active', v === vista);
  });

  const titulosAdmin = {
    catalogos: [
      'Panel de Administración y Recursos Humanos',
      'Altas de personal, consultorios, catálogos oficiales y tickets de soporte médico',
    ],
    citas: [
      'Control Global de Citas Médicas',
      'Supervisión de agenda hospitalaria, horarios locales y diagnósticos CIE-10',
    ],
    estudios: [
      'Catálogo e Historial de Estudios Clínicos',
      'Administración del catálogo de análisis especializados y órdenes solicitadas',
    ],
    farmacia: [
      'Módulo de Farmacia y Surtido de Recetas (CU-13)',
      'Validación de folios físicos impresos y control de entrega de medicamentos',
    ],
  };

  const h1 = document.querySelector('.workspace-header h1');
  const sub = document.querySelector('.workspace-header .subtitle');
  if (h1 && titulosAdmin[vista]) h1.textContent = titulosAdmin[vista][0];
  if (sub && titulosAdmin[vista]) sub.textContent = titulosAdmin[vista][1];
}

function cerrarSesion() {
  localStorage.removeItem('hospital_sesion');
  window.location.href = 'login.html';
}

const formCatalogoEstudio = document.getElementById('formCatalogoEstudio');
if (formCatalogoEstudio) {
  formCatalogoEstudio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/estudios/catalogo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreEstudio: document.getElementById('estNombre').value.trim(),
        descripcion: document.getElementById('estDescripcion').value.trim() || 'Seguir indicaciones médicas.',
      }),
    });
    const data = await res.json();
    if (!res.ok) return mostrarAlerta(data.message || 'No se pudo agregar el estudio.', 'error');
    e.target.reset();
    await cargarTodoAdmin();
    mostrarAlerta('¡Nuevo estudio clínico agregado al catálogo!', 'exito');
  });
}

async function cargarTodoAdmin() {
  const [resEsp, resOficial, resPac, resDoc, resCon, resTickets, resCit, resEst, resRec] = await Promise.all([
    fetch(`${API_URL}/catalogos/especialidades`),
    fetch(`${API_URL}/catalogos/especialidades/catalogo-oficial`),
    fetch(`${API_URL}/catalogos/pacientes`),
    fetch(`${API_URL}/catalogos/doctores`),
    fetch(`${API_URL}/catalogos/consultorios`),
    fetch(`${API_URL}/catalogos/tickets`),
    fetch(`${API_URL}/citas`),
    fetch(`${API_URL}/estudios/solicitudes`),
    fetch(`${API_URL}/farmacia/recetas`),
  ]);

  const especialidades = await resEsp.json();
  const catalogoOficial = resOficial.ok ? await resOficial.json() : { todas: [], disponiblesParaAgregar: [] };
  const pacientes = await resPac.json();
  const doctores = await resDoc.json();
  const consultorios = await resCon.json();
  const tickets = resTickets.ok ? await resTickets.json() : [];
  const citas = await resCit.json();
  const estudios = await resEst.json();
  const recetas = await resRec.json();

  listaEspecialidadesCache = especialidades;
  listaDoctoresCache = doctores;
  listaConsultoriosCache = consultorios;

  document.getElementById('kpiTotalPacientes').textContent = pacientes.length;
  document.getElementById('kpiTotalDoctores').textContent = doctores.length;
  document.getElementById('kpiTotalConsultorios').textContent = consultorios.length;
  document.getElementById('kpiTotalEspecialidades').textContent = especialidades.length;

  const opEsp = especialidades.map((e) => `<option value="${e.nombre}">${e.nombre}</option>`).join('');
  document.getElementById('docEspecialidad').innerHTML = opEsp;
  document.getElementById('editDocEspecialidad').innerHTML = opEsp;
  document.getElementById('conEspecialidad').innerHTML = opEsp;
  document.getElementById('editConEspecialidad').innerHTML = opEsp;

  const disponibles = catalogoOficial.disponiblesParaAgregar || [];
  document.getElementById('espNombreInput').innerHTML = disponibles.length === 0
    ? '<option value="">-- Todas las especialidades oficiales ya están activas --</option>'
    : disponibles.map((nombre) => `<option value="${nombre}">${nombre}</option>`).join('');

  document.getElementById('editEspNombre').innerHTML = (catalogoOficial.todas || [])
    .map((nombre) => `<option value="${nombre}">${nombre}</option>`)
    .join('');

  document.getElementById('tablaEspecialidades').innerHTML = especialidades.map((e) => `
    <tr>
      <td><strong>${e.nombre}</strong></td>
      <td><button class="btn btn-sm" onclick="abrirModalEditarEspecialidad('${e.id}')">✏️ Editar</button></td>
    </tr>`).join('');

  actualizarCheckboxesDoctoresAlta();

  const tbodyTickets = document.getElementById('tablaTicketsAdmin');
  if (!Array.isArray(tickets) || tickets.length === 0) {
    tbodyTickets.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay tickets de soporte médico registrados.</td></tr>';
  } else {
    tbodyTickets.innerHTML = tickets.map((t) => {
      const fecha = t.fechaCreacion ? t.fechaCreacion.replace('T', ' ').slice(0, 16) : '';
      const docNombre = t.doctor ? `${t.doctor.usuario.nombre} ${t.doctor.usuario.apellidoPaterno}` : t.doctorId;
      const cambios = [];
      if (t.nuevoNumEmpleado) cambios.push(`• <strong>Núm. Empleado:</strong> <code>${t.nuevoNumEmpleado}</code>`);
      if (t.nuevaCedulaProfesional) cambios.push(`• <strong>Céd. Profesional:</strong> <code>${t.nuevaCedulaProfesional}</code>`);
      if (t.nuevaCedulaEspecialidad) cambios.push(`• <strong>Céd. Especialidad:</strong> <code>${t.nuevaCedulaEspecialidad}</code>`);

      const badgeClass = t.estado === 'aprobado' ? 'badge-finalizada' : (t.estado === 'rechazado' ? 'badge-cancelada' : 'badge-pendiente');
      const acciones = t.estado === 'pendiente'
        ? `<button class="btn btn-sm btn-success" onclick="resolverTicketAdmin('${t.id}', 'aprobado')">✅ Aprobar y Actualizar</button>
           <button class="btn btn-sm btn-danger" onclick="resolverTicketAdmin('${t.id}', 'rechazado')">❌ Rechazar</button>`
        : `<small style="color:var(--muted)">${t.respuestaAdmin || 'Resuelto'}</small>`;

      return `
        <tr>
          <td><strong>${fecha}</strong></td>
          <td><strong>${docNombre}</strong><br><small>Actual Emp: ${t.doctor?.numEmpleado || ''}</small></td>
          <td>${t.motivo}</td>
          <td>${cambios.join('<br>')}</td>
          <td><span class="badge ${badgeClass}">${t.estado}</span></td>
          <td>${acciones}</td>
        </tr>`;
    }).join('');
  }

  document.getElementById('tablaDirectorioPacientes').innerHTML = pacientes.map((p) => {
    const flags = [];
    if (p.creditosConfianza !== undefined) flags.push(`<span class="badge badge-programada">💳 Créditos: ${p.creditosConfianza}</span>`);
    if (p.listaEsperaPrioritaria) flags.push('<span class="badge badge-doctor">⭐ Lista Espera Prioritaria</span>');
    if (p.flagReincidencia) flags.push(`<span class="badge badge-pendiente">⚠️ Reincidencias: ${p.conteoReincidencias}</span>`);
    if (p.conteoSanciones > 0) flags.push(`<span class="badge badge-cancelada">🚫 Sanciones: ${p.conteoSanciones}</span>`);
    return `
      <tr>
        <td><strong>${p.usuario.nombre} ${p.usuario.apellidoPaterno}</strong><br><small>${p.usuario.correo}</small></td>
        <td><code>${p.numSeguridadSocial}</code><br>${flags.join(' ') || '<small style="color:#006644">Sin penalizaciones</small>'}</td>
        <td>${p.telefono || ''}<br><small>Nac: ${p.fechaNacimiento}</small></td>
        <td><span class="badge badge-paciente">🔒 Solo lectura (Protegido)</span></td>
      </tr>`;
  }).join('');

  document.getElementById('tablaDirectorioDoctores').innerHTML = doctores.map((d) => {
    const cedEsp = d.cedulaEspecialidad ? `<br><small style="color:var(--primary)">Céd. Esp: ${d.cedulaEspecialidad}</small>` : '';
    const turno = d.horaInicioTurno && d.horaFinTurno ? `<br><small>🕒 Turno: ${d.horaInicioTurno.slice(0, 5)} - ${d.horaFinTurno.slice(0, 5)}</small>` : '';
    return `
      <tr>
        <td><strong>${d.usuario.nombre} ${d.usuario.apellidoPaterno}</strong><br><small>${d.usuario.correo}</small></td>
        <td>Emp: <code>${d.numEmpleado}</code><br><small>Céd. Prof: ${d.cedulaProfesional}</small>${cedEsp}${turno}</td>
        <td><span class="badge badge-admin">${d.especialidad}</span></td>
        <td><button class="btn btn-sm" onclick="abrirModalEditarDoctor('${d.usuarioId}')">✏️ Editar</button></td>
      </tr>`;
  }).join('');

  document.getElementById('tablaDirectorioConsultorios').innerHTML = consultorios.map((c) => `
    <tr>
      <td><span class="badge badge-admin">${c.especialidad}</span></td>
      <td><strong>${c.numero}</strong><br><small>${c.ubicacionPiso}</small></td>
      <td>${(c.doctoresAsignados || []).map((d) => `• ${d.usuario.nombre} ${d.usuario.apellidoPaterno} (${d.especialidad})`).join('<br>') || 'Sin asignar'}</td>
      <td><strong>${formatearHorarios(c.horarios)}</strong></td>
      <td><button class="btn btn-sm" onclick="abrirModalEditarConsultorio('${c.id}')">✏️ Editar</button></td>
    </tr>`).join('');

  document.getElementById('tablaCitas').innerHTML = citas.map((c) => `
    <tr>
      <td><strong>${formatearFechaLocal(c.fechaHora)}</strong></td>
      <td>${c.paciente ? `${c.paciente.usuario.nombre} ${c.paciente.usuario.apellidoPaterno}` : ''}</td>
      <td>${c.doctor ? `${c.doctor.usuario.nombre} ${c.doctor.usuario.apellidoPaterno}` : ''}</td>
      <td><span class="badge badge-${c.estado}">${c.estado}</span></td>
      <td>${c.diagnostico || 'Sin registrar'}</td>
    </tr>`).join('');

  document.getElementById('tablaSolicitudesEstudios').innerHTML = estudios.map((s) => `
    <tr>
      <td><strong>${s.fechaSolicitud ? s.fechaSolicitud.replace('T', ' ').slice(0, 16) : ''}</strong></td>
      <td>${s.paciente ? `${s.paciente.usuario.nombre} ${s.paciente.usuario.apellidoPaterno}` : ''}</td>
      <td><span class="badge badge-programada">${s.estudio?.nombreEstudio || ''}</span></td>
      <td>${s.estudio?.descripcion || ''}</td>
    </tr>`).join('');

  document.getElementById('tablaRecetas').innerHTML = recetas.map((r) => `
    <tr>
      <td><strong>${r.folioFisico}</strong></td>
      <td>${r.paciente ? `${r.paciente.usuario.nombre} ${r.paciente.usuario.apellidoPaterno}` : ''}</td>
      <td>${(r.detalles || []).map((d) => `• ${d.medicamento} (${d.cantidadEntregar})`).join('<br>')}</td>
      <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
      <td>${r.estado === 'pendiente' ? `<button class="btn btn-sm btn-success" onclick="surtirReceta('${r.id}')">Surtir</button>` : 'Entregada'}</td>
    </tr>`).join('');
}

async function resolverTicketAdmin(ticketId, decision) {
  const comentario = decision === 'aprobado'
    ? 'Aprobado por Administración tras validar documentación.'
    : prompt('Indica el motivo del rechazo (opcional):') || 'Rechazado por Administración.';

  const res = await fetch(`${API_URL}/catalogos/tickets/${ticketId}/resolver`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, respuestaAdmin: comentario }),
  });

  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  await cargarTodoAdmin();
  mostrarAlerta(
    decision === 'aprobado'
      ? '¡Ticket aprobado! El Número de Empleado / Cédula del médico ha sido actualizado.'
      : 'Ticket marcado como rechazado.',
    'exito'
  );
}

function abrirModalEditarDoctor(usuarioId) {
  const d = listaDoctoresCache.find((item) => item.usuarioId === usuarioId);
  if (!d) return;

  document.getElementById('editDocId').value = d.usuarioId;
  const esDra = d.usuario.nombre.startsWith('Dra.');
  const nombreSinPrefijo = d.usuario.nombre.replace(/^(Dr\.|Dra\.)\s*/i, '').trim();

  document.getElementById('editDocPrefijo').value = esDra ? 'Dra.' : 'Dr.';
  document.getElementById('editDocNombre').value = nombreSinPrefijo;
  document.getElementById('editDocPaterno').value = d.usuario.apellidoPaterno;
  document.getElementById('editDocMaterno').value = d.usuario.apellidoMaterno || '';
  document.getElementById('editDocCorreo').value = d.usuario.correo;
  document.getElementById('editDocEmpleado').value = d.numEmpleado || '';
  document.getElementById('editDocCedula').value = d.cedulaProfesional || '';
  document.getElementById('editDocCedulaEsp').value = d.cedulaEspecialidad || 'Sin registrar';
  document.getElementById('editDocEspecialidad').value = d.especialidad || 'Medicina General';

  const inputIni = document.getElementById('editDocHoraInicio');
  const inputFin = document.getElementById('editDocHoraFin');
  if (inputIni) inputIni.value = d.horaInicioTurno ? d.horaInicioTurno.slice(0, 5) : '08:00';
  if (inputFin) inputFin.value = d.horaFinTurno && d.horaFinTurno.slice(0, 5) !== (d.horaInicioTurno || '').slice(0, 5) ? d.horaFinTurno.slice(0, 5) : '16:00';

  document.getElementById('modalEditarDoctor').showModal();
}

document.getElementById('formEditarDoctor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editDocId').value;
  const hIni = (document.getElementById('editDocHoraInicio')?.value || '08:00').slice(0, 5);
  const hFin = (document.getElementById('editDocHoraFin')?.value || '16:00').slice(0, 5);

  if (!validarMinimo4Horas(hIni, hFin)) {
    return mostrarAlerta('El turno de atención del médico debe cubrir un mínimo de 4 horas continuas y la hora fin debe ser mayor a la hora inicio.', 'error');
  }

  const body = {
    prefijo: document.getElementById('editDocPrefijo').value,
    correo: document.getElementById('editDocCorreo').value.trim(),
    especialidad: document.getElementById('editDocEspecialidad').value,
    horaInicioTurno: hIni,
    horaFinTurno: hFin,
  };

  const res = await fetch(`${API_URL}/catalogos/doctores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  document.getElementById('modalEditarDoctor').close();
  await cargarTodoAdmin();
  mostrarAlerta('¡Datos y horario de turno del médico actualizados!', 'exito');
});

function abrirModalEditarConsultorio(id) {
  const c = listaConsultoriosCache.find((item) => item.id === id);
  if (!c) return;

  document.getElementById('editConId').value = c.id;
  const match = /^CONS-(\d)(\d{2})$/.exec(c.numero);
  document.getElementById('editConPisoNum').value = match ? parseInt(match[1], 10) : 1;
  document.getElementById('editConNumInterno').value = match ? parseInt(match[2], 10) : 1;
  actualizarPreviewEditarConsultorio();
  document.getElementById('editConEspecialidad').value = c.especialidad || 'Medicina General';

  const idsAsignados = (c.doctoresAsignados || []).map((d) => d.usuarioId);
  actualizarCheckboxesDoctoresEdicion(idsAsignados);

  const diasActivos = (c.horarios || []).map((h) => h.diaSemana);
  document.querySelectorAll('.edit-chk-dia').forEach((chk) => {
    chk.checked = diasActivos.includes(parseInt(chk.value, 10));
  });

  if (c.horarios && c.horarios.length > 0) {
    document.getElementById('editConHoraInicio').value = c.horarios[0].horaInicio.slice(0, 5);
    document.getElementById('editConHoraFin').value = c.horarios[0].horaFin.slice(0, 5);
  }
  document.getElementById('modalEditarConsultorio').showModal();
}

document.getElementById('formPaciente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch(`${API_URL}/catalogos/pacientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: document.getElementById('pacNombre').value,
      apellidoPaterno: document.getElementById('pacPaterno').value,
      apellidoMaterno: document.getElementById('pacMaterno').value || undefined,
      correo: document.getElementById('pacCorreo').value,
      password: document.getElementById('pacPassword').value,
      numSeguridadSocial: document.getElementById('pacNss').value,
      fechaNacimiento: document.getElementById('pacNacimiento').value,
      lada: document.getElementById('pacLada').value,
      telefono: document.getElementById('pacTelefono').value,
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  e.target.reset();
  await cargarTodoAdmin();
  mostrarAlerta('¡Paciente registrado exitosamente!', 'exito');
});

document.getElementById('formDoctor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hIni = (document.getElementById('docHoraInicio')?.value || '08:00').slice(0, 5);
  const hFin = (document.getElementById('docHoraFin')?.value || '16:00').slice(0, 5);

  if (!validarMinimo4Horas(hIni, hFin)) {
    return mostrarAlerta('El turno del médico debe cubrir un mínimo de 4 horas continuas (no puede ser de 08:00 a 08:00).', 'error');
  }

  const res = await fetch(`${API_URL}/catalogos/doctores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefijo: document.getElementById('docPrefijo').value,
      nombre: document.getElementById('docNombre').value,
      apellidoPaterno: document.getElementById('docPaterno').value,
      apellidoMaterno: document.getElementById('docMaterno').value || undefined,
      correo: document.getElementById('docCorreo').value,
      password: document.getElementById('docPassword').value,
      numEmpleado: document.getElementById('docEmpleado').value,
      cedulaProfesional: document.getElementById('docCedula').value,
      cedulaEspecialidad: document.getElementById('docCedulaEsp').value || undefined,
      especialidad: document.getElementById('docEspecialidad').value,
      horaInicioTurno: hIni,
      horaFinTurno: hFin,
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  e.target.reset();
  await cargarTodoAdmin();
  mostrarAlerta('¡Médico registrado exitosamente con su horario de turno!', 'exito');
});

document.getElementById('formConsultorio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hIni = document.getElementById('conHoraInicio').value;
  const hFin = document.getElementById('conHoraFin').value;
  if (!validarMinimo4Horas(hIni, hFin)) {
    return mostrarAlerta('El horario del consultorio debe cubrir un mínimo de 4 horas continuas (ej. 08:00 a 12:00).', 'error');
  }

  const doctoresAsignadosIds = Array.from(document.querySelectorAll('.chk-doctor-con:checked')).map((el) => el.value);
  if (doctoresAsignadosIds.length === 0) {
    return mostrarAlerta('No puede existir un consultorio sin médico. Debes marcar al menos un médico de la especialidad seleccionada.', 'error');
  }

  const diasSemana = Array.from(document.querySelectorAll('.chk-dia:checked')).map((el) => parseInt(el.value, 10));
  if (diasSemana.length === 0) {
    return mostrarAlerta('Selecciona al menos un día laboral para el consultorio.', 'error');
  }

  const res = await fetch(`${API_URL}/catalogos/consultorios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      piso: parseInt(document.getElementById('conPisoNum').value, 10),
      numeroConsultorio: parseInt(document.getElementById('conNumInterno').value, 10),
      especialidad: document.getElementById('conEspecialidad').value,
      doctoresAsignadosIds,
      diasSemana,
      horaInicio: `${hIni}:00`,
      horaFin: `${hFin}:00`,
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  await cargarTodoAdmin();
  mostrarAlerta(`¡Consultorio ${data.numero} registrado con su médico asignado!`, 'exito');
});

document.getElementById('formEditarConsultorio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const hIni = document.getElementById('editConHoraInicio').value;
  const hFin = document.getElementById('editConHoraFin').value;
  if (!validarMinimo4Horas(hIni, hFin)) {
    return mostrarAlerta('El horario del consultorio debe cubrir un mínimo de 4 horas continuas.', 'error');
  }

  const doctoresAsignadosIds = Array.from(document.querySelectorAll('.edit-chk-doctor-con:checked')).map((el) => el.value);
  if (doctoresAsignadosIds.length === 0) {
    return mostrarAlerta('No puede existir un consultorio sin médico. Selecciona al menos un médico de esta especialidad.', 'error');
  }

  const diasSemana = Array.from(document.querySelectorAll('.edit-chk-dia:checked')).map((el) => parseInt(el.value, 10));
  if (diasSemana.length === 0) {
    return mostrarAlerta('Selecciona al menos un día laboral para el consultorio.', 'error');
  }

  const id = document.getElementById('editConId').value;
  const res = await fetch(`${API_URL}/catalogos/consultorios/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      piso: parseInt(document.getElementById('editConPisoNum').value, 10),
      numeroConsultorio: parseInt(document.getElementById('editConNumInterno').value, 10),
      especialidad: document.getElementById('editConEspecialidad').value,
      doctoresAsignadosIds,
      diasSemana,
      horaInicio: `${hIni}:00`,
      horaFin: `${hFin}:00`,
    }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  document.getElementById('modalEditarConsultorio').close();
  await cargarTodoAdmin();
  mostrarAlerta(`¡Consultorio ${data.numero} actualizado!`, 'exito');
});

document.getElementById('formEmpleadoFarmacia').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch(`${API_URL}/catalogos/farmaceuticos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: document.getElementById('farNombre').value,
      apellidoPaterno: document.getElementById('farPaterno').value,
      apellidoMaterno: document.getElementById('farMaterno').value || undefined,
      correo: document.getElementById('farCorreo').value,
      password: document.getElementById('farPassword').value,
    }),
  });
  if (res.ok) { e.target.reset(); mostrarAlerta('¡Personal de farmacia dado de alta!', 'exito'); }
});

document.getElementById('formEspecialidad').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('espNombreInput').value;
  if (!nombre) return mostrarAlerta('Selecciona una especialidad de la lista oficial.', 'error');

  const res = await fetch(`${API_URL}/catalogos/especialidades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');
  await cargarTodoAdmin();
  mostrarAlerta(`¡Especialidad "${nombre}" activada desde el catálogo oficial!`, 'exito');
});

function abrirModalEditarEspecialidad(id) {
  const esp = listaEspecialidadesCache.find((e) => e.id === id);
  if (!esp) return;
  document.getElementById('editEspId').value = esp.id;
  document.getElementById('editEspNombre').value = esp.nombre;
  document.getElementById('modalEditarEspecialidad').showModal();
}

document.getElementById('formEditarEspecialidad').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('editEspId').value;
  const res = await fetch(`${API_URL}/catalogos/especialidades/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: document.getElementById('editEspNombre').value }),
  });
  const data = await res.json();
  if (!res.ok) return mostrarAlerta(data.message, 'error');

  document.getElementById('modalEditarEspecialidad').close();
  await cargarTodoAdmin();
  mostrarAlerta('¡Especialidad actualizada!', 'exito');
});

async function surtirReceta(id) {
  const res = await fetch(`${API_URL}/farmacia/recetas/${id}/surtir`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (res.ok) { await cargarTodoAdmin(); mostrarAlerta('¡Receta surtida!', 'exito'); }
}

cargarTodoAdmin();