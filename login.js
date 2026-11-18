const API_URL = 'http://localhost:3000';

// --- ELEMENTOS DEL DOM ---
const doctor = document.getElementById('doctor');
const pupils = document.querySelectorAll('.pupil');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('toggle-pwd');

const regPasswordInput = document.getElementById('regPassword');
const toggleRegBtn = document.getElementById('toggle-reg-pwd');

const formLogin = document.getElementById('formLogin');
const formRegistro = document.getElementById('formRegistro');
const alertaLogin = document.getElementById('alertaLogin');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
const btnSubmitRegistro = document.getElementById('btnSubmitRegistro');
const btnHeaderSwitch = document.getElementById('btnHeaderSwitch');

// --- VALIDACIONES DE ENTRADA EN TIEMPO REAL ---
function soloLetras(input) {
  input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
}

function soloNumeros(input, maxLen) {
  input.value = input.value.replace(/\D/g, '').slice(0, maxLen);
}

// Configurar límite de 100 años para Fecha de Nacimiento
function configurarFechaNacimiento() {
  const hoy = new Date();
  const fechaLocalHoy = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const hace100Anios = new Date(hoy.getFullYear() - 100, hoy.getMonth(), hoy.getDate()).toISOString().split('T')[0];

  const inputNac = document.getElementById('regNacimiento');
  if (inputNac) {
    inputNac.min = hace100Anios;
    inputNac.max = fechaLocalHoy;
  }
}
configurarFechaNacimiento();

// --- LÓGICA DE LOS OJOS Y REACCIONES DEL DOCTOR ---
document.addEventListener('mousemove', (e) => {
  if (doctor.classList.contains('hiding')) return;
  pupils.forEach(pupil => {
    const rect = pupil.getBoundingClientRect();
    const eyeX = rect.left + rect.width / 2;
    const eyeY = rect.top + rect.height / 2;
    const radianDegrees = Math.atan2(e.pageY - eyeY, e.pageX - eyeX);
    const distance = 5; 
    const x = Math.cos(radianDegrees) * distance;
    const y = Math.sin(radianDegrees) * distance;
    pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  });
});

function conectarInteraccionPassword(inputEl, toggleEl) {
  if (!inputEl || !toggleEl) return;

  inputEl.addEventListener('focus', () => {
    if (inputEl.type === 'password') {
      doctor.classList.add('hiding');
      doctor.classList.remove('shocked');
    } else {
      doctor.classList.remove('hiding');
      doctor.classList.add('shocked');
    }
  });

  inputEl.addEventListener('blur', () => {
    doctor.classList.remove('hiding');
    doctor.classList.remove('shocked');
  });

  toggleEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (inputEl.type === 'password') {
      inputEl.type = 'text';
      doctor.classList.remove('hiding');
      doctor.classList.add('shocked');
    } else {
      inputEl.type = 'password';
      doctor.classList.remove('shocked');
      doctor.classList.add('hiding');
    }
  });
}

conectarInteraccionPassword(passwordInput, toggleBtn);
conectarInteraccionPassword(regPasswordInput, toggleRegBtn);

// --- ALTERNAR ENTRE PANEL DE LOGIN Y PANEL DE REGISTRO ---
function cambiarPanelAuth(modo) {
  alertaLogin.classList.add('hidden');
  doctor.classList.remove('hiding', 'shocked');

  const tabLogin = document.getElementById('nav-login-tab');
  const tabRegistro = document.getElementById('nav-registro-tab');

  if (modo === 'registro') {
    formLogin.classList.add('hidden');
    formLogin.classList.remove('flex');
    formRegistro.classList.remove('hidden');
    formRegistro.classList.add('flex');

    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegistro) tabRegistro.classList.add('active');

    if (btnHeaderSwitch) {
      btnHeaderSwitch.textContent = 'Ya tengo cuenta';
      btnHeaderSwitch.setAttribute('onclick', "cambiarPanelAuth('login')");
    }
  } else {
    formRegistro.classList.add('hidden');
    formRegistro.classList.remove('flex');
    formLogin.classList.remove('hidden');
    formLogin.classList.add('flex');

    if (tabRegistro) tabRegistro.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');

    if (btnHeaderSwitch) {
      btnHeaderSwitch.textContent = 'Crear cuenta de paciente';
      btnHeaderSwitch.setAttribute('onclick', "cambiarPanelAuth('registro')");
    }
  }
}

