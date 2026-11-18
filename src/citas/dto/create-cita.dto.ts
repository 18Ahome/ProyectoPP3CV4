import {
  IsUUID,
  IsDateString,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCitaDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  pacienteId: string;

  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  @IsUUID()
  @IsNotEmpty()
  consultorioId: string;

  @ApiProperty({ example: '2026-10-23T10:30:00Z' })
  @IsDateString()
  @IsNotEmpty()
  fechaHora: string;
}

export class CancelarBloqueDoctorDto {
  @ApiProperty({ description: 'UUID del médico que cancela sus bloques de agenda' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: '2026-10-23', description: 'Fecha de los bloques a cancelar' })
  @IsString()
  @IsOptional()
  fecha?: string;

  @ApiProperty({
    type: [String],
    example: ['08:00', '08:30', '09:00'],
    description: 'Lista de bloques de 30 minutos seleccionados',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bloques?: string[];

  @ApiProperty({ example: '2026-10-27T08:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  fechaInicio?: string;

  @ApiProperty({ example: '2026-10-27T16:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  fechaFin?: string;

  @ApiProperty({ enum: ['BLOQUEADO', 'INACTIVO'], default: 'BLOQUEADO' })
  @IsIn(['BLOQUEADO', 'INACTIVO'])
  @IsOptional()
  estadoSlot?: 'BLOQUEADO' | 'INACTIVO';

  @ApiProperty({ example: 'Congreso médico / Comisión institucional' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

export class CancelarCitaDoctorDto {
  @ApiProperty({ example: 'Urgencia quirúrgica en hospitalización' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación del médico es obligatorio.' })
  motivo: string;

  @ApiProperty({ example: true, description: 'Si el médico desea reagendar la cita en este momento' })
  @IsBoolean()
  reagendar: boolean;

  @ApiProperty({
    example: '2026-10-26T10:00:00Z',
    description: 'Nueva fecha y bloque seleccionado en caso de reagendar',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  nuevaFechaHora?: string;
}

export class ResponderReubicacionDto {
  @ApiProperty({
    enum: [
      'aceptar_sustituto',
      'lista_espera',
      'aceptar_nuevo_horario',
      'rechazar_nuevo_horario',
    ],
  })
  @IsIn([
    'aceptar_sustituto',
    'lista_espera',
    'aceptar_nuevo_horario',
    'rechazar_nuevo_horario',
  ])
  accion:
    | 'aceptar_sustituto'
    | 'lista_espera'
    | 'aceptar_nuevo_horario'
    | 'rechazar_nuevo_horario';
}