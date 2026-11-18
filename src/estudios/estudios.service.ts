import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstudioClinico, SolicitudEstudio } from './entities/estudio.entities';
import {
  CreateEstudioClinicoDto,
  CreateSolicitudEstudioDto,
} from './dto/create-estudio.dto';

@Injectable()
export class EstudiosService {
  constructor(
    @InjectRepository(EstudioClinico)
    private readonly catalogoRepository: Repository<EstudioClinico>,
    @InjectRepository(SolicitudEstudio)
    private readonly solicitudesRepository: Repository<SolicitudEstudio>,
  ) {}

  // 1. Listar catálogo de estudios disponibles
  async obtenerCatalogo(): Promise<EstudioClinico[]> {
    return await this.catalogoRepository.find({
      order: { nombreEstudio: 'ASC' },
    });
  }

  // 2. Agregar un nuevo tipo de estudio al catálogo
  async crearEstudioCatalogo(dto: CreateEstudioClinicoDto): Promise<EstudioClinico> {
    const nuevo = this.catalogoRepository.create({
      nombreEstudio: dto.nombreEstudio,
      descripcion: dto.descripcion ?? null,
    });
    return await this.catalogoRepository.save(nuevo);
  }

  // 3. Listar todas las solicitudes de estudios (CU-07 / CU-09)
  async obtenerSolicitudes(): Promise<SolicitudEstudio[]> {
    return await this.solicitudesRepository.find({
      order: { fechaSolicitud: 'DESC' },
    });
  }

  // 4. Crear una orden/solicitud de estudio desde una cita (RF-08, CU-07)
  async crearSolicitud(dto: CreateSolicitudEstudioDto): Promise<SolicitudEstudio> {
    const nuevaSolicitud = this.solicitudesRepository.create({
      citaId: dto.citaId,
      pacienteId: dto.pacienteId,
      estudioId: dto.estudioId,
      citaEstudioId: dto.citaEstudioId || null,
    });
    const guardada = await this.solicitudesRepository.save(nuevaSolicitud);

    return (await this.solicitudesRepository.findOne({
      where: { id: guardada.id },
    }))!;
  }
}