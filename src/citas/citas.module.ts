import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import {
  Cita,
  BloqueoAgenda,
  NotificacionPaciente,
} from './entities/cita.entity';
import { HorarioConsultorio } from './entities/horario-consultorio.entity';
import {
  Paciente,
  PersonalSalud,
  Consultorio,
} from '../catalogos/entities/catalogo.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cita,
      HorarioConsultorio,
      BloqueoAgenda,
      NotificacionPaciente,
      Paciente,
      PersonalSalud,
      Consultorio,
    ]),
  ],
  controllers: [CitasController],
  providers: [CitasService],
})
export class CitasModule {}