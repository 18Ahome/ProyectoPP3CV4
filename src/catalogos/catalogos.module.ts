import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosService } from './catalogos.service';
import { CatalogosController } from './catalogos.controller';
import {
  Especialidad,
  Usuario,
  Paciente,
  PersonalSalud,
  Consultorio,
  TicketSoporte,
} from './entities/catalogo.entities';
import { HorarioConsultorio } from '../citas/entities/horario-consultorio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Especialidad,
      Usuario,
      Paciente,
      PersonalSalud,
      Consultorio,
      HorarioConsultorio,
      TicketSoporte,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
})
export class CatalogosModule {}