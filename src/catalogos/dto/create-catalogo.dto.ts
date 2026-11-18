import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
  IsUUID,
  Matches,
  IsIn,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CATALOGO_OFICIAL_ESPECIALIDADES } from '../entities/catalogo.entities';

const SOLO_LETRAS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

export class LoginDto {
  @ApiProperty({ example: 'admin@hospital.com' })
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// Especialidad restringida estrictamente al catálogo oficial (ya no se escribe libremente)
export class CreateEspecialidadDto {
  @ApiProperty({ enum: CATALOGO_OFICIAL_ESPECIALIDADES, example: 'Endocrinología' })
  @IsIn(CATALOGO_OFICIAL_ESPECIALIDADES, {
    message: 'Debes seleccionar una especialidad válida del Catálogo Oficial.',
  })
  nombre: string;
}

// El Admin NO puede modificar nombre, apellidos, número de empleado ni cédulas directamente
export class UpdateDoctorAdminDto {
  @ApiProperty({ enum: ['Dr.', 'Dra.'], example: 'Dr.' })
  @IsIn(['Dr.', 'Dra.'])
  prefijo: 'Dr.' | 'Dra.';

  @ApiProperty({ example: 'roberto.doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  @IsNotEmpty()
  especialidad: string;

  @ApiProperty({ example: '08:00', required: false })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'Formato de hora inicio inválido (HH:mm)',
  })
  @IsOptional()
  horaInicioTurno?: string;

  @ApiProperty({ example: '16:00', required: false })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'Formato de hora fin inválido (HH:mm)',
  })
  @IsOptional()
  horaFinTurno?: string;
}

// Ticket levantado por el Médico para solicitar cambio de Núm. Empleado o Cédulas
export class CreateTicketSoporteDto {
  @ApiProperty({ description: 'UUID del médico que solicita el cambio' })
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: 'Error de captura inicial en mi número de cédula profesional' })
  @IsString()
  @IsNotEmpty({ message: 'Debes explicar el motivo técnico o administrativo de la modificación.' })
  motivo: string;

  @ApiProperty({ example: '00000009', required: false })
  @Matches(/^\d{8}$/, { message: 'El nuevo número de empleado debe tener 8 dígitos numéricos.' })
  @IsOptional()
  nuevoNumEmpleado?: string;

  @ApiProperty({ example: '87654321', required: false })
  @Matches(/^\d{1,8}$/, { message: 'La nueva cédula profesional debe tener máximo 8 dígitos numéricos.' })
  @IsOptional()
  nuevaCedulaProfesional?: string;

  @ApiProperty({ example: '11223344', required: false })
  @Matches(/^\d{1,8}$/, { message: 'La nueva cédula de especialidad debe tener máximo 8 dígitos numéricos.' })
  @IsOptional()
  nuevaCedulaEspecialidad?: string;
}

export class ResolverTicketSoporteDto {
  @ApiProperty({ enum: ['aprobado', 'rechazado'] })
  @IsIn(['aprobado', 'rechazado'])
  decision: 'aprobado' | 'rechazado';

  @ApiProperty({ example: 'Validado contra documento oficial de RH.', required: false })
  @IsString()
  @IsOptional()
  respuestaAdmin?: string;
}

