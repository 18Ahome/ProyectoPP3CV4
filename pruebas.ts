import { Cita, finDeCita, agendarCita, reagendarCita, citasPendientesDeDoctor } from "./agenda";

// ===== Datos ficticios =====
const mk = (
  id: string, doc: string, cons: string, inicio: number,
  dur = 30, estado: Cita["estado"] = "Pendiente", fecha = "2026-10-05"
): Cita => ({
  id, doctorId: doc, consultorioId: cons, pacienteId: "P1",
  fecha, inicio, duracion: dur, estado,
});

// Agenda base congelada: si alguna función intenta modificarla, falla
const base: readonly Cita[] = Object.freeze([Object.freeze(mk("C1", "D1", "K1", 540))]);

const resumen = (r: any): string =>
  r.ok
    ? "OK:" + r.valor.map((c: Cita) => `${c.id}@${c.inicio}`).join(",")
    : "ERR:" + r.error;

// [ID, Escenario, Entrada, Esperado, Ejecución]
const casos: [string, string, string, string, () => string][] = [
  ["P01", "Calcular el final de una cita", "inicio 540, dur 30", "570",
    () => String(finDeCita(540, 30))],
  ["P02", "Duración inválida (negativa)", "agendar dur -15", "ERR:Duración inválida",
    () => resumen(agendarCita([], mk("N", "D1", "K1", 540, -15)))],
  ["P03", "Agendar en agenda vacía", "[] + cita a 540", "OK:N@540",
    () => resumen(agendarCita([], mk("N", "D1", "K1", 540)))],
  ["P04", "Conflicto: mismo doctor y horario", "C1(540) + N(540), doctor D1", "ERR:Conflicto de horario",
    () => resumen(agendarCita(base, mk("N", "D1", "K2", 540)))],
  ["P05", "Límite: empieza justo al terminar otra", "C1 termina 570, N inicia 570", "OK:C1@540,N@570",
    () => resumen(agendarCita(base, mk("N", "D1", "K1", 570)))],
  ["P06", "Fuera del horario de atención", "inicio 1060, dur 30 (termina 1090)", "ERR:Fuera del horario de atención",
    () => resumen(agendarCita([], mk("N", "D1", "K1", 1060)))],
  ["P07", "Reagendar cita válida", "C1 pasa de 540 a 600", "OK:C1@600",
    () => resumen(reagendarCita(base, "C1", "2026-10-05", 600))],
  ["P08", "Reagendar a un horario ocupado", "C1(540), C3(600); mover C1 a 600", "ERR:Conflicto de horario",
    () => resumen(reagendarCita([...base, mk("C3", "D1", "K1", 600)], "C1", "2026-10-05", 600))],
  ["P09", "Reagendar cita finalizada", "C2 con estado Finalizada", "ERR:Solo se pueden reagendar citas pendientes",
    () => resumen(reagendarCita([mk("C2", "D1", "K1", 540, 30, "Finalizada")], "C2", "2026-10-05", 600))],
  ["P10", "Los datos originales no se modifican", "snapshot antes y después de agendar, reagendar y consultar", "iguales",
    () => {
      const antes = JSON.stringify(base);
      agendarCita(base, mk("N", "D1", "K1", 570));
      reagendarCita(base, "C1", "2026-10-05", 600);
      citasPendientesDeDoctor(base, "D1");
      return antes === JSON.stringify(base) ? "iguales" : "modificados";
    }],
];

// ===== Ejecución (única parte con entrada/salida) =====
let fallidas = 0;
console.log("ID | Escenario | Esperado | Obtenido | Estado");
for (const [id, escenario, , esperado, ejecutar] of casos) {
  let obtenido: string;
  try { obtenido = ejecutar(); } catch (e) { obtenido = "EXCEPCIÓN " + e; }
  const aprobada = obtenido === esperado;
  if (!aprobada) fallidas++;
  console.log(`${id} | ${escenario} | ${esperado} | ${obtenido} | ${aprobada ? "Aprobada" : "FALLIDA"}`);
}
console.log(`\nTotal: ${casos.length}, fallidas: ${fallidas}`);
