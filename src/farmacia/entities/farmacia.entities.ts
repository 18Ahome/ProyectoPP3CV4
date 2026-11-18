import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Cita } from '../../citas/entities/cita.entity';
import {
  Paciente,
  PersonalSalud,
  Usuario,
} from '../../catalogos/entities/catalogo.entities';

export enum EstadoReceta {
  PENDIENTE = 'pendiente',
  SURTIDA = 'surtida',
}

@Entity('recetas')
export class Receta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'folio_fisico', length: 50, unique: true })
  folioFisico: string;

  @Column({ name: 'cita_id', type: 'uuid' })
  citaId: string;

  @Column({ name: 'paciente_id', type: 'uuid' })
  pacienteId: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @Column({
    type: 'enum',
    enum: EstadoReceta,
    enumName: 'estado_receta',
    default: EstadoReceta.PENDIENTE,
  })
  estado: EstadoReceta;

  @CreateDateColumn({ name: 'fecha_emision', type: 'timestamp' })
  fechaEmision: Date;

  @Column({ name: 'fecha_surtido', type: 'timestamp', nullable: true })
  fechaSurtido: Date | null;

  @Column({ name: 'empleado_farmacia_id', type: 'uuid', nullable: true })
  empleadoFarmaciaId: string | null;

  // --- RELACIONES PARA MOSTRAR NOMBRES Y MEDICAMENTOS EN LA WEB ---
  @ManyToOne(() => Cita, { eager: true })
  @JoinColumn({ name: 'cita_id' })
  cita: Cita;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente: Paciente;

  @ManyToOne(() => PersonalSalud, { eager: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor: PersonalSalud;

  @ManyToOne(() => Usuario, { eager: true, nullable: true })
  @JoinColumn({ name: 'empleado_farmacia_id' })
  empleadoFarmacia: Usuario | null;

  @OneToMany(() => DetalleReceta, (detalle) => detalle.receta, { eager: true })
  detalles: DetalleReceta[];
}

@Entity('detalles_receta')
export class DetalleReceta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'receta_id', type: 'uuid' })
  recetaId: string;

  @Column({ length: 150 })
  medicamento: string;

  @Column({ length: 255 })
  dosis: string;

  @Column({ name: 'cantidad_entregar', type: 'int' })
  cantidadEntregar: number;

  @ManyToOne(() => Receta, (receta) => receta.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receta_id' })
  receta: Receta;
}