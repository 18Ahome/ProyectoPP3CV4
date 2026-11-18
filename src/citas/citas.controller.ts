import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CitasService } from './citas.service';
import {
  CreateCitaDto,
  CancelarBloqueDoctorDto,
  CancelarCitaDoctorDto,
  ResponderReubicacionDto,
} from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

@ApiTags('Citas')
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get('slots-disponibles')
  @ApiOperation({ summary: 'Obtener horarios disponibles de 30 min para consultorio, médico y fecha' })
  @ApiQuery({ name: 'consultorioId', required: true })
  @ApiQuery({ name: 'doctorId', required: true })
  @ApiQuery({ name: 'fecha', required: true, example: '2026-10-23' })
  async obtenerSlotsDisponibles(
    @Query('consultorioId', ParseUUIDPipe) consultorioId: string,
    @Query('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('fecha') fecha: string,
  ) {
    return await this.citasService.obtenerSlotsDisponibles(
      consultorioId,
      doctorId,
      fecha,
    );
  }

  @Post('agendar')
  @ApiOperation({ summary: 'Agendar cita validando fechas pasadas, slots de 30 min y bloqueos' })
  async agendar(@Body() createCitaDto: CreateCitaDto) {
    return await this.citasService.agendarCita(createCitaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las citas ordenadas por fecha' })
  async obtenerTodas() {
    return await this.citasService.obtenerTodas();
  }

  @Get('bloqueos')
  @ApiOperation({ summary: 'Listar bloques de agenda BLOQUEADOS o INACTIVOS de los médicos' })
  async obtenerBloqueos() {
    return await this.citasService.obtenerBloqueosAgenda();
  }

  @Get('notificaciones')
  @ApiOperation({ summary: 'Obtener notificaciones automáticas no leídas de pacientes afectados' })
  @ApiQuery({ name: 'pacienteId', required: false })
  async obtenerNotificaciones(@Query('pacienteId') pacienteId?: string) {
    return await this.citasService.obtenerNotificacionesPaciente(pacienteId);
  }

  @Post('cancelar-bloque-doctor')
  @ApiOperation({ summary: 'Cancelación masiva de agenda por bloques de 30 min del médico' })
  async cancelarBloqueDoctor(@Body() dto: CancelarBloqueDoctorDto) {
    return await this.citasService.cancelarBloqueDoctor(dto);
  }

  @Patch('notificaciones/:id/responder')
  @ApiOperation({ summary: 'Confirmar médico sustituto o pasar a Lista de Espera Prioritaria' })
  async responderNotificacion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResponderReubicacionDto,
  ) {
    return await this.citasService.responderNotificacionReubicacion(id, dto);
  }

  @Patch('notificaciones/:id/leer')
  @ApiOperation({ summary: 'Marcar notificación como leída para cerrar el banner de aviso' })
  async marcarNotificacionLeida(@Param('id', ParseUUIDPipe) id: string) {
    return await this.citasService.marcarNotificacionLeida(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una cita por su ID' })
  async obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return await this.citasService.obtenerPorId(id);
  }

  @Patch(':id/diagnostico')
  @ApiOperation({ summary: 'Registrar diagnóstico y finalizar consulta médica (CU-06)' })
  async registrarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCitaDto: UpdateCitaDto,
  ) {
    return await this.citasService.registrarDiagnostico(id, updateCitaDto);
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancelación por el PACIENTE aplicando reglas de >24h, 1-24h y <1h' })
  async cancelarCita(@Param('id', ParseUUIDPipe) id: string) {
    return await this.citasService.cancelarCita(id);
  }

  @Patch(':id/cancelar-doctor')
  @ApiOperation({ summary: 'Cancelación o reagendamiento de una cita por el MÉDICO con motivo obligatorio' })
  async cancelarCitaPorDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarCitaDoctorDto,
  ) {
    return await this.citasService.cancelarCitaPorDoctor(id, dto);
  }
}