export class CreatePacienteDto {
  @ApiProperty({ example: 'Carlos' })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El nombre solo puede contener letras, sin números ni signos.',
  })
  nombre: string;

  @ApiProperty({ example: 'Ramírez' })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El apellido paterno solo puede contener letras, sin números ni signos.',
  })
  apellidoPaterno: string;

  @ApiProperty({ example: 'López', required: false })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El apellido materno solo puede contener letras, sin números ni signos.',
  })
  @IsOptional()
  apellidoMaterno?: string;

  @ApiProperty({ example: 'carlos.paciente@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '98765432109', description: '11 dígitos numéricos' })
  @Matches(/^\d{11}$/, {
    message: 'El NSS debe contener exactamente 11 dígitos numéricos.',
  })
  numSeguridadSocial: string;

  @ApiProperty({ example: '1995-08-20' })
  @IsDateString()
  @IsNotEmpty()
  fechaNacimiento: string;

  @ApiProperty({ example: '+52' })
  @Matches(/^\+\d{1,4}$/, {
    message: 'Selecciona una lada telefónica válida (ej. +52).',
  })
  lada: string;

  @ApiProperty({ example: '5587654321', description: '10 dígitos numéricos' })
  @Matches(/^\d{10}$/, {
    message: 'El número de teléfono debe contener exactamente 10 dígitos numéricos.',
  })
  telefono: string;
}

export class CreateDoctorDto {
  @ApiProperty({ enum: ['Dr.', 'Dra.'], example: 'Dr.' })
  @IsIn(['Dr.', 'Dra.'])
  prefijo: 'Dr.' | 'Dra.';

  @ApiProperty({ example: 'Roberto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Sánchez' })
  @IsString()
  @IsNotEmpty()
  apellidoPaterno: string;

  @ApiProperty({ example: 'Vega', required: false })
  @IsString()
  @IsOptional()
  apellidoMaterno?: string;

  @ApiProperty({ example: 'roberto.doctor@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: '00000001' })
  @Matches(/^\d{8}$/, { message: 'El número de empleado debe tener 8 dígitos numéricos.' })
  numEmpleado: string;

  @ApiProperty({ example: '12345678' })
  @Matches(/^\d{1,8}$/, { message: 'La cédula profesional debe tener máximo 8 dígitos.' })
  cedulaProfesional: string;

  @ApiProperty({ example: '87654321', required: false })
  @Matches(/^\d{1,8}$/, { message: 'La cédula de especialidad debe tener máximo 8 dígitos.' })
  @IsOptional()
  cedulaEspecialidad?: string;

  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  @IsNotEmpty()
  especialidad: string;

  @ApiProperty({ example: '08:00', required: false })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'Formato de hora inicio inválido (HH:mm)',
  })
  @IsOptional()
  horaInicioTurno?: string;

  @ApiProperty({ example: '16:00', required: false })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'Formato de hora fin inválido (HH:mm)',
  })
  @IsOptional()
  horaFinTurno?: string;
}

export class CreateEmpleadoFarmaciaDto {
  @ApiProperty({ example: 'Elena' })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El nombre solo puede contener letras.',
  })
  nombre: string;

  @ApiProperty({ example: 'Torres' })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El apellido paterno solo puede contener letras.',
  })
  apellidoPaterno: string;

  @ApiProperty({ example: 'Ruiz', required: false })
  @Matches(SOLO_LETRAS_REGEX, {
    message: 'El apellido materno solo puede contener letras.',
  })
  @IsOptional()
  apellidoMaterno?: string;

  @ApiProperty({ example: 'elena.farmacia@hospital.com' })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({ example: '123456', required: false })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsOptional()
  password?: string;
}

export class CreateConsultorioDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(9)
  piso: number;

  @ApiProperty({ example: 13 })
  @IsInt()
  @Min(1)
  @Max(99)
  numeroConsultorio: number;

  @ApiProperty({ example: 'Cardiología' })
  @IsString()
  @IsNotEmpty()
  especialidad: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  doctoresAsignadosIds?: string[];

  @ApiProperty({ type: [Number], example: [1, 2, 3, 4, 5] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  diasSemana: number[];

  @ApiProperty({ example: '08:00:00' })
  @IsString()
  @IsNotEmpty()
  horaInicio: string;

  @ApiProperty({ example: '16:00:00' })
  @IsString()
  @IsNotEmpty()
  horaFin: string;
}

export class AsignarDoctoresConsultorioDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  doctoresIds: string[];
}

export class ActivarCuentaPacienteDto extends CreatePacienteDto {
  @ApiProperty({ example: 'MiPasswordSegura123', description: 'Contraseña nueva para activar la cuenta' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsNotEmpty()
  declare password: string;
}