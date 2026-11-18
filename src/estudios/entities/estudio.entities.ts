import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cita } from '../../citas/entities/cita.entity';
import { Paciente } from '../../catalogos/entities/catalogo.entities';

@Entity('estudios_clinicos')
export class EstudioClinico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre_estudio', length: 100 })
  nombreEstudio: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;
}

@Entity('solicitudes_estudios')
export class SolicitudEstudio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cita_id', type: 'uuid' })
  citaId: string;

  @Column({ name: 'paciente_id', type: 'uuid' })
  pacienteId: string;

  @Column({ name: 'estudio_id', type: 'uuid' })
  estudioId: string;

  @Column({ name: 'cita_estudio_id', type: 'uuid', nullable: true })
  citaEstudioId: string | null;

  @CreateDateColumn({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud: Date;

  // --- RELACIONES PARA MOSTRAR NOMBRES EN LA WEB ---
  @ManyToOne(() => Cita, { eager: true })
  @JoinColumn({ name: 'cita_id' })
  citaOrigen: Cita;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => EstudioClinico, { eager: true })
  @JoinColumn({ name: 'estudio_id' })
  estudio: EstudioClinico;

  @ManyToOne(() => Cita, { eager: true, nullable: true })
  @JoinColumn({ name: 'cita_estudio_id' })
  citaEstudio: Cita | null;
}