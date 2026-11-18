import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmaciaService } from './farmacia.service';
import { FarmaciaController } from './farmacia.controller';
import { Receta, DetalleReceta } from './entities/farmacia.entities';

@Module({
  imports: [TypeOrmModule.forFeature([Receta, DetalleReceta])],
  controllers: [FarmaciaController],
  providers: [FarmaciaService],
})
export class FarmaciaModule {}