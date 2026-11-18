import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCitaDto {
  @ApiProperty({
    description: 'Diagnóstico médico de la consulta (CU-06)',
    example: 'Faringitis aguda bacteriana',
  })
  @IsString()
  @IsNotEmpty()
  diagnostico: string;

  @ApiProperty({
    description: 'Observaciones adicionales e indicaciones para el paciente (CU-06)',
    example: 'Reposo por 3 días y tomar abundantes líquidos.',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
