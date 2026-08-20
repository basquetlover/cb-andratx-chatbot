const CLAVE_EQUIPOS_FAVORITOS = "cb-andratx:equipos-favoritos";
const EVENTO_FAVORITOS_ACTUALIZADOS = "cb-andratx:favoritos-actualizados";
const VERSION_FAVORITOS = 1;

interface FavoritosGuardados {
  version: number;
  temporadaId: string;
  equiposIds: string[];
}

export interface ResultadoAlternarFavorito {
  esFavorito: boolean;
  equiposIds: string[];
}

function navegadorDisponible(): boolean {
  return typeof window !== "undefined";
}

function normalizarIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)));
}

function esFavoritosGuardados(valor: unknown): valor is FavoritosGuardados {
  if (!valor || typeof valor !== "object") {
    return false;
  }

  const favoritos = valor as Partial<FavoritosGuardados>;

  return (
    typeof favoritos.version === "number" &&
    typeof favoritos.temporadaId === "string" &&
    Array.isArray(favoritos.equiposIds) &&
    favoritos.equiposIds.every((id) => typeof id === "string")
  );
}

function leerFavoritosGuardados(): FavoritosGuardados | null {
  if (!navegadorDisponible()) {
    return null;
  }

  try {
    const contenido = window.localStorage.getItem(CLAVE_EQUIPOS_FAVORITOS);

    if (!contenido) {
      return null;
    }

    const favoritos: unknown = JSON.parse(contenido);

    if (!esFavoritosGuardados(favoritos)) {
      window.localStorage.removeItem(CLAVE_EQUIPOS_FAVORITOS);
      return null;
    }

    return {
      version: favoritos.version,
      temporadaId: favoritos.temporadaId,
      equiposIds: normalizarIds(favoritos.equiposIds),
    };
  } catch (error) {
    console.error("Error al leer los equipos favoritos:", error);
    return null;
  }
}

function emitirCambio(favoritos: FavoritosGuardados): void {
  if (!navegadorDisponible()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FavoritosGuardados>(EVENTO_FAVORITOS_ACTUALIZADOS, {
      detail: favoritos,
    }),
  );
}

export function obtenerEquiposFavoritos(temporadaId: string): string[] {
  const favoritos = leerFavoritosGuardados();

  if (!favoritos) {
    return [];
  }

  const perteneceTemporadaActual =
    favoritos.version === VERSION_FAVORITOS &&
    favoritos.temporadaId === temporadaId;

  if (!perteneceTemporadaActual) {
    guardarEquiposFavoritos(temporadaId, []);
    return [];
  }

  return favoritos.equiposIds;
}

export function guardarEquiposFavoritos(temporadaId: string, equiposIds: string[]): string[] {
  const idsNormalizados = normalizarIds(equiposIds);

  if (!navegadorDisponible()) {
    return idsNormalizados;
  }

  const favoritos: FavoritosGuardados = {
    version: VERSION_FAVORITOS,
    temporadaId,
    equiposIds: idsNormalizados,
  };

  try {
    window.localStorage.setItem(CLAVE_EQUIPOS_FAVORITOS, JSON.stringify(favoritos));
    emitirCambio(favoritos);
  } catch (error) {
    console.error("Error al guardar los equipos favoritos:", error);
  }

  return idsNormalizados;
}

export function esEquipoFavorito(temporadaId: string, equipoId: string): boolean {
  return obtenerEquiposFavoritos(temporadaId).includes(equipoId);
}

export function alternarEquipoFavorito(temporadaId: string, equipoId: string): ResultadoAlternarFavorito {
  const favoritosActuales = obtenerEquiposFavoritos(temporadaId);
  const estabaSeleccionado = favoritosActuales.includes(equipoId);

  const nuevosFavoritos = estabaSeleccionado
    ? favoritosActuales.filter((id) => id !== equipoId)
    : [...favoritosActuales, equipoId];

  return {
    esFavorito: !estabaSeleccionado,
    equiposIds: guardarEquiposFavoritos(temporadaId, nuevosFavoritos),
  };
}

export function eliminarEquipoFavorito(temporadaId: string, equipoId: string): string[] {
  const favoritosActuales = obtenerEquiposFavoritos(temporadaId);
  const nuevosFavoritos = favoritosActuales.filter((id) => id !== equipoId);

  return guardarEquiposFavoritos(temporadaId, nuevosFavoritos);
}

export function limpiarEquiposFavoritos(temporadaId: string): void {
  guardarEquiposFavoritos(temporadaId, []);
}

export function depurarEquiposFavoritos(temporadaId: string, equiposDisponiblesIds: string[]): string[] {
  const equiposDisponibles = new Set(equiposDisponiblesIds);
  const favoritosValidos = obtenerEquiposFavoritos(temporadaId).filter((id) => equiposDisponibles.has(id));

  return guardarEquiposFavoritos(temporadaId, favoritosValidos);
}

export function escucharCambiosFavoritos(temporadaId: string, alCambiar: (equiposIds: string[]) => void): () => void {
  if (!navegadorDisponible()) {
    return () => {};
  }

  const manejarEventoFavoritos = (evento: Event) => {
    if (!(evento instanceof CustomEvent)) {
      return;
    }

    const favoritos = evento.detail as FavoritosGuardados;

    if (favoritos.temporadaId === temporadaId) {
      alCambiar(favoritos.equiposIds);
    }
  };

  const manejarStorage = (evento: StorageEvent) => {
    if (evento.key === CLAVE_EQUIPOS_FAVORITOS) {
      alCambiar(obtenerEquiposFavoritos(temporadaId));
    }
  };

  window.addEventListener(EVENTO_FAVORITOS_ACTUALIZADOS, manejarEventoFavoritos);
  window.addEventListener("storage", manejarStorage);

  return () => {
    window.removeEventListener(EVENTO_FAVORITOS_ACTUALIZADOS, manejarEventoFavoritos);
    window.removeEventListener("storage", manejarStorage);
  };
}