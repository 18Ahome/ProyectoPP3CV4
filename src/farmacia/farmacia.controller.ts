import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FarmaciaService } from './farmacia.service';
import { CreateRecetaDto, SurtirRecetaDto } from './dto/create-receta.dto';

@ApiTags('Farmacia y Recetas')
@Controller('farmacia')
export class FarmaciaController {
  constructor(private readonly farmaciaService: FarmaciaService) {}

  @Get('recetas')
  @ApiOperation({ summary: 'Listar todas las recetas médicas y sus medicamentos' })
  async obtenerTodas() {
    return await this.farmaciaService.obtenerTodas();
  }

  @Get('recetas/folio/:folio')
  @ApiOperation({ summary: 'Buscar receta por su folio físico exacto (RF-14, RF-15)' })
  @ApiParam({ name: 'folio', description: 'Folio físico impreso en papel' })
  async buscarPorFolio(@Param('folio') folio: string) {
    return await this.farmaciaService.buscarPorFolio(folio);
  }

  @Post('recetas')
  @ApiOperation({ summary: 'Emitir una nueva receta médica con medicamentos (CU-12)' })
  @ApiResponse({ status: 201, description: 'Receta emitida exitosamente.' })
  @ApiResponse({ status: 409, description: 'El folio físico ya existe.' })
  async crearReceta(@Body() dto: CreateRecetaDto) {
    return await this.farmaciaService.crearReceta(dto);
  }

  @Patch('recetas/:id/surtir')
  @ApiOperation({ summary: 'Surtir y entregar medicamentos de una receta (CU-13)' })
  @ApiParam({ name: 'id', description: 'UUID de la receta a surtir' })
  async surtirReceta(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: SurtirRecetaDto,
  ) {
    return await this.farmaciaService.surtirReceta(id, dto);
  }
}