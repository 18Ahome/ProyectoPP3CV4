import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { createHash } from 'crypto';
import {
  Especialidad,
  Usuario,
  Paciente,
  PersonalSalud,
  Consultorio,
  TicketSoporte,
  SistemaRol,
  CATALOGO_OFICIAL_ESPECIALIDADES,
} from './entities/catalogo.entities';
import { HorarioConsultorio } from '../citas/entities/horario-consultorio.entity';
import {
  LoginDto,
  CreateEspecialidadDto,
  CreatePacienteDto,
  ActivarCuentaPacienteDto,
  UpdateDoctorAdminDto,
  CreateDoctorDto,
  CreateEmpleadoFarmaciaDto,
  CreateConsultorioDto,
  AsignarDoctoresConsultorioDto,
  CreateTicketSoporteDto,
  ResolverTicketSoporteDto,
} from './dto/create-catalogo.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Especialidad)
    private readonly especialidadesRepository: Repository<Especialidad>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Paciente)
    private readonly pacientesRepository: Repository<Paciente>,
    @InjectRepository(PersonalSalud)
    private readonly personalSaludRepository: Repository<PersonalSalud>,
    @InjectRepository(Consultorio)
    private readonly consultoriosRepository: Repository<Consultorio>,
    @InjectRepository(HorarioConsultorio)
    private readonly horariosRepository: Repository<HorarioConsultorio>,
    @InjectRepository(TicketSoporte)
    private readonly ticketsRepository: Repository<TicketSoporte>,
  ) {}

  private encriptarPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private validarFechaNacimiento(fechaStr: string): void {
    const fechaNac = new Date(`${fechaStr}T00:00:00`);
    const hoy = new Date();
    const fechaMinima = new Date(
      hoy.getFullYear() - 100,
      hoy.getMonth(),
      hoy.getDate(),
    );

    if (fechaNac > hoy) {
      throw new BadRequestException('La fecha de nacimiento no puede ser una fecha futura.');
    }
    if (fechaNac < fechaMinima) {
      throw new BadRequestException('La fecha de nacimiento no puede tener más de 100 años.');
    }
  }

  // Validar mínimo 4 horas (240 minutos) en el horario del consultorio
  private validarDuracionMinimaConsultorio(horaInicio: string, horaFin: string): void {
    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);

    const minutosInicio = hIni * 60 + mIni;
    const minutosFin = hFin * 60 + mFin;
    const duracionMinutos = minutosFin - minutosInicio;

    if (duracionMinutos <= 0) {
      throw new BadRequestException('La hora de inicio debe ser menor que la hora de fin.');
    }
    if (duracionMinutos < 240) {
      throw new BadRequestException(
        'El horario del consultorio debe cubrir un mínimo de 4 horas de atención continua (ej. 08:00 a 12:00).',
      );
    }
  }

  // --- AUTENTICACIÓN E INICIO DE SESIÓN ---
  async login(dto: LoginDto) {
    const correoLimpio = dto.correo.trim().toLowerCase();

    const usuario = await this.usuariosRepository
      .createQueryBuilder('u')
      .addSelect('u.contraseniaHash')
      .where('LOWER(u.correo) = :correo', { correo: correoLimpio })
      .getOne();

    if (!usuario) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    if (usuario.contraseniaHash === 'CUENTA_INVITADO_SIN_ACTIVAR') {
      throw new UnauthorizedException(
        'Aún no has creado una contraseña para tu cuenta. Regístrate o activa tu cuenta primero.',
      );
    }

    const hashIngresado = this.encriptarPassword(dto.password);
    const passwordValida =
      usuario.contraseniaHash === hashIngresado ||
      usuario.contraseniaHash === dto.password;

    if (!passwordValida) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    let detallePaciente: Paciente | null = null;
    let detalleDoctor: PersonalSalud | null = null;

    if (usuario.rol === SistemaRol.PACIENTE) {
      detallePaciente = await this.pacientesRepository.findOne({
        where: { usuarioId: usuario.id },
      });
    } else if (usuario.rol === SistemaRol.DOCTOR) {
      detalleDoctor = await this.personalSaludRepository.findOne({
        where: { usuarioId: usuario.id },
      });
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno,
      correo: usuario.correo,
      rol: usuario.rol,
      paciente: detallePaciente,
      doctor: detalleDoctor,
    };
  }

  // --- ESPECIALIDADES (LISTA OFICIAL) ---
  async obtenerEspecialidades(): Promise<Especialidad[]> {
    return await this.especialidadesRepository.find({ order: { nombre: 'ASC' } });
  }

  async obtenerCatalogoOficialEspecialidades() {
    const activas = await this.especialidadesRepository.find();
    const nombresActivos = new Set(activas.map((e) => e.nombre));
    return {
      todas: CATALOGO_OFICIAL_ESPECIALIDADES,
      disponiblesParaAgregar: CATALOGO_OFICIAL_ESPECIALIDADES.filter(
        (nombre) => !nombresActivos.has(nombre),
      ),
    };
  }

  async crearEspecialidad(dto: CreateEspecialidadDto): Promise<Especialidad> {
    const nombreLimpio = dto.nombre.trim();
    const existe = await this.especialidadesRepository.findOne({
      where: { nombre: nombreLimpio },
    });
    if (existe) {
      throw new ConflictException('Esa especialidad médica ya está registrada.');
    }
    const nueva = this.especialidadesRepository.create({ nombre: nombreLimpio });
    return await this.especialidadesRepository.save(nueva);
  }

  async actualizarEspecialidad(id: string, dto: CreateEspecialidadDto): Promise<Especialidad> {
    const especialidad = await this.especialidadesRepository.findOne({ where: { id } });
    if (!especialidad) throw new NotFoundException('Especialidad no encontrada.');

    const nombreAnterior = especialidad.nombre;
    const nombreNuevo = dto.nombre.trim();

    const duplicada = await this.especialidadesRepository.findOne({
      where: { nombre: nombreNuevo, id: Not(id) },
    });
    if (duplicada) {
      throw new ConflictException('Ya existe otra especialidad con ese nombre.');
    }

    especialidad.nombre = nombreNuevo;
    const guardada = await this.especialidadesRepository.save(especialidad);

    await this.personalSaludRepository.update(
      { especialidad: nombreAnterior },
      { especialidad: nombreNuevo },
    );
    await this.consultoriosRepository.update(
      { especialidad: nombreAnterior },
      { especialidad: nombreNuevo },
    );

    return guardada;
  }

  // --- PACIENTES ---
  async obtenerPacientes(): Promise<Paciente[]> {
    return await this.pacientesRepository.find();
  }

  async crearPaciente(dto: CreatePacienteDto): Promise<Paciente> {
    this.validarFechaNacimiento(dto.fechaNacimiento);

    const existeNss = await this.pacientesRepository.findOne({
      where: { numSeguridadSocial: dto.numSeguridadSocial },
    });

    if (existeNss) {
      const usuarioInvitado = await this.usuariosRepository
        .createQueryBuilder('u')
        .addSelect('u.contraseniaHash')
        .where('u.id = :id', { id: existeNss.usuarioId })
        .getOne();

      if (
        usuarioInvitado &&
        usuarioInvitado.contraseniaHash === 'CUENTA_INVITADO_SIN_ACTIVAR'
      ) {
        const nuevoCorreo = dto.correo.trim().toLowerCase();
        const correoOcupado = await this.usuariosRepository.findOne({
          where: { correo: nuevoCorreo, id: Not(existeNss.usuarioId) },
        });
        if (correoOcupado) {
          throw new ConflictException('El correo electrónico ya está registrado en otra cuenta.');
        }

        const passwordPlana = dto.password || '123456';
        await this.usuariosRepository.update(existeNss.usuarioId, {
          nombre: dto.nombre.trim(),
          apellidoPaterno: dto.apellidoPaterno.trim(),
          apellidoMaterno: dto.apellidoMaterno?.trim() || null,
          correo: nuevoCorreo,
          contraseniaHash: this.encriptarPassword(passwordPlana),
        });

        await this.pacientesRepository.update(existeNss.usuarioId, {
          fechaNacimiento: dto.fechaNacimiento,
          telefono: `${dto.lada} ${dto.telefono}`,
        });

        return (await this.pacientesRepository.findOne({
          where: { usuarioId: existeNss.usuarioId },
        }))!;
      }

      throw new ConflictException('El Número de Seguridad Social (NSS) ya está registrado.');
    }

    const passwordPlana = dto.password || '123456';

    try {
      const nuevoUsuario = this.usuariosRepository.create({
        nombre: dto.nombre.trim(),
        apellidoPaterno: dto.apellidoPaterno.trim(),
        apellidoMaterno: dto.apellidoMaterno?.trim() || null,
        correo: dto.correo.trim().toLowerCase(),
        contraseniaHash: this.encriptarPassword(passwordPlana),
        rol: SistemaRol.PACIENTE,
      });
      const usuarioGuardado = await this.usuariosRepository.save(nuevoUsuario);

      const nuevoPaciente = this.pacientesRepository.create({
        usuarioId: usuarioGuardado.id,
        numSeguridadSocial: dto.numSeguridadSocial,
        fechaNacimiento: dto.fechaNacimiento,
        telefono: `${dto.lada} ${dto.telefono}`,
      });
      await this.pacientesRepository.save(nuevoPaciente);

      return (await this.pacientesRepository.findOne({
        where: { usuarioId: usuarioGuardado.id },
      }))!;
    } catch (error) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }
  }

  // El ADMIN NO puede modificar datos del paciente por políticas de privacidad
  async actualizarPaciente(_usuarioId: string, _dto: CreatePacienteDto): Promise<Paciente> {
    throw new BadRequestException(
      'Por políticas de privacidad, el Administrador no tiene permisos para modificar los datos personales de los pacientes.',
    );
  }

  // --- DOCTORES ---
  async obtenerDoctores(): Promise<PersonalSalud[]> {
    return await this.personalSaludRepository.find();
  }

  async crearDoctor(dto: CreateDoctorDto): Promise<PersonalSalud> {
    const espValida = await this.especialidadesRepository.findOne({
      where: { nombre: dto.especialidad },
    });
    if (!espValida) {
      throw new BadRequestException('Selecciona una especialidad válida del catálogo.');
    }

    const horaIni = (dto.horaInicioTurno || '08:00').slice(0, 5);
    const horaFin = (dto.horaFinTurno || '16:00').slice(0, 5);
    this.validarDuracionMinimaConsultorio(horaIni, horaFin);

    const existeEmp = await this.personalSaludRepository.findOne({
      where: { numEmpleado: dto.numEmpleado },
    });
    if (existeEmp) {
      throw new ConflictException('El número de empleado de 8 dígitos ya está registrado.');
    }

    const existeCedula = await this.personalSaludRepository.findOne({
      where: { cedulaProfesional: dto.cedulaProfesional },
    });
    if (existeCedula) {
      throw new ConflictException('La cédula profesional ya está registrada.');
    }

    const nombreLimpio = dto.nombre.replace(/^(Dr\.|Dra\.)\s*/i, '').trim();
    const nombreConPrefijo = `${dto.prefijo} ${nombreLimpio}`;
    const passwordPlana = dto.password || '123456';

    try {
      const nuevoUsuario = this.usuariosRepository.create({
        nombre: nombreConPrefijo,
        apellidoPaterno: dto.apellidoPaterno.trim(),
        apellidoMaterno: dto.apellidoMaterno?.trim() || null,
        correo: dto.correo.trim().toLowerCase(),
        contraseniaHash: this.encriptarPassword(passwordPlana),
        rol: SistemaRol.DOCTOR,
      });
      const usuarioGuardado = await this.usuariosRepository.save(nuevoUsuario);

      const nuevoDoctor = this.personalSaludRepository.create({
        usuarioId: usuarioGuardado.id,
        numEmpleado: dto.numEmpleado,
        cedulaProfesional: dto.cedulaProfesional,
        cedulaEspecialidad: dto.cedulaEspecialidad || null,
        especialidad: dto.especialidad,
        horaInicioTurno: `${horaIni}:00`,
        horaFinTurno: `${horaFin}:00`,
      });
      await this.personalSaludRepository.save(nuevoDoctor);

      return (await this.personalSaludRepository.findOne({
        where: { usuarioId: usuarioGuardado.id },
      }))!;
    } catch (error) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }
  }

  // El Admin NO puede modificar nombre, núm. empleado ni cédulas directamente,
  // ni cambiar la especialidad de un médico si deja a un consultorio sin médico válido
