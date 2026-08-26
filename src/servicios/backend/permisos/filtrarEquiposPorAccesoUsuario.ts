import {
  obtenerAccesoEquiposUsuario,
  type AlcanceEquiposUsuario,
} from "./obtenerAccesoEquiposUsuario";

interface EquipoConIdentificador {
  id: string;
}

function crearConjuntoEquiposPermitidos(
  alcance: AlcanceEquiposUsuario,
): Set<string> {
  return new Set(
    alcance.equiposIds.map((equipoId) =>
      equipoId.trim(),
    ),
  );
}

export async function filtrarEquiposPorAccesoUsuario<
  Equipo extends EquipoConIdentificador,
>(
  usuarioId: string,
  equipos: Equipo[],
): Promise<Equipo[]> {
  const alcance =
    await obtenerAccesoEquiposUsuario(
      usuarioId,
    );

  if (alcance.accesoTodosEquipos) {
    return equipos;
  }

  if (alcance.equiposIds.length === 0) {
    return [];
  }

  const equiposPermitidos =
    crearConjuntoEquiposPermitidos(alcance);

  return equipos.filter((equipo) =>
    equiposPermitidos.has(equipo.id.trim()),
  );
}