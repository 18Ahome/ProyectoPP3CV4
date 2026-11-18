import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEstudioClinicoDto {
  @ApiProperty({
    description: 'Nombre del estudio clínico o de laboratorio',
    example: 'Biometría Hemática Completa',
  })
  @IsString()
  @IsNotEmpty()
  nombreEstudio: string;

  @ApiProperty({
    description: 'Descripción o indicaciones de preparación',
    example: 'Ayuno mínimo de 8 horas.',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class CreateSolicitudEstudioDto {
  @ApiProperty({
    description: 'UUID de la cita médica donde se solicita el estudio',
    example: '993bab2c-5402-4d44-8efc-026210a4582b',
  })
  @IsUUID()
  @IsNotEmpty()
  citaId: string;

  @ApiProperty({
    description: 'UUID del paciente',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  pacienteId: string;

  @ApiProperty({
    description: 'UUID del estudio clínico a realizar',
  })
  @IsUUID()
  @IsNotEmpty()
  estudioId: string;

  @ApiProperty({
    description: 'UUID de la cita programada para realizar el estudio (opcional)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  citaEstudioId?: string;
}