// --- GENERADOR DE CRUCES CON DEGRADADO MONOCROMÁTICO ---
const gradientFamilies = [
  "linear-gradient(45deg, #6cffd8, #66f8e7, #00d99f)",
  "linear-gradient(45deg, #a9d6ff, #41aaff, #0d00ff)",
  "linear-gradient(45deg, #bd4cff, #bd67ff, #e5b7ff)",
  "linear-gradient(45deg, #FF66C4, #ffa5db, #ff4180)",
  "linear-gradient(45deg, #ffd061, #ffd900, #fffd73)"
];

const crossesContainer = document.getElementById('crosses-bg');
const numberOfCrosses = 50;

if (crossesContainer) {
  for (let i = 0; i < numberOfCrosses; i++) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('cross-wrapper');
    
    const cross = document.createElement('span');
    cross.innerHTML = '✚'; 
    cross.classList.add('gradient-cross');
    
    const size = Math.random() * 60 + 15; 
    cross.style.fontSize = `${size}px`;
    
    const gradient = gradientFamilies[Math.floor(Math.random() * gradientFamilies.length)];
    cross.style.backgroundImage = gradient;
    
    wrapper.style.left = `${Math.random() * 100}vw`;
    
    const duration = Math.random() * 15 + 10; 
    const delay = Math.random() * -20; 
    wrapper.style.animationDuration = `${duration}s`;
    wrapper.style.animationDelay = `${delay}s`;
    
    wrapper.appendChild(cross);
    crossesContainer.appendChild(wrapper);
  }
}

// --- AUTENTICACIÓN Y REDIRECCIÓN AUTOMÁTICA POR ROL ---
function mostrarMensajeLogin(texto, tipo = 'error') {
  alertaLogin.textContent = Array.isArray(texto) ? texto.join(' | ') : texto;
  alertaLogin.className = `login-alert ${tipo}`;
  alertaLogin.classList.remove('hidden');
}

function redirigirSegunRol(user) {
  localStorage.setItem('hospital_sesion', JSON.stringify(user));

  const rutasPorRol = {
    paciente: 'paciente.html',
    doctor: 'medico.html',
    admin: 'admin.html',
    //empleado_farmacia: 'admin.html'
  };

  const destino = rutasPorRol[user.rol] || 'paciente.html';
  window.location.href = destino;
}

function llenarLoginDemo(correo) {
  cambiarPanelAuth('login');
  emailInput.value = correo;
  passwordInput.value = '123456';
  alertaLogin.classList.add('hidden');
}

