import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EstudiosService } from './estudios.service';
import {
  CreateEstudioClinicoDto,
  CreateSolicitudEstudioDto,
} from './dto/create-estudio.dto';

@ApiTags('Estudios Clínicos')
@Controller('estudios')
export class EstudiosController {
  constructor(private readonly estudiosService: EstudiosService) {}

  @Get('catalogo')
  @ApiOperation({ summary: 'Listar el catálogo de estudios clínicos disponibles' })
  async obtenerCatalogo() {
    return await this.estudiosService.obtenerCatalogo();
  }

  @Post('catalogo')
  @ApiOperation({ summary: 'Registrar un nuevo estudio clínico en el catálogo' })
  @ApiResponse({ status: 201, description: 'Estudio clínico registrado.' })
  async crearEstudioCatalogo(@Body() dto: CreateEstudioClinicoDto) {
    return await this.estudiosService.crearEstudioCatalogo(dto);
  }

  @Get('solicitudes')
  @ApiOperation({ summary: 'Listar todas las solicitudes de estudios (CU-07, CU-09)' })
  async obtenerSolicitudes() {
    return await this.estudiosService.obtenerSolicitudes();
  }

  @Post('solicitudes')
  @ApiOperation({ summary: 'Solicitar un estudio clínico asociado a una consulta (RF-08, CU-07)' })
  @ApiResponse({ status: 201, description: 'Solicitud de estudio creada exitosamente.' })
  async crearSolicitud(@Body() dto: CreateSolicitudEstudioDto) {
    return await this.estudiosService.crearSolicitud(dto);
  }
}