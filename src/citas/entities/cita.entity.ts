import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  Paciente,
  PersonalSalud,
  Consultorio,
} from '../../catalogos/entities/catalogo.entities';

export enum EstadoCita {
  PROGRAMADA = 'programada',
  EN_CURSO = 'en_curso',
  FINALIZADA = 'finalizada',
  CANCELADA = 'cancelada',
  CANCELADA_MEDICO = 'cancelada_medico',
  INASISTENCIA = 'inasistencia',
}

@Entity('citas')
export class Cita {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'paciente_id', type: 'uuid' })
  pacienteId: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @Column({ name: 'consultorio_id', type: 'uuid' })
  consultorioId: string;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => PersonalSalud, { eager: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: PersonalSalud;

  @ManyToOne(() => Consultorio, { eager: true })
  @JoinColumn({ name: 'consultorio_id' })
  consultorio: Consultorio;

  @Column({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora: Date;

  @Column({
    type: 'enum',
    enum: EstadoCita,
    enumName: 'estado_cita',
    default: EstadoCita.PROGRAMADA,
  })
  estado: EstadoCita;

  @Column({ type: 'text', nullable: true })
  diagnostico: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @Column({ name: 'tipo_cancelacion', type: 'varchar', length: 50, nullable: true })
  tipoCancelacion: string | null;

  @Column({ name: 'doctor_sustituto_propuesto_id', type: 'uuid', nullable: true })
  doctorSustitutoPropuestoId: string | null;

  @ManyToOne(() => PersonalSalud, { eager: true, nullable: true })
  @JoinColumn({ name: 'doctor_sustituto_propuesto_id' })
  doctorSustitutoPropuesto: PersonalSalud | null;

  @Column({ name: 'estado_reubicacion', type: 'varchar', length: 50, nullable: true })
  estadoReubicacion: string | null;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}

@Entity('bloqueos_agenda')
export class BloqueoAgenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => PersonalSalud, { eager: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: PersonalSalud;

  @Column({ name: 'fecha_inicio', type: 'timestamp' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'timestamp' })
  fechaFin: Date;

  @Column({ length: 20, default: 'BLOQUEADO' })
  estado: string; // 'BLOQUEADO' | 'INACTIVO'

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;
}

@Entity('notificaciones_pacientes')
export class NotificacionPaciente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'paciente_id', type: 'uuid' })
  pacienteId: string;

  @Column({ name: 'cita_id', type: 'uuid' })
  citaId: string;

  @ManyToOne(() => Cita, { eager: true })
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ name: 'requiere_confirmacion', type: 'boolean', default: false })
  requiereConfirmacion: boolean;

  @Column({ name: 'doctor_sustituto_id', type: 'uuid', nullable: true })
  doctorSustitutoId: string | null;

  @ManyToOne(() => PersonalSalud, { eager: true, nullable: true })
  @JoinColumn({ name: 'doctor_sustituto_id' })
  doctorSustituto: PersonalSalud | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;
}