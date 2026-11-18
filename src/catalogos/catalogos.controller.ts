import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
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

@ApiTags('Catálogos y Autenticación')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Post('auth/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión y obtener perfil según el rol' })
  async login(@Body() dto: LoginDto) {
    return await this.catalogosService.login(dto);
  }

  @Get('especialidades')
  @ApiOperation({ summary: 'Listar especialidades médicas activas' })
  async obtenerEspecialidades() {
    return await this.catalogosService.obtenerEspecialidades();
  }

  @Get('especialidades/catalogo-oficial')
  @ApiOperation({ summary: 'Obtener lista oficial predefinida de especialidades médicas' })
  async obtenerCatalogoOficialEspecialidades() {
    return await this.catalogosService.obtenerCatalogoOficialEspecialidades();
  }

  @Post('especialidades')
  @ApiOperation({ summary: 'Agregar nueva especialidad de la lista oficial (Solo Admin)' })
  async crearEspecialidad(@Body() dto: CreateEspecialidadDto) {
    return await this.catalogosService.crearEspecialidad(dto);
  }

  @Patch('especialidades/:id')
  @ApiOperation({ summary: 'Modificar nombre de una especialidad (Solo Admin)' })
  async actualizarEspecialidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEspecialidadDto,
  ) {
    return await this.catalogosService.actualizarEspecialidad(id, dto);
  }

  @Get('pacientes')
  @ApiOperation({ summary: 'Listar todos los pacientes' })
  async obtenerPacientes() {
    return await this.catalogosService.obtenerPacientes();
  }

  @Post('pacientes')
  @ApiOperation({ summary: 'Registrar paciente' })
  async crearPaciente(@Body() dto: CreatePacienteDto) {
    return await this.catalogosService.crearPaciente(dto);
  }

  @Post('pacientes/invitado')
  @ApiOperation({ summary: 'Pre-registrar paciente invitado al agendar sin sesión' })
  async registrarPacienteInvitado(@Body() dto: CreatePacienteDto) {
    return await this.catalogosService.registrarPacienteInvitado(dto);
  }

  @Patch('auth/activar-cuenta/:id')
  @ApiOperation({ summary: 'Activar cuenta desde Login.html con prellenado y nueva contraseña' })
  async activarCuentaPaciente(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivarCuentaPacienteDto,
  ) {
    return await this.catalogosService.activarCuentaPaciente(id, dto);
  }

  @Patch('pacientes/:id')
  @ApiOperation({ summary: 'Modificar datos del paciente (Bloqueado para Admin por privacidad)' })
  async actualizarPaciente(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePacienteDto,
  ) {
    return await this.catalogosService.actualizarPaciente(id, dto);
  }

  @Get('doctores')
  @ApiOperation({ summary: 'Listar todos los doctores' })
  async obtenerDoctores() {
    return await this.catalogosService.obtenerDoctores();
  }

  @Post('doctores')
  @ApiOperation({ summary: 'Alta de médico por Admin/RH' })
  async crearDoctor(@Body() dto: CreateDoctorDto) {
    return await this.catalogosService.crearDoctor(dto);
  }

  @Patch('doctores/:id')
  @ApiOperation({ summary: 'Modificar correo o especialidad (Nombre, Empleado y Cédulas protegidos)' })
  async actualizarDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorAdminDto,
  ) {
    return await this.catalogosService.actualizarDoctor(id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Listar tickets de soporte técnico para cédulas y núm. de empleado' })
  @ApiQuery({ name: 'doctorId', required: false })
  async obtenerTickets(@Query('doctorId') doctorId?: string) {
    return await this.catalogosService.obtenerTicketsSoporte(doctorId);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Médico crea ticket de soporte solicitando cambio de Cédula o Núm. Empleado' })
  async crearTicket(@Body() dto: CreateTicketSoporteDto) {
    return await this.catalogosService.crearTicketSoporte(dto);
  }

  @Patch('tickets/:id/resolver')
  @ApiOperation({ summary: 'Admin aprueba/rechaza ticket (Aprobación actualiza cédula o núm. empleado)' })
  async resolverTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverTicketSoporteDto,
  ) {
    return await this.catalogosService.resolverTicketSoporte(id, dto);
  }

  @Get('farmaceuticos')
  @ApiOperation({ summary: 'Listar empleados de farmacia' })
  async obtenerEmpleadosFarmacia() {
    return await this.catalogosService.obtenerEmpleadosFarmacia();
  }

  @Post('farmaceuticos')
  @ApiOperation({ summary: 'Alta de empleado de farmacia (Solo Admin/RH)' })
  async crearEmpleadoFarmacia(@Body() dto: CreateEmpleadoFarmaciaDto) {
    return await this.catalogosService.crearEmpleadoFarmacia(dto);
  }

  @Get('consultorios')
  @ApiOperation({ summary: 'Listar consultorios agrupados por especialidad' })
  async obtenerConsultorios() {
    return await this.catalogosService.obtenerConsultorios();
  }

  @Post('consultorios')
  @ApiOperation({ summary: 'Crear consultorio con mínimo 4 horas, médico obligatorio y formato CONS-PXX' })
  async crearConsultorio(@Body() dto: CreateConsultorioDto) {
    return await this.catalogosService.crearConsultorio(dto);
  }

  @Patch('consultorios/:id')
  @ApiOperation({ summary: 'Modificar consultorio completo (Mínimo 4 hrs y médico obligatorio)' })
  async actualizarConsultorio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsultorioDto,
  ) {
    return await this.catalogosService.actualizarConsultorio(id, dto);
  }

  @Patch('consultorios/:id/doctores')
  @ApiOperation({ summary: 'Asignar o actualizar médicos de la misma especialidad en el consultorio' })
  async actualizarDoctoresConsultorio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarDoctoresConsultorioDto,
  ) {
    return await this.catalogosService.actualizarDoctoresConsultorio(id, dto);
  }
}