import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DetalleRecetaItemDto {
  @ApiProperty({ example: 'Amoxicilina 500mg' })
  @IsString()
  @IsNotEmpty()
  medicamento: string;

  @ApiProperty({ example: '1 cápsula cada 8 horas por 7 días' })
  @IsString()
  @IsNotEmpty()
  dosis: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  cantidadEntregar: number;
}

export class CreateRecetaDto {
  @ApiProperty({
    description: 'Folio físico único impreso en la receta (RF-14, RF-15)',
    example: 'FOL-2026-001',
  })
  @IsString()
  @IsNotEmpty()
  folioFisico: string;

  @ApiProperty({
    description: 'UUID de la cita médica origen',
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
    description: 'UUID del médico que emite la receta',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({
    type: [DetalleRecetaItemDto],
    description: 'Lista de medicamentos recetados',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleRecetaItemDto)
  detalles: DetalleRecetaItemDto[];
}

export class SurtirRecetaDto {
  @ApiProperty({
    description: 'UUID del empleado de farmacia que entrega los medicamentos (opcional)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  empleadoFarmaciaId?: string;
}