async actualizarDoctor(usuarioId: string, dto: UpdateDoctorAdminDto): Promise<PersonalSalud> {
    const doctor = await this.personalSaludRepository.findOne({ where: { usuarioId } });
    if (!doctor) throw new NotFoundException('Médico no encontrado.');

    const horaIni = (dto.horaInicioTurno || doctor.horaInicioTurno || '08:00').slice(0, 5);
    const horaFin = (dto.horaFinTurno || doctor.horaFinTurno || '16:00').slice(0, 5);
    this.validarDuracionMinimaConsultorio(horaIni, horaFin);

    const existeCorreo = await this.usuariosRepository.findOne({
      where: { correo: dto.correo.trim().toLowerCase(), id: Not(usuarioId) },
    });
    if (existeCorreo) {
      throw new ConflictException('El correo institucional ya pertenece a otro usuario.');
    }

    if (doctor.especialidad !== dto.especialidad) {
      const todosConsultorios = await this.consultoriosRepository.find();
      const consultoriosAfectados = todosConsultorios.filter((c) =>
        (c.doctoresAsignados || []).some((d) => d.usuarioId === usuarioId),
      );

      for (const cons of consultoriosAfectados) {
        const otrosMedicosMismaEsp = (cons.doctoresAsignados || []).filter(
          (d) => d.usuarioId !== usuarioId && d.especialidad === cons.especialidad,
        );
        if (otrosMedicosMismaEsp.length === 0) {
          throw new ConflictException(
            `No puedes cambiar la especialidad de este médico a "${dto.especialidad}" porque es el único especialista asignado al consultorio ${cons.numero} (${cons.especialidad}) y no puede existir consultorio sin médico.`,
          );
        }
      }
    }

    const nombreSinPrefijo = doctor.usuario.nombre.replace(/^(Dr\.|Dra\.)\s*/i, '').trim();
    const nombreConPrefijo = `${dto.prefijo} ${nombreSinPrefijo}`;

    await this.usuariosRepository.update(usuarioId, {
      nombre: nombreConPrefijo,
      correo: dto.correo.trim().toLowerCase(),
    });

    await this.personalSaludRepository.update(usuarioId, {
      especialidad: dto.especialidad,
      horaInicioTurno: `${horaIni}:00`,
      horaFinTurno: `${horaFin}:00`,
    });

    return (await this.personalSaludRepository.findOne({ where: { usuarioId } }))!;
  }

  // --- TICKETS DE SOPORTE PARA MODIFICAR CÉDULA Y NÚM. EMPLEADO ---
  async crearTicketSoporte(dto: CreateTicketSoporteDto): Promise<TicketSoporte> {
    const doctor = await this.personalSaludRepository.findOne({
      where: { usuarioId: dto.doctorId },
    });
    if (!doctor) throw new NotFoundException('Médico no encontrado.');

    if (
      !dto.nuevoNumEmpleado &&
      !dto.nuevaCedulaProfesional &&
      !dto.nuevaCedulaEspecialidad
    ) {
      throw new BadRequestException(
        'Debes indicar al menos un dato a modificar (Número de Empleado, Cédula Profesional o Cédula de Especialidad).',
      );
    }

    const ticket = this.ticketsRepository.create({
      doctorId: dto.doctorId,
      motivo: dto.motivo.trim(),
      nuevoNumEmpleado: dto.nuevoNumEmpleado || null,
      nuevaCedulaProfesional: dto.nuevaCedulaProfesional || null,
      nuevaCedulaEspecialidad: dto.nuevaCedulaEspecialidad || null,
      estado: 'pendiente',
    });

    return await this.ticketsRepository.save(ticket);
  }

  async obtenerTicketsSoporte(doctorId?: string): Promise<TicketSoporte[]> {
    if (doctorId) {
      return await this.ticketsRepository.find({
        where: { doctorId },
        order: { fechaCreacion: 'DESC' },
      });
    }
    return await this.ticketsRepository.find({
      order: { fechaCreacion: 'DESC' },
    });
  }

  async resolverTicketSoporte(
    ticketId: string,
    dto: ResolverTicketSoporteDto,
  ): Promise<TicketSoporte> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket de soporte no encontrado.');

    if (ticket.estado !== 'pendiente') {
      throw new BadRequestException('Este ticket ya fue resuelto anteriormente.');
    }

    if (dto.decision === 'aprobado') {
      if (ticket.nuevoNumEmpleado) {
        const dupEmp = await this.personalSaludRepository.findOne({
          where: {
            numEmpleado: ticket.nuevoNumEmpleado,
            usuarioId: Not(ticket.doctorId),
          },
        });
        if (dupEmp) {
          throw new ConflictException('El nuevo número de empleado ya pertenece a otro médico.');
        }
      }

      if (ticket.nuevaCedulaProfesional) {
        const dupCed = await this.personalSaludRepository.findOne({
          where: {
            cedulaProfesional: ticket.nuevaCedulaProfesional,
            usuarioId: Not(ticket.doctorId),
          },
        });
        if (dupCed) {
          throw new ConflictException('La nueva cédula profesional ya pertenece a otro médico.');
        }
      }

      const camposActualizar: Partial<PersonalSalud> = {};
      if (ticket.nuevoNumEmpleado) {
        camposActualizar.numEmpleado = ticket.nuevoNumEmpleado;
      }
      if (ticket.nuevaCedulaProfesional) {
        camposActualizar.cedulaProfesional = ticket.nuevaCedulaProfesional;
      }
      if (ticket.nuevaCedulaEspecialidad) {
        camposActualizar.cedulaEspecialidad = ticket.nuevaCedulaEspecialidad;
      }

      await this.personalSaludRepository.update(ticket.doctorId, camposActualizar);
    }

    ticket.estado = dto.decision;
    ticket.respuestaAdmin =
      dto.respuestaAdmin?.trim() ||
      (dto.decision === 'aprobado'
        ? 'Solicitud aprobada y datos actualizados en sistema.'
        : 'Solicitud rechazada por administración.');
    ticket.fechaResolucion = new Date();

    return await this.ticketsRepository.save(ticket);
  }

  // --- EMPLEADOS DE FARMACIA ---
  async obtenerEmpleadosFarmacia(): Promise<Usuario[]> {
    return await this.usuariosRepository.find({
      where: { rol: SistemaRol.EMPLEADO_FARMACIA },
      order: { nombre: 'ASC' },
    });
  }

  async crearEmpleadoFarmacia(dto: CreateEmpleadoFarmaciaDto): Promise<Usuario> {
    const passwordPlana = dto.password || '123456';
    try {
      const nuevo = this.usuariosRepository.create({
        nombre: dto.nombre.trim(),
        apellidoPaterno: dto.apellidoPaterno.trim(),
        apellidoMaterno: dto.apellidoMaterno?.trim() || null,
        correo: dto.correo.trim().toLowerCase(),
        contraseniaHash: this.encriptarPassword(passwordPlana),
        rol: SistemaRol.EMPLEADO_FARMACIA,
      });
      return await this.usuariosRepository.save(nuevo);
    } catch (error) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }
  }

  // --- CONSULTORIOS (NO PUEDE EXISTIR CONSULTORIO SIN MÉDICO DE LA MISMA ESPECIALIDAD) ---
  async obtenerConsultorios(): Promise<Consultorio[]> {
    return await this.consultoriosRepository.find({
      order: { especialidad: 'ASC', numero: 'ASC' },
    });
  }

  async crearConsultorio(dto: CreateConsultorioDto): Promise<Consultorio> {
    this.validarDuracionMinimaConsultorio(dto.horaInicio, dto.horaFin);

    if (!dto.doctoresAsignadosIds || dto.doctoresAsignadosIds.length === 0) {
      throw new BadRequestException(
        'No puede existir un consultorio sin médico. Debes asignar al menos un médico de la especialidad seleccionada.',
      );
    }

    const doctores = await this.personalSaludRepository.find({
      where: { usuarioId: In(dto.doctoresAsignadosIds) },
    });

    if (doctores.length === 0) {
      throw new BadRequestException(
        'Debes asignar al menos un médico válido al consultorio.',
      );
    }

    const medicoOtraEspecialidad = doctores.find(
      (d) => (d.especialidad || '').trim() !== dto.especialidad.trim(),
    );
    if (medicoOtraEspecialidad) {
      throw new BadRequestException(
        `El médico ${medicoOtraEspecialidad.usuario.nombre} pertenece a "${medicoOtraEspecialidad.especialidad}" y no puede asignarse a un consultorio de "${dto.especialidad}".`,
      );
    }

    const numFormateado = String(dto.numeroConsultorio).padStart(2, '0');
    const codigoConsultorio = `CONS-${dto.piso}${numFormateado}`;
    const ubicacionPiso = `Piso ${dto.piso}`;

    const existeCons = await this.consultoriosRepository.findOne({
      where: { numero: codigoConsultorio },
    });
    if (existeCons) {
      throw new ConflictException(`El consultorio ${codigoConsultorio} ya está registrado.`);
    }

    const nuevoConsultorio = this.consultoriosRepository.create({
      numero: codigoConsultorio,
      ubicacionPiso,
      especialidad: dto.especialidad,
      doctoresAsignados: doctores,
    });
    const consultorioGuardado = await this.consultoriosRepository.save(nuevoConsultorio);

    const diasUnicos = Array.from(new Set(dto.diasSemana));
    for (const dia of diasUnicos) {
      const horario = this.horariosRepository.create({
        consultorioId: consultorioGuardado.id,
        diaSemana: dia,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
      });
      await this.horariosRepository.save(horario);
    }

    return (await this.consultoriosRepository.findOne({
      where: { id: consultorioGuardado.id },
    }))!;
  }

  async actualizarConsultorio(id: string, dto: CreateConsultorioDto): Promise<Consultorio> {
    const consultorio = await this.consultoriosRepository.findOne({ where: { id } });
    if (!consultorio) throw new NotFoundException('Consultorio no encontrado.');

    this.validarDuracionMinimaConsultorio(dto.horaInicio, dto.horaFin);

    if (!dto.doctoresAsignadosIds || dto.doctoresAsignadosIds.length === 0) {
      throw new BadRequestException(
        'No puede existir un consultorio sin médico. Debes mantener al menos un médico asignado.',
      );
    }

    const doctores = await this.personalSaludRepository.find({
      where: { usuarioId: In(dto.doctoresAsignadosIds) },
    });

    if (doctores.length === 0) {
      throw new BadRequestException(
        'Debes asignar al menos un médico válido al consultorio.',
      );
    }

    const medicoOtraEspecialidad = doctores.find(
      (d) => (d.especialidad || '').trim() !== dto.especialidad.trim(),
    );
    if (medicoOtraEspecialidad) {
      throw new BadRequestException(
        `El médico ${medicoOtraEspecialidad.usuario.nombre} pertenece a "${medicoOtraEspecialidad.especialidad}" y no puede asignarse a un consultorio de "${dto.especialidad}".`,
      );
    }

    const numFormateado = String(dto.numeroConsultorio).padStart(2, '0');
    const codigoConsultorio = `CONS-${dto.piso}${numFormateado}`;
    const ubicacionPiso = `Piso ${dto.piso}`;

    const duplicado = await this.consultoriosRepository.findOne({
      where: { numero: codigoConsultorio, id: Not(id) },
    });
    if (duplicado) {
      throw new ConflictException(`El código ${codigoConsultorio} ya está ocupado.`);
    }

    consultorio.numero = codigoConsultorio;
    consultorio.ubicacionPiso = ubicacionPiso;
    consultorio.especialidad = dto.especialidad;
    consultorio.doctoresAsignados = doctores;

    await this.consultoriosRepository.save(consultorio);
    await this.horariosRepository.delete({ consultorioId: id });

    const diasUnicos = Array.from(new Set(dto.diasSemana));
    for (const dia of diasUnicos) {
      const nuevoHorario = this.horariosRepository.create({
        consultorioId: id,
        diaSemana: dia,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
      });
      await this.horariosRepository.save(nuevoHorario);
    }

    return (await this.consultoriosRepository.findOne({ where: { id } }))!;
  }

  async actualizarDoctoresConsultorio(
    consultorioId: string,
    dto: AsignarDoctoresConsultorioDto,
  ): Promise<Consultorio> {
    const consultorio = await this.consultoriosRepository.findOne({
      where: { id: consultorioId },
    });
    if (!consultorio) throw new NotFoundException('Consultorio no encontrado.');

    if (!dto.doctoresIds || dto.doctoresIds.length === 0) {
      throw new BadRequestException(
        'No puede existir un consultorio sin médico. Debes mantener al menos un médico asignado.',
      );
    }

    const doctores = await this.personalSaludRepository.find({
      where: { usuarioId: In(dto.doctoresIds) },
    });

    if (doctores.length === 0) {
      throw new BadRequestException('Debes asignar al menos un médico válido al consultorio.');
    }

    const medicoOtraEspecialidad = doctores.find(
      (d) => (d.especialidad || '').trim() !== (consultorio.especialidad || '').trim(),
    );
    if (medicoOtraEspecialidad) {
      throw new BadRequestException(
        `El médico ${medicoOtraEspecialidad.usuario.nombre} pertenece a "${medicoOtraEspecialidad.especialidad}" y no puede asignarse a un consultorio de "${consultorio.especialidad}".`,
      );
    }

    consultorio.doctoresAsignados = doctores;
    await this.consultoriosRepository.save(consultorio);

    return (await this.consultoriosRepository.findOne({
      where: { id: consultorioId },
    }))!;
  }

  // --- PACIENTE INVITADO / ACTIVACIÓN ---
  async registrarPacienteInvitado(dto: CreatePacienteDto): Promise<{
    paciente: Paciente;
    yaTeniaCuentaActiva: boolean;
    correoRegistrado: string;
  }> {
    this.validarFechaNacimiento(dto.fechaNacimiento);
    const correoLimpio = dto.correo.trim().toLowerCase();

    const pacientePorNss = await this.pacientesRepository.findOne({
      where: { numSeguridadSocial: dto.numSeguridadSocial },
    });

    if (pacientePorNss) {
      const usuarioExistente = await this.usuariosRepository
        .createQueryBuilder('u')
        .addSelect('u.contraseniaHash')
        .where('u.id = :id', { id: pacientePorNss.usuarioId })
        .getOne();

      const cuentaActiva =
        usuarioExistente?.contraseniaHash !== 'CUENTA_INVITADO_SIN_ACTIVAR';

      if (cuentaActiva && usuarioExistente) {
        return {
          paciente: pacientePorNss,
          yaTeniaCuentaActiva: true,
          correoRegistrado: usuarioExistente.correo,
        };
      }

      const correoDeOtro = await this.usuariosRepository.findOne({
        where: {
          correo: correoLimpio,
          id: Not(pacientePorNss.usuarioId),
        },
      });
      if (correoDeOtro) {
        throw new ConflictException(
          'El correo electrónico ingresado ya pertenece a otra cuenta registrada.',
        );
      }

      await this.usuariosRepository.update(pacientePorNss.usuarioId, {
        nombre: dto.nombre.trim(),
        apellidoPaterno: dto.apellidoPaterno.trim(),
        apellidoMaterno: dto.apellidoMaterno?.trim() || null,
        correo: correoLimpio,
      });

      await this.pacientesRepository.update(pacientePorNss.usuarioId, {
        fechaNacimiento: dto.fechaNacimiento,
        telefono: `${dto.lada} ${dto.telefono}`,
      });

      const pacienteActualizado = (await this.pacientesRepository.findOne({
        where: { usuarioId: pacientePorNss.usuarioId },
      }))!;

      return {
        paciente: pacienteActualizado,
        yaTeniaCuentaActiva: false,
        correoRegistrado: correoLimpio,
      };
    }

    const usuarioPorCorreo = await this.usuariosRepository.findOne({
      where: { correo: correoLimpio },
    });
    if (usuarioPorCorreo) {
      throw new ConflictException(
        'Ese correo electrónico ya está registrado con otro Número de Seguridad Social.',
      );
    }

    const nuevoUsuario = this.usuariosRepository.create({
      nombre: dto.nombre.trim(),
      apellidoPaterno: dto.apellidoPaterno.trim(),
      apellidoMaterno: dto.apellidoMaterno?.trim() || null,
      correo: correoLimpio,
      contraseniaHash: 'CUENTA_INVITADO_SIN_ACTIVAR',
      rol: SistemaRol.PACIENTE,
    });
    const usuarioGuardado = await this.usuariosRepository.save(nuevoUsuario);

    const nuevoPaciente = this.pacientesRepository.create({
      usuarioId: usuarioGuardado.id,
      numSeguridadSocial: dto.numSeguridadSocial,
      fechaNacimiento: dto.fechaNacimiento,
      telefono: `${dto.lada} ${dto.telefono}`,
    });
    await this.pacientesRepository.save(nuevoPaciente);

    const pacienteCompleto = (await this.pacientesRepository.findOne({
      where: { usuarioId: usuarioGuardado.id },
    }))!;

    return {
      paciente: pacienteCompleto,
      yaTeniaCuentaActiva: false,
      correoRegistrado: correoLimpio,
    };
  }

  async activarCuentaPaciente(
    usuarioId: string,
    dto: ActivarCuentaPacienteDto,
  ) {
    this.validarFechaNacimiento(dto.fechaNacimiento);

    const usuario = await this.usuariosRepository
      .createQueryBuilder('u')
      .addSelect('u.contraseniaHash')
      .where('u.id = :id', { id: usuarioId })
      .getOne();

    if (!usuario) {
      throw new NotFoundException('No se encontró el registro de tu cita para activar la cuenta.');
    }

    if (usuario.contraseniaHash !== 'CUENTA_INVITADO_SIN_ACTIVAR') {
      throw new BadRequestException(
        'Esta cuenta ya se encuentra activa. Por favor inicia sesión con tu contraseña.',
      );
    }

    const nuevoCorreo = dto.correo.trim().toLowerCase();

    const correoDuplicado = await this.usuariosRepository.findOne({
      where: {
        correo: nuevoCorreo,
        id: Not(usuarioId),
      },
    });
    if (correoDuplicado) {
      throw new ConflictException(
        `El correo ${nuevoCorreo} ya está ocupado por otra cuenta. Ingresa uno diferente.`,
      );
    }

    const nssDuplicado = await this.pacientesRepository.findOne({
      where: {
        numSeguridadSocial: dto.numSeguridadSocial,
        usuarioId: Not(usuarioId),
      },
    });
    if (nssDuplicado) {
      throw new ConflictException(
        'El Número de Seguridad Social ingresado ya pertenece a otro paciente.',
      );
    }

    await this.usuariosRepository.update(usuarioId, {
      nombre: dto.nombre.trim(),
      apellidoPaterno: dto.apellidoPaterno.trim(),
      apellidoMaterno: dto.apellidoMaterno?.trim() || null,
      correo: nuevoCorreo,
      contraseniaHash: this.encriptarPassword(dto.password),
    });

    await this.pacientesRepository.update(usuarioId, {
      numSeguridadSocial: dto.numSeguridadSocial,
      fechaNacimiento: dto.fechaNacimiento,
      telefono: `${dto.lada} ${dto.telefono}`,
    });

    return await this.login({
      correo: nuevoCorreo,
      password: dto.password,
    });
  }
}