// ===== Tipos =====
export type Estado = "Pendiente" | "Finalizada";

export interface Cita {
  readonly id: string;
  readonly doctorId: string;
  readonly consultorioId: string;
  readonly pacienteId: string;
  readonly fecha: string;      // "AAAA-MM-DD"
  readonly inicio: number;     // minutos desde las 00:00
  readonly duracion: number;   // minutos
  readonly estado: Estado;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
const err = <T>(error: string): Resultado<T> => ({ ok: false, error });

export const APERTURA = 480;  // 08:00
export const CIERRE = 1080;   // 18:00

// ===== Funciones puras =====
export const finDeCita = (inicio: number, duracion: number): number =>
  inicio + duracion;

const validarDuracion = (c: Cita): Resultado<Cita> =>
  Number.isInteger(c.duracion) && c.duracion > 0
    ? ok(c)
    : err("Duración inválida");

const validarJornada = (c: Cita): Resultado<Cita> =>
  c.inicio >= APERTURA && finDeCita(c.inicio, c.duracion) <= CIERRE
    ? ok(c)
    : err("Fuera del horario de atención");

export const traslapa = (a: Cita, b: Cita): boolean =>
  a.fecha === b.fecha &&
  a.inicio < finDeCita(b.inicio, b.duracion) &&
  b.inicio < finDeCita(a.inicio, a.duracion);

export const hayConflicto = (nueva: Cita, citas: readonly Cita[]): boolean =>
  citas.some(
    c =>
      c.estado === "Pendiente" &&
      c.id !== nueva.id &&
      traslapa(c, nueva) &&
      (c.doctorId === nueva.doctorId || c.consultorioId === nueva.consultorioId)
  );

// Orden superior: recibe la lista de citas y devuelve una validación
const validarConflicto = (citas: readonly Cita[]) => (c: Cita): Resultado<Cita> =>
  hayConflicto(c, citas) ? err("Conflicto de horario") : ok(c);

// Composición: encadena validaciones y se detiene en el primer error
type Validacion = (c: Cita) => Resultado<Cita>;

const componer = (...validaciones: Validacion[]): Validacion => c =>
  validaciones.reduce<Resultado<Cita>>(
    (acc, v) => (acc.ok ? v(acc.valor) : acc),
    ok(c)
  );

// CU-08: agendar una cita
export const agendarCita = (
  citas: readonly Cita[],
  nueva: Cita
): Resultado<readonly Cita[]> => {
  const r = componer(validarDuracion, validarJornada, validarConflicto(citas))(nueva);
  return r.ok ? ok([...citas, r.valor]) : err(r.error);
};

// CU-05: reagendar una cita
export const reagendarCita = (
  citas: readonly Cita[],
  id: string,
  fecha: string,
  inicio: number
): Resultado<readonly Cita[]> => {
  const actual = citas.find(c => c.id === id);
  if (!actual) return err("Cita no encontrada");
  if (actual.estado !== "Pendiente")
    return err("Solo se pueden reagendar citas pendientes");

  const movida: Cita = { ...actual, fecha, inicio };
  const r = componer(validarDuracion, validarJornada, validarConflicto(citas))(movida);
  return r.ok ? ok(citas.map(c => (c.id === id ? r.valor : c))) : err(r.error);
};

// CU-02 / CU-08: horarios libres de un doctor en un consultorio
export const horariosLibres = (
  citas: readonly Cita[],
  doctorId: string,
  consultorioId: string,
  fecha: string,
  duracion: number,
  paso = 30
): readonly number[] =>
  Array.from(
    { length: Math.floor((CIERRE - duracion - APERTURA) / paso) + 1 },
    (_, i) => APERTURA + i * paso
  ).filter(
    inicio =>
      !hayConflicto(
        {
          id: "_", doctorId, consultorioId, pacienteId: "_",
          fecha, inicio, duracion, estado: "Pendiente",
        },
        citas
      )
  );

// CU-04: citas pendientes de un doctor, ordenadas por fecha y hora
export const citasPendientesDeDoctor = (
  citas: readonly Cita[],
  doctorId: string
): readonly Cita[] =>
  citas
    .filter(c => c.doctorId === doctorId && c.estado === "Pendiente")
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio);
