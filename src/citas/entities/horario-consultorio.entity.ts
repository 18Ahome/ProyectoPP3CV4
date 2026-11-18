import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Consultorio } from '../../catalogos/entities/catalogo.entities';

@Entity('horarios_consultorios')
export class HorarioConsultorio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'consultorio_id', type: 'uuid' })
  consultorioId: string;

  @Column({ name: 'dia_semana', type: 'int' })
  diaSemana: number; // 1: Lunes ... 7: Domingo

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @ManyToOne(() => Consultorio, (consultorio) => consultorio.horarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultorio_id' })
  consultorio: Consultorio;
}