import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CitasModule } from './citas/citas.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { EstudiosModule } from './estudios/estudios.module';
import { FarmaciaModule } from './farmacia/farmacia.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres', // Usuario de PostgreSQL
      password: '', // Normalmente va la contraseña de PostgreSQL pero lo dejamos vacío porque pg_hba.conf está en 'trust'
      database: 'ppdb', // ppdb
      autoLoadEntities: true,
      synchronize: false, // para respetar las tablas y ENUMs de SQL
    }),
    CitasModule,
    CatalogosModule,
    EstudiosModule,
    FarmaciaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