// ENVÍO DE LOGIN
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertaLogin.classList.add('hidden');

  const correo = emailInput.value.trim();
  const password = passwordInput.value;

  const textoOriginal = btnSubmitLogin.textContent;
  btnSubmitLogin.textContent = 'Verificando...';
  btnSubmitLogin.disabled = true;

  try {
    const res = await fetch(`${API_URL}/catalogos/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });

    const data = await res.json();

    if (!res.ok) {
      doctor.classList.remove('hiding');
      doctor.classList.add('shocked');
      mostrarMensajeLogin(data.message || 'Credenciales incorrectas.', 'error');
      btnSubmitLogin.textContent = textoOriginal;
      btnSubmitLogin.disabled = false;
      return;
    }

    mostrarMensajeLogin(`¡Bienvenido(a), ${data.nombre}! Ingresando...`, 'success');
    setTimeout(() => redirigirSegunRol(data), 600);
  } catch (error) {
    doctor.classList.remove('hiding');
    doctor.classList.add('shocked');
    mostrarMensajeLogin('No se pudo conectar con el servidor (localhost:3000).', 'error');
    btnSubmitLogin.textContent = textoOriginal;
    btnSubmitLogin.disabled = false;
  }
});

// ENVÍO DE REGISTRO DE PACIENTE NUEVO
const EMAIL_REGEX_LOGIN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const EXTENSIONES_ERRONEAS_LOGIN = /\.(comn|comm|con|cmo|gamil|hotmial)$/i;

formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertaLogin.classList.add('hidden');

  const correo = document.getElementById('regCorreo').value.trim();
  const nss = document.getElementById('regNss').value.trim();
  const telefono = document.getElementById('regTelefono').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!EMAIL_REGEX_LOGIN.test(correo) || EXTENSIONES_ERRONEAS_LOGIN.test(correo)) {
    doctor.classList.remove('hiding');
    doctor.classList.add('shocked');
    mostrarMensajeLogin('Por favor ingresa un correo electrónico válido (revisa que no termine en .comn o .con).', 'error');
    return;
  }

  if (nss.length !== 11) {
    mostrarMensajeLogin('El NSS debe contener exactamente 11 dígitos numéricos.', 'error');
    return;
  }

  if (telefono.length !== 10) {
    mostrarMensajeLogin('El teléfono debe contener exactamente 10 dígitos numéricos.', 'error');
    return;
  }

  const textoOriginal = btnSubmitRegistro.textContent;
  btnSubmitRegistro.textContent = 'Verificando datos...';
  btnSubmitRegistro.disabled = true;

  try {
    // 1. Verificar que NSS, Correo y Teléfono no estén registrados con otro paciente
    const resLista = await fetch(`${API_URL}/catalogos/pacientes`);
    if (resLista.ok) {
      const listaPacs = await resLista.json();
      const duplicados = [];

      if (listaPacs.some(p => p.numSeguridadSocial === nss)) {
        duplicados.push('el NSS ya está registrado');
      }
      if (listaPacs.some(p => p.usuario?.correo?.toLowerCase() === correo.toLowerCase())) {
        duplicados.push('el correo electrónico ya está registrado');
      }
      if (listaPacs.some(p => (p.telefono || '').replace(/\D/g, '').slice(-10) === telefono)) {
        duplicados.push('el número de teléfono ya está registrado');
      }

      if (duplicados.length > 0) {
        doctor.classList.remove('hiding');
        doctor.classList.add('shocked');
        mostrarMensajeLogin(`No se puede crear la cuenta: ${duplicados.join(', ')}.`, 'error');
        btnSubmitRegistro.textContent = textoOriginal;
        btnSubmitRegistro.disabled = false;
        return;
      }
    }

    const body = {
      nombre: document.getElementById('regNombre').value.trim(),
      apellidoPaterno: document.getElementById('regPaterno').value.trim(),
      apellidoMaterno: document.getElementById('regMaterno').value.trim() || undefined,
      correo,
      password,
      numSeguridadSocial: nss,
      fechaNacimiento: document.getElementById('regNacimiento').value,
      lada: document.getElementById('regLada').value,
      telefono
    };

    const res = await fetch(`${API_URL}/catalogos/pacientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      doctor.classList.remove('hiding');
      doctor.classList.add('shocked');
      mostrarMensajeLogin(data.message || 'Error al registrar paciente.', 'error');
      btnSubmitRegistro.textContent = textoOriginal;
      btnSubmitRegistro.disabled = false;
      return;
    }

    mostrarMensajeLogin('¡Cuenta creada exitosamente! Ingresando a tu portal...', 'success');

    // Iniciar sesión automáticamente para obtener el usuarioId oficial
    const resLogin = await fetch(`${API_URL}/catalogos/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: body.correo, password: body.password })
    });

    if (resLogin.ok) {
      const userLogin = await resLogin.json();
      setTimeout(() => redirigirSegunRol(userLogin), 700);
    } else {
      setTimeout(() => redirigirSegunRol({
        id: data.usuarioId || data.usuario?.id || data.id,
        nombre: body.nombre,
        apellidoPaterno: body.apellidoPaterno,
        correo: body.correo,
        rol: 'paciente'
      }), 700);
    }
  } catch (error) {
    doctor.classList.remove('hiding');
    doctor.classList.add('shocked');
    mostrarMensajeLogin('No se pudo conectar con el servidor (localhost:3000).', 'error');
    btnSubmitRegistro.textContent = textoOriginal;
    btnSubmitRegistro.disabled = false;
  }
});

// --- MODALES DE CONSULTORIOS Y REGLAS EN LOGIN (MANTENIENDO EL HEADER VISIBLE) ---
const NOMBRES_DIAS_LOGIN = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };

function formatearHorariosLogin(horarios) {
  if (!horarios || horarios.length === 0) return 'Lun, Mar, Mié, Jue, Vie de 08:00 a 16:00 hrs';
  const ord = [...horarios].sort((a, b) => a.diaSemana - b.diaSemana);
  const dias = ord.map(h => NOMBRES_DIAS_LOGIN[h.diaSemana]).join(', ');
  return `${dias} de ${ord[0].horaInicio.slice(0, 5)} a ${ord[0].horaFin.slice(0, 5)} hrs`;
}

function actualizarEstadoHeaderLogin(seccionActiva) {
  const btnConsultorios = document.getElementById('nav-consultorios');
  const btnReglas = document.getElementById('nav-reglas');
  const btnSeguimiento = document.getElementById('nav-seguimiento-btn');

  if (btnConsultorios) btnConsultorios.classList.toggle('active', seccionActiva === 'consultorios');
  if (btnReglas) btnReglas.classList.toggle('active', seccionActiva === 'reglas');

  if (btnSeguimiento) {
    if (seccionActiva === 'seguimiento') {
      // Estado activo: estamos en el formulario de Login / Registro
      btnSeguimiento.className = 'text-white bg-secondary border border-secondary transition-all duration-300 px-6 py-2.5 rounded-full shadow-soft font-semibold';
    } else {
      // Estado suave cuando el usuario está viendo Consultorios o Reglas de Atención
      btnSeguimiento.className = 'text-secondary bg-secondary/5 border border-secondary/20 hover:bg-secondary hover:text-white transition-all duration-300 px-6 py-2.5 rounded-full shadow-sm font-medium';
    }
  }
}

async function abrirModalInfoLogin(tipo) {
  const overlay = document.getElementById('info-modal-overlay');
  const content = document.getElementById('info-modal-content');
  if (!overlay || !content) return;

  actualizarEstadoHeaderLogin(tipo);

  if (tipo === 'consultorios') {
    let consultorios = [];
    try {
      const res = await fetch(`${API_URL}/catalogos/consultorios`);
      if (res.ok) consultorios = await res.json();
    } catch (e) {
      consultorios = [
        { numero: 'CONS-101', ubicacionPiso: 'Piso 1', especialidad: 'Medicina General', horarios: [] },
        { numero: 'CONS-201', ubicacionPiso: 'Piso 2', especialidad: 'Cardiología', horarios: [] }
      ];
    }

    const filas = consultorios.map(c => `
      <tr class="border-b border-placeholder">
        <td class="py-3 px-4"><span class="px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary">${c.especialidad}</span></td>
        <td class="py-3 px-4 font-bold text-textMain">${c.numero} <span class="text-xs text-textSec font-normal">(${c.ubicacionPiso})</span></td>
        <td class="py-3 px-4 text-sm text-textSec">${formatearHorariosLogin(c.horarios)}</td>
      </tr>
    `).join('');

    content.innerHTML = `
      <h3 class="text-2xl font-extrabold text-textMain mb-2">🏥 Directorio de Consultorios y Horarios</h3>
      <p class="text-textSec text-sm mb-6">Consulta la ubicación y disponibilidad de nuestras especialidades médicas.</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-placeholder/70 text-textSec text-xs uppercase">
              <th class="py-3 px-4 rounded-l-xl">Especialidad</th>
              <th class="py-3 px-4">Consultorio / Piso</th>
              <th class="py-3 px-4 rounded-r-xl">Horario de Atención</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `;
  } else {
    content.innerHTML = `
      <h3 class="text-2xl font-extrabold text-textMain mb-2">📌 Reglas Oficiales de Atención y Cancelación</h3>
      <p class="text-textSec text-sm mb-6">Para garantizar un servicio puntual y sin esperas, nuestro sistema aplica las siguientes políticas:</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-5 rounded-2xl bg-success/10 border border-success/30">
          <h4 class="font-bold text-teal-900 mb-2">✅ Cancelación con &gt; 24 horas</h4>
          <p class="text-sm text-textSec">El horario se libera totalmente sin ningún cargo ni marca en el historial del paciente.</p>
        </div>
        <div class="p-5 rounded-2xl bg-warning/20 border border-warning/50">
          <h4 class="font-bold text-amber-900 mb-2">⚠️ Cancelación entre 1 y 24 horas</h4>
          <p class="text-sm text-textSec">Se registra una marca preventiva de reincidencia en el expediente de agenda.</p>
        </div>
        <div class="p-5 rounded-2xl bg-danger/10 border border-danger/30">
          <h4 class="font-bold text-danger mb-2">🚫 Cancelación &lt; 1 hora o Inasistencia</h4>
          <p class="text-sm text-textSec">Se contabiliza como sanción por inasistencia al no permitir reasignar el espacio médico.</p>
        </div>
        <div class="p-5 rounded-2xl bg-primary/10 border border-primary/30">
          <h4 class="font-bold text-primary mb-2">🩺 Reagendamiento por Médico</h4>
          <p class="text-sm text-textSec">Si tu médico debe ausentarse por urgencia, recibirás notificación inmediata y prioridad sin penalización.</p>
        </div>
      </div>
    `;
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function cerrarModalInfoLogin() {
  const overlay = document.getElementById('info-modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
  actualizarEstadoHeaderLogin('seguimiento');
}