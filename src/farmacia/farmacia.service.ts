import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receta, DetalleReceta, EstadoReceta } from './entities/farmacia.entities';
import { CreateRecetaDto, SurtirRecetaDto } from './dto/create-receta.dto';

@Injectable()
export class FarmaciaService {
  constructor(
    @InjectRepository(Receta)
    private readonly recetasRepository: Repository<Receta>,
    @InjectRepository(DetalleReceta)
    private readonly detallesRepository: Repository<DetalleReceta>,
  ) {}

  // 1. Listar todas las recetas con sus medicamentos
  async obtenerTodas(): Promise<Receta[]> {
    return await this.recetasRepository.find({
      order: { fechaEmision: 'DESC' },
    });
  }

  // 2. Buscar una receta por su folio físico exacto (RF-14, RF-15)
  async buscarPorFolio(folio: string): Promise<Receta> {
    const receta = await this.recetasRepository.findOne({
      where: { folioFisico: folio },
    });
    if (!receta) {
      throw new NotFoundException(`No se encontró ninguna receta con el folio físico ${folio}`);
    }
    return receta;
  }

  // 3. Emitir una nueva receta médica con sus medicamentos (CU-12)
  async crearReceta(dto: CreateRecetaDto): Promise<Receta> {
    const existeFolio = await this.recetasRepository.findOne({
      where: { folioFisico: dto.folioFisico },
    });

    if (existeFolio) {
      throw new ConflictException(
        `El folio físico '${dto.folioFisico}' ya está registrado en otra receta.`,
      );
    }

    const nuevaReceta = this.recetasRepository.create({
      folioFisico: dto.folioFisico,
      citaId: dto.citaId,
      pacienteId: dto.pacienteId,
      doctorId: dto.doctorId,
      estado: EstadoReceta.PENDIENTE,
    });
    const recetaGuardada = await this.recetasRepository.save(nuevaReceta);

    for (const item of dto.detalles) {
      const detalle = this.detallesRepository.create({
        recetaId: recetaGuardada.id,
        medicamento: item.medicamento,
        dosis: item.dosis,
        cantidadEntregar: item.cantidadEntregar,
      });
      await this.detallesRepository.save(detalle);
    }

    return (await this.recetasRepository.findOne({
      where: { id: recetaGuardada.id },
    }))!;
  }

  // 4. Surtir receta en ventanilla de farmacia (CU-13)
  async surtirReceta(id: string, dto?: SurtirRecetaDto): Promise<Receta> {
    const receta = await this.recetasRepository.findOne({ where: { id } });
    if (!receta) {
      throw new NotFoundException(`No se encontró la receta con ID ${id}`);
    }

    if (receta.estado === EstadoReceta.SURTIDA) {
      throw new BadRequestException('Esta receta ya fue surtida anteriormente.');
    }

    receta.estado = EstadoReceta.SURTIDA;
    receta.fechaSurtido = new Date();
    receta.empleadoFarmaciaId = dto?.empleadoFarmaciaId || null;

    await this.recetasRepository.save(receta);

    return (await this.recetasRepository.findOne({ where: { id } }))!;
  }
}