import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
} from 'typeorm';
import { HorarioConsultorio } from '../../citas/entities/horario-consultorio.entity';

export enum SistemaRol {
  PACIENTE = 'paciente',
  DOCTOR = 'doctor',
  EMPLEADO_FARMACIA = 'empleado_farmacia',
  ADMIN = 'admin',
}

@Entity('especialidades')
export class Especialidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  nombre: string;
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'apellido_paterno', length: 50 })
  apellidoPaterno: string;

  @Column({ name: 'apellido_materno', type: 'varchar', length: 50, nullable: true })
  apellidoMaterno: string | null;

  @Column({ length: 100, unique: true })
  correo: string;

  @Column({ name: 'contrasenia_hash', select: false })
  contraseniaHash: string;

  @Column({
    type: 'enum',
    enum: SistemaRol,
    enumName: 'sistema_rol',
  })
  rol: SistemaRol;
}

@Entity('pacientes')
export class Paciente {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'num_seguridad_social', length: 20 })
  numSeguridadSocial: string;

  @Column({ name: 'fecha_nacimiento', type: 'date' })
  fechaNacimiento: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ name: 'flag_reincidencia', type: 'boolean', default: false })
  flagReincidencia: boolean;

  @Column({ name: 'conteo_reincidencias', type: 'int', default: 0 })
  conteoReincidencias: number;

  @Column({ name: 'conteo_sanciones', type: 'int', default: 0 })
  conteoSanciones: number;

  @Column({ name: 'lista_espera_prioritaria', type: 'boolean', default: false })
  listaEsperaPrioritaria: boolean;

  @OneToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'creditos_confianza', type: 'int', default: 100 })
  creditosConfianza: number;
}

@Entity('personal_salud')
export class PersonalSalud {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'num_empleado', length: 20 })
  numEmpleado: string;

  @Column({ name: 'cedula_profesional', type: 'varchar', length: 8, nullable: true })
  cedulaProfesional: string | null;

  @Column({ name: 'cedula_especialidad', type: 'varchar', length: 8, nullable: true })
  cedulaEspecialidad: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  especialidad: string | null;

  @OneToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'hora_inicio_turno', type: 'time', default: '08:00:00' })
  horaInicioTurno: string;

  @Column({ name: 'hora_fin_turno', type: 'time', default: '16:00:00' })
  horaFinTurno: string;
}

@Entity('consultorios')
export class Consultorio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  numero: string;

  @Column({ name: 'ubicacion_piso', length: 50 })
  ubicacionPiso: string;

  @Column({ length: 100, default: 'Medicina General' })
  especialidad: string;

  @ManyToMany(() => PersonalSalud, { eager: true })
  @JoinTable({
    name: 'consultorios_doctores',
    joinColumn: { name: 'consultorio_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'doctor_id', referencedColumnName: 'usuarioId' },
  })
  doctoresAsignados: PersonalSalud[];

  @OneToMany(() => HorarioConsultorio, (horario) => horario.consultorio, {
    eager: true,
  })
  horarios: HorarioConsultorio[];
}

// Catálogo Oficial Ampliado de Especialidades Médicas (No se escriben manualmente)
export const CATALOGO_OFICIAL_ESPECIALIDADES = [
  'Medicina General',
  'Cardiología',
  'Pediatría',
  'Ginecología y Obstetricia',
  'Traumatología y Ortopedia',
  'Dermatología',
  'Oftalmología',
  'Neurología',
  'Medicina Interna',
  'Endocrinología',
  'Gastroenterología',
  'Nefrología',
  'Neumología',
  'Oncología Médica',
  'Otorrinolaringología',
  'Psiquiatría',
  'Reumatología',
  'Urología',
  'Angiología y Cirugía Vascular',
  'Geriatría',
  'Infectología',
  'Alergología e Inmunología',
  'Hematología',
  'Cirugía General',
  'Cirugía Plástica y Reconstructiva',
  'Medicina Física y Rehabilitación',
] as const;

@Entity('tickets_soporte')
export class TicketSoporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => PersonalSalud, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: PersonalSalud;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ name: 'nuevo_num_empleado', type: 'varchar', length: 8, nullable: true })
  nuevoNumEmpleado: string | null;

  @Column({ name: 'nueva_cedula_profesional', type: 'varchar', length: 8, nullable: true })
  nuevaCedulaProfesional: string | null;

  @Column({ name: 'nueva_cedula_especialidad', type: 'varchar', length: 8, nullable: true })
  nuevaCedulaEspecialidad: string | null;

  @Column({ length: 20, default: 'pendiente' })
  estado: 'pendiente' | 'aprobado' | 'rechazado';

  @Column({ name: 'respuesta_admin', type: 'text', nullable: true })
  respuestaAdmin: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date | null;
}