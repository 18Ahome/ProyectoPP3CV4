import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  Cita,
  EstadoCita,
  BloqueoAgenda,
  NotificacionPaciente,
} from './entities/cita.entity';
import { HorarioConsultorio } from './entities/horario-consultorio.entity';
import {
  Paciente,
  PersonalSalud,
  Consultorio,
} from '../catalogos/entities/catalogo.entities';
import {
  CreateCitaDto,
  CancelarBloqueDoctorDto,
  CancelarCitaDoctorDto,
  ResponderReubicacionDto,
} from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(Cita)
    private readonly citasRepository: Repository<Cita>,
    @InjectRepository(HorarioConsultorio)
    private readonly horariosRepository: Repository<HorarioConsultorio>,
    @InjectRepository(BloqueoAgenda)
    private readonly bloqueosRepository: Repository<BloqueoAgenda>,
    @InjectRepository(NotificacionPaciente)
    private readonly notificacionesRepository: Repository<NotificacionPaciente>,
    @InjectRepository(Paciente)
    private readonly pacientesRepository: Repository<Paciente>,
    @InjectRepository(PersonalSalud)
    private readonly personalSaludRepository: Repository<PersonalSalud>,
    @InjectRepository(Consultorio)
    private readonly consultoriosRepository: Repository<Consultorio>,
  ) {}

  private obtenerDiaSemanaISO(fecha: Date): number {
    const dia = fecha.getDay();
    return dia === 0 ? 7 : dia;
  }

  private formatearHoraHHMM(fecha: Date): string {
    const h = String(fecha.getHours()).padStart(2, '0');
    const m = String(fecha.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private formatearFechaHoraLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hrs = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${anio}-${mes}-${dia} ${hrs}:${min}`;
  }

// Regla de Negocio (RN-03): Toda cita 'programada' cuenta con 30 minutos de tolerancia/atención
  // a partir de su hora de inicio antes de cerrarse automáticamente por inasistencia.
  private async cerrarCitasVencidas(): Promise<void> {
    const ahora = new Date();
    const TOLERANCIA_MINUTOS = 30;
    const programadas = await this.citasRepository.find({
      where: { estado: EstadoCita.PROGRAMADA },
    });

    for (const cita of programadas) {
      const fechaCita = new Date(cita.fechaHora);
      const limiteTolerancia = new Date(
        fechaCita.getTime() + TOLERANCIA_MINUTOS * 60 * 1000,
      );

      if (ahora > limiteTolerancia) {
        cita.estado = EstadoCita.INASISTENCIA;
        cita.tipoCancelacion = 'vencida_automatica';
        cita.motivoCancelacion =
          cita.motivoCancelacion ||
          'Cita cerrada automáticamente tras expirar los 30 minutos de tolerancia';
        await this.citasRepository.save(cita);
      }
    }
  }

  // 1. Generar bloques de 30 min cruzando Horario del Consultorio + Turno Individual del Médico
  async obtenerSlotsDisponibles(
    consultorioId: string,
    doctorId: string,
    fechaStr: string,
  ) {
    await this.cerrarCitasVencidas();

    const fechaBase = new Date(`${fechaStr}T00:00:00`);
    if (isNaN(fechaBase.getTime())) {
      throw new BadRequestException('Formato de fecha inválido.');
    }

    const diaSemana = this.obtenerDiaSemanaISO(fechaBase);

    const horariosDia = await this.horariosRepository.find({
      where: { consultorioId, diaSemana },
      order: { horaInicio: 'ASC' },
    });

    if (horariosDia.length === 0) {
      return [];
    }

    const doctor = await this.personalSaludRepository.findOne({
      where: { usuarioId: doctorId },
    });
    let inicioTurnoDoc = doctor?.horaInicioTurno
      ? doctor.horaInicioTurno.slice(0, 5)
      : '08:00';
    let finTurnoDoc = doctor?.horaFinTurno
      ? doctor.horaFinTurno.slice(0, 5)
      : '16:00';

    // Si algún registro antiguo tenía turno 08:00 a 08:00, usar horario estándar 08:00 a 16:00
    if (inicioTurnoDoc >= finTurnoDoc) {
      inicioTurnoDoc = '08:00';
      finTurnoDoc = '16:00';
    }

    const inicioDia = new Date(`${fechaStr}T00:00:00`);
    const finDia = new Date(`${fechaStr}T23:59:59`);

    const todasCitas = await this.citasRepository.find();
    const citasDelDia = todasCitas.filter((c) => {
      const f = new Date(c.fechaHora);
      const activa =
        c.estado === EstadoCita.PROGRAMADA || c.estado === EstadoCita.EN_CURSO;
      const mismoDia = f >= inicioDia && f <= finDia;
      const mismoActor =
        c.consultorioId === consultorioId || c.doctorId === doctorId;
      return activa && mismoDia && mismoActor;
    });

    const todosBloqueos = await this.bloqueosRepository.find({
      where: { doctorId },
    });
    const bloqueosDelDia = todosBloqueos.filter((b) => {
      const ini = new Date(b.fechaInicio);
      const fin = new Date(b.fechaFin);
      return ini <= finDia && fin >= inicioDia;
    });

    const ahora = new Date();
    const slots: Array<{
      hora: string;
      fechaHoraISO: string;
      disponible: boolean;
      estadoSlot: string;
    }> = [];

    for (const h of horariosDia) {
      const [hIni, mIni] = h.horaInicio.split(':').map(Number);
      const [hFin, mFin] = h.horaFin.split(':').map(Number);

      const slotActual = new Date(fechaBase);
      slotActual.setHours(hIni, mIni, 0, 0);

      const limiteFin = new Date(fechaBase);
      limiteFin.setHours(hFin, mFin, 0, 0);

      while (slotActual < limiteFin) {
        const horaStr = this.formatearHoraHHMM(slotActual);
        const finSlot = new Date(slotActual.getTime() + 30 * 60000);

        if (horaStr >= inicioTurnoDoc && horaStr < finTurnoDoc) {
          const anio = slotActual.getFullYear();
          const mes = String(slotActual.getMonth() + 1).padStart(2, '0');
          const dia = String(slotActual.getDate()).padStart(2, '0');
          const fechaHoraISO = `${anio}-${mes}-${dia}T${horaStr}:00`;

          const ocupadoPorCita = citasDelDia.some(
            (c) => new Date(c.fechaHora).getTime() === slotActual.getTime(),
          );

          const bloqueoActivo = bloqueosDelDia.find((b) => {
            const iniB = new Date(b.fechaInicio);
            const finB = new Date(b.fechaFin);
            return slotActual < finB && finSlot > iniB;
          });

          const esPasado = slotActual <= ahora;

          let disponible = true;
          let estadoSlot = 'DISPONIBLE';

          if (bloqueoActivo) {
            disponible = false;
            estadoSlot = bloqueoActivo.estado || 'BLOQUEADO';
          } else if (ocupadoPorCita) {
            disponible = false;
            estadoSlot = 'OCUPADO';
          } else if (esPasado) {
            disponible = false;
            estadoSlot = 'PASADO';
          }

          slots.push({
            hora: horaStr,
            fechaHoraISO,
            disponible,
            estadoSlot,
          });
        }

        slotActual.setMinutes(slotActual.getMinutes() + 30);
      }
    }

    return slots;
  }

  // 2. Agendar Cita con cierre previo de vencidas, Créditos, Límite de 2 Citas vigentes y Pediatría
  async agendarCita(createCitaDto: CreateCitaDto): Promise<Cita> {
    await this.cerrarCitasVencidas();

    const fechaCita = new Date(createCitaDto.fechaHora);
    if (isNaN(fechaCita.getTime())) {
      throw new BadRequestException('Fecha y hora de la cita inválidas.');
    }

    const ahora = new Date();
    if (fechaCita <= ahora) {
      throw new BadRequestException(
        'No se pueden agendar citas en fechas u horarios pasados.',
      );
    }

    const paciente = await this.pacientesRepository.findOne({
      where: { usuarioId: createCitaDto.pacienteId },
    });
    if (!paciente) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    const consultorio = await this.consultoriosRepository.findOne({
      where: { id: createCitaDto.consultorioId },
    });
    if (!consultorio) {
      throw new NotFoundException('Consultorio no encontrado.');
    }

    const doctor = await this.personalSaludRepository.findOne({
      where: { usuarioId: createCitaDto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Médico no encontrado.');
    }

    // Regla A: Validar Créditos de Confianza
    const creditosActuales = paciente.creditosConfianza ?? 100;
    if (creditosActuales <= 0) {
      throw new BadRequestException(
        'Has agotado tus Créditos de Confianza (0 pts) por cancelaciones tardías o inasistencias. Acude a ventanilla para reactivar tu cuenta.',
      );
    }

    // Regla B: Límite máximo de 2 citas activas vigentes (futuras) por paciente
    const todasDelPaciente = await this.citasRepository.find({
      where: {
        pacienteId: createCitaDto.pacienteId,
        estado: EstadoCita.PROGRAMADA,
      },
    });
    const citasVigentes = todasDelPaciente.filter(
      (c) => new Date(c.fechaHora) > ahora,
    );
    if (citasVigentes.length >= 2) {
      throw new BadRequestException(
        'Límite alcanzado: Ya tienes 2 citas activas programadas. Debes concluir o cancelar una antes de agendar otra.',
      );
    }

    // Regla C: Pediatría exclusiva para menores de 18 años
    if (
      (consultorio.especialidad || '').trim().toLowerCase() === 'pediatría' ||
      (consultorio.especialidad || '').trim().toLowerCase() === 'pediatria'
    ) {
      const fechaNac = new Date(`${paciente.fechaNacimiento}T00:00:00`);
      let edad = ahora.getFullYear() - fechaNac.getFullYear();
      const m = ahora.getMonth() - fechaNac.getMonth();
      if (m < 0 || (m === 0 && ahora.getDate() < fechaNac.getDate())) {
        edad--;
      }
      if (edad >= 18) {
        throw new BadRequestException(
          `Regla de atención: La especialidad de Pediatría es exclusiva para menores de 18 años (Edad registrada del paciente: ${edad} años).`,
        );
      }
    }

    // Validar que la hora esté dentro del horario de apertura y cierre del consultorio
    const diaSemanaCita = this.obtenerDiaSemanaISO(fechaCita);
    const horariosConsultorio = await this.horariosRepository.find({
      where: { consultorioId: createCitaDto.consultorioId, diaSemana: diaSemanaCita },
    });
    if (horariosConsultorio.length === 0) {
      throw new BadRequestException('El consultorio seleccionado no labora en ese día de la semana.');
    }

    const horaCitaHHMM = this.formatearHoraHHMM(fechaCita);
    const dentroHorarioConsultorio = horariosConsultorio.some((h) => {
      const ini = h.horaInicio.slice(0, 5);
      const fin = h.horaFin.slice(0, 5);
      return horaCitaHHMM >= ini && horaCitaHHMM < fin;
    });
    if (!dentroHorarioConsultorio) {
      throw new BadRequestException(
        'La hora seleccionada está fuera del horario de atención del consultorio.',
      );
    }

    // Regla D: Validar horario individual del médico
    const horaSolicitada = this.formatearHoraHHMM(fechaCita);
    let inicioTurnoDoc = doctor.horaInicioTurno
      ? doctor.horaInicioTurno.slice(0, 5)
      : '08:00';
    let finTurnoDoc = doctor.horaFinTurno
      ? doctor.horaFinTurno.slice(0, 5)
      : '16:00';
    if (inicioTurnoDoc >= finTurnoDoc) {
      inicioTurnoDoc = '08:00';
      finTurnoDoc = '16:00';
    }

    if (horaSolicitada < inicioTurnoDoc || horaSolicitada >= finTurnoDoc) {
      throw new BadRequestException(
        `El médico seleccionado solo atiende en el turno de ${inicioTurnoDoc} a ${finTurnoDoc} hrs.`,
      );
    }

    const finCita = new Date(fechaCita.getTime() + 30 * 60000);
    const bloqueosDoctor = await this.bloqueosRepository.find({
      where: { doctorId: createCitaDto.doctorId },
    });
    const estaBloqueado = bloqueosDoctor.some((b) => {
      const ini = new Date(b.fechaInicio);
      const fin = new Date(b.fechaFin);
      return fechaCita < fin && finCita > ini;
    });
    if (estaBloqueado) {
      throw new ConflictException(
        'El médico tiene bloqueado ese horario en su agenda.',
      );
    }

    const citasExistentes = await this.citasRepository.find({
      where: { estado: EstadoCita.PROGRAMADA },
    });
    const conflicto = citasExistentes.find(
      (c) =>
        new Date(c.fechaHora).getTime() === fechaCita.getTime() &&
        (c.doctorId === createCitaDto.doctorId ||
          c.consultorioId === createCitaDto.consultorioId ||
          c.pacienteId === createCitaDto.pacienteId),
    );
    if (conflicto) {
      throw new ConflictException(
        'Ya existe una cita programada en ese horario para el médico, consultorio o paciente.',
      );
    }

    const nuevaCita = this.citasRepository.create({
      pacienteId: createCitaDto.pacienteId,
      doctorId: createCitaDto.doctorId,
      consultorioId: createCitaDto.consultorioId,
      fechaHora: fechaCita,
      estado: EstadoCita.PROGRAMADA,
    });

    const guardada = await this.citasRepository.save(nuevaCita);
    return (await this.citasRepository.findOne({
      where: { id: guardada.id },
    }))!;
  }

  async obtenerTodas(): Promise<Cita[]> {
    await this.cerrarCitasVencidas();
    return await this.citasRepository.find({
      order: { fechaHora: 'ASC' },
    });
  }

  async obtenerBloqueosAgenda(): Promise<BloqueoAgenda[]> {
    return await this.bloqueosRepository.find({
      order: { fechaInicio: 'DESC' },
    });
  }

  async obtenerNotificacionesPaciente(
    pacienteId?: string,
  ): Promise<NotificacionPaciente[]> {
    if (pacienteId) {
      return await this.notificacionesRepository.find({
        where: { pacienteId, leida: false },
        order: { fechaCreacion: 'DESC' },
      });
    }
    return await this.notificacionesRepository.find({
      order: { fechaCreacion: 'DESC' },
    });
  }

async registrarDiagnostico(
    id: string,
    updateCitaDto: UpdateCitaDto,
  ): Promise<Cita> {
    const cita = await this.citasRepository.findOne({ where: { id } });
    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    if (cita.estado !== EstadoCita.PROGRAMADA && cita.estado !== EstadoCita.EN_CURSO) {
      throw new BadRequestException(
        'Solo se puede registrar el diagnóstico de una cita que esté programada o en curso.',
      );
    }

    const ahora = new Date();
    const fechaHoraCita = new Date(cita.fechaHora);
    const inicioPermitido = new Date(fechaHoraCita.getTime() - 10 * 60 * 1000); // 10 min de cortesía antes

    if (ahora < inicioPermitido) {
      const horaProgramada = this.formatearFechaHoraLocal(fechaHoraCita);
      throw new BadRequestException(
        `Aún no puedes atender esta consulta. La atención se habilita 10 minutos antes de la hora programada (${horaProgramada} hrs).`,
      );
    }

    const diagLimpio = (updateCitaDto.diagnostico || '').trim();
    if (!diagLimpio) {
      throw new BadRequestException(
        'Debes seleccionar un código de diagnóstico oficial CIE-10 / CIE-11.',
      );
    }

    cita.diagnostico = diagLimpio;
    cita.observaciones = updateCitaDto.observaciones?.trim() || 'Sin indicaciones adicionales';
    cita.estado = EstadoCita.FINALIZADA;

    await this.citasRepository.save(cita);
    return (await this.citasRepository.findOne({ where: { id } }))!;
  }

  // 3. Cancelación por el Paciente con descuento de Créditos de Confianza
  async cancelarCita(id: string) {
    const cita = await this.citasRepository.findOne({ where: { id } });
    if (!cita) {
      throw new NotFoundException('Cita no encontrada.');
    }

    if (cita.estado !== EstadoCita.PROGRAMADA) {
      throw new BadRequestException(
        'Solo se pueden cancelar citas que estén en estado programada.',
      );
    }

    const ahora = new Date();
    const fechaCita = new Date(cita.fechaHora);
    const horasAnticipacion =
      (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    const paciente = await this.pacientesRepository.findOne({
      where: { usuarioId: cita.pacienteId },
    });

    let avisoRegla =
      'Cita cancelada con más de 24 horas de anticipación. Horario liberado sin penalización en tus Créditos de Confianza.';

    if (horasAnticipacion < 1) {
      cita.estado = EstadoCita.INASISTENCIA;
      cita.tipoCancelacion = 'sancion_inasistencia';
      cita.motivoCancelacion =
        'Cancelación con menos de 1 hora de anticipación (-30 créditos)';

      if (paciente) {
        paciente.conteoSanciones = (paciente.conteoSanciones || 0) + 1;
        paciente.creditosConfianza = Math.max(
          0,
          (paciente.creditosConfianza ?? 100) - 30,
        );
        await this.pacientesRepository.save(paciente);
        avisoRegla = `Cancelación con menos de 1 hora: Se registró una sanción y se descontaron 30 Créditos de Confianza (Créditos restantes: ${paciente.creditosConfianza}).`;
      }
    } else if (horasAnticipacion <= 24) {
      cita.estado = EstadoCita.CANCELADA;
      cita.tipoCancelacion = 'cancelacion_tardia';
      cita.motivoCancelacion =
        'Cancelación tardía entre 1 y 24 horas (-15 créditos)';

      if (paciente) {
        paciente.flagReincidencia = true;
        paciente.conteoReincidencias = (paciente.conteoReincidencias || 0) + 1;
        paciente.creditosConfianza = Math.max(
          0,
          (paciente.creditosConfianza ?? 100) - 15,
        );
        await this.pacientesRepository.save(paciente);
        avisoRegla = `Cancelación entre 1 y 24 horas: Se registró reincidencia y se descontaron 15 Créditos de Confianza (Créditos restantes: ${paciente.creditosConfianza}).`;
      }
    } else {
      cita.estado = EstadoCita.CANCELADA;
      cita.tipoCancelacion = 'liberacion_total';
      cita.motivoCancelacion = 'Cancelada por el paciente con >24h de anticipación';
    }

    await this.citasRepository.save(cita);
    return {
      cita,
      avisoRegla,
    };
  }

  // 4. Cancelación o Reagendamiento por el Médico (Sin afectar créditos del paciente)
  async cancelarCitaPorDoctor(id: string, dto: CancelarCitaDoctorDto) {
    const cita = await this.citasRepository.findOne({ where: { id } });
    if (!cita) throw new NotFoundException('Cita no encontrada.');

    const fechaAnterior = new Date(cita.fechaHora);
    const fechaAnteriorStr = this.formatearFechaHoraLocal(fechaAnterior);

    // CASO A: El médico REAGENDA la cita a un nuevo horario (ej. por estudios pendientes)
    // -> El horario anterior (ej. 13:00) NO se bloquea; queda LIBRE (DISPONIBLE) inmediatamente.
    if (dto.reagendar && dto.nuevaFechaHora) {
      const nuevaFecha = new Date(dto.nuevaFechaHora);

      // Si existía algún bloqueo accidental en el horario anterior, lo limpiamos para liberarlo
      await this.bloqueosRepository.delete({
        doctorId: cita.doctorId,
        fechaInicio: fechaAnterior,
      });

      cita.fechaHora = nuevaFecha;
      cita.estado = EstadoCita.PROGRAMADA;
      cita.motivoCancelacion = `Reagendada por médico (Antes: ${fechaAnteriorStr}). Motivo: ${dto.motivo}`;
      cita.tipoCancelacion = 'reagendada_por_medico';
      cita.estadoReubicacion = 'pendiente_confirmacion_horario';
      await this.citasRepository.save(cita);

      const nuevaFechaStr = this.formatearFechaHoraLocal(nuevaFecha);
      await this.notificacionesRepository.save(
        this.notificacionesRepository.create({
          pacienteId: cita.pacienteId,
          citaId: cita.id,
          mensaje: `🩺 Tu médico reprogramó tu cita del ${fechaAnteriorStr} al nuevo horario ${nuevaFechaStr}. Motivo: "${dto.motivo}". Tus créditos de confianza están intactos. ¿Confirmas que puedes asistir?`,
          requiereConfirmacion: true,
        }),
      );

      return {
        mensaje:
          'Cita reagendada exitosamente. El horario anterior quedó liberado y se notificó al paciente.',
        cita,
      };
    }

    // CASO B: El médico CANCELA la cita por ausencia/urgencia sin reagendar
    // -> Se bloquea ese slot de 30 min para que otro paciente no lo ocupe durante la ausencia del médico.
    const finBloqueo = new Date(fechaAnterior.getTime() + 30 * 60000);
    await this.bloqueosRepository.save(
      this.bloqueosRepository.create({
        doctorId: cita.doctorId,
        fechaInicio: fechaAnterior,
        fechaFin: finBloqueo,
        estado: 'BLOQUEADO',
        motivo: dto.motivo,
      }),
    );

    cita.estado = EstadoCita.CANCELADA_MEDICO;
    cita.motivoCancelacion = dto.motivo;
    cita.tipoCancelacion = 'cancelada_por_medico';
    cita.estadoReubicacion = 'lista_espera_prioritaria';
    await this.citasRepository.save(cita);

    await this.pacientesRepository.update(cita.pacienteId, {
      listaEsperaPrioritaria: true,
    });

    await this.notificacionesRepository.save(
      this.notificacionesRepository.create({
        pacienteId: cita.pacienteId,
        citaId: cita.id,
        mensaje: `⚠️ Tu cita del ${fechaAnteriorStr} fue cancelada por causas médicas ("${dto.motivo}"). Tus créditos están intactos y se te asignó Prioridad en Lista de Espera.`,
        requiereConfirmacion: false,
      }),
    );

    return {
      mensaje:
        'Cita cancelada por ausencia médica, horario bloqueado y paciente notificado sin penalización.',
      cita,
    };
  }

  async cancelarBloqueDoctor(dto: CancelarBloqueDoctorDto) {
    let bloquesCreados = 0;
    let citasAfectadas = 0;
    const listaBloques = dto.bloques || [];

    for (const hora of listaBloques) {
      const inicio = new Date(`${dto.fecha}T${hora}:00`);
      const fin = new Date(inicio.getTime() + 30 * 60000);

      await this.bloqueosRepository.save(
        this.bloqueosRepository.create({
          doctorId: dto.doctorId,
          fechaInicio: inicio,
          fechaFin: fin,
          estado: dto.estadoSlot,
          motivo: dto.motivo,
        }),
      );
      bloquesCreados++;

      const todas = await this.citasRepository.find({
        where: { doctorId: dto.doctorId, estado: EstadoCita.PROGRAMADA },
      });
      const citasEnBloque = todas.filter(
        (c) => new Date(c.fechaHora).getTime() === inicio.getTime(),
      );

      for (const cita of citasEnBloque) {
        cita.estado = EstadoCita.CANCELADA_MEDICO;
        cita.motivoCancelacion = dto.motivo;
        cita.tipoCancelacion = 'cancelada_por_medico';
        await this.citasRepository.save(cita);

        await this.pacientesRepository.update(cita.pacienteId, {
          listaEsperaPrioritaria: true,
        });

        await this.notificacionesRepository.save(
          this.notificacionesRepository.create({
            pacienteId: cita.pacienteId,
            citaId: cita.id,
            mensaje: `⚠️ Tu cita del ${dto.fecha} a las ${hora} fue cancelada por ausencia médica ("${dto.motivo}"). Tus créditos están intactos y cuentas con prioridad para reagendar.`,
            requiereConfirmacion: false,
          }),
        );
        citasAfectadas++;
      }
    }

    return {
      mensaje: `Se bloquearon ${bloquesCreados} bloques de 30 min y se notificó a ${citasAfectadas} paciente(s).`,
    };
  }

  async responderNotificacionReubicacion(
    notificacionId: string,
    dto: ResponderReubicacionDto,
  ) {
    const notif = await this.notificacionesRepository.findOne({
      where: { id: notificacionId },
    });
    if (!notif) throw new NotFoundException('Notificación no encontrada.');

    const cita = await this.citasRepository.findOne({
      where: { id: notif.citaId },
    });

    if (cita) {
      if (
        dto.accion === 'lista_espera' ||
        dto.accion === 'rechazar_nuevo_horario'
      ) {
        cita.estado = EstadoCita.CANCELADA_MEDICO;
        cita.estadoReubicacion = 'lista_espera_prioritaria';
        await this.citasRepository.save(cita);
        await this.pacientesRepository.update(cita.pacienteId, {
          listaEsperaPrioritaria: true,
        });
      } else if (dto.accion === 'aceptar_sustituto' && notif.doctorSustitutoId) {
        cita.doctorId = notif.doctorSustitutoId;
        cita.estadoReubicacion = 'confirmado_sustituto';
        await this.citasRepository.save(cita);
      } else {
        cita.estadoReubicacion = 'confirmado_nuevo_horario';
        await this.citasRepository.save(cita);
      }
    }

    notif.leida = true;
    notif.requiereConfirmacion = false;
    await this.notificacionesRepository.save(notif);

    return { mensaje: 'Respuesta registrada exitosamente.' };
  }

  async marcarNotificacionLeida(notificacionId: string) {
    await this.notificacionesRepository.update(notificacionId, { leida: true });
    return { leida: true };
  }

  async obtenerPorId(id: string): Promise<Cita> {
    const cita = await this.citasRepository.findOne({ where: { id } });
    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada.`);
    }
    return cita;
  }
}

