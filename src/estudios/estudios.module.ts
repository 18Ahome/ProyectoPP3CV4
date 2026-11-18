import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudiosService } from './estudios.service';
import { EstudiosController } from './estudios.controller';
import { EstudioClinico, SolicitudEstudio } from './entities/estudio.entities';

@Module({
  imports: [TypeOrmModule.forFeature([EstudioClinico, SolicitudEstudio])],
  controllers: [EstudiosController],
  providers: [EstudiosService],
})
export class EstudiosModule {}