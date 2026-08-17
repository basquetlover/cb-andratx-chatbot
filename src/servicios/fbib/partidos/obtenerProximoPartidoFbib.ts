import { obtenerPartidosPendientesEquipoFbib, type PartidoPendienteFbib } from "./obtenerPartidosPendientesEquipoFbib";
import { seleccionarProximoPartido } from "./seleccionarProximoPartido";
import { obtenerEscudosEquiposFbib } from "../equipos/obtenerEscudosEquiposFbib";
import type { ProximoPartido } from "@tipos/Partido";

function convertirTexto(valor: unknown): string | null {
  if (typeof valor === "string") {
    const texto = valor.trim();

    return texto.length > 0 ? texto : null;
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    return String(valor);
  }

  return null;
}

function convertirImagen(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const imagen = valor.trim();

  if (!imagen) {
    return null;
  }

  if (imagen.startsWith("https://") || imagen.startsWith("data:image/")) {
    return imagen;
  }

  if (imagen.startsWith("http://")) {
    return imagen.replace("http://", "https://");
  }

  if (imagen.startsWith("/")) {
    return `https://www.fbib.es${imagen}`;
  }

  if (/^[A-Za-z0-9+/]+=*$/.test(imagen)) {
    return `data:image/png;base64,${imagen}`;
  }

  return null;
}

function convertirPuntos(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  if (typeof valor === "string" && valor.trim() !== "") {
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
  }

  return null;
}

function obtenerFecha(fechaHora: string | null | undefined): string | null {
  if (!fechaHora) {
    return null;
  }

  const formatoIso = fechaHora.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (formatoIso) {
    return `${formatoIso[1]}-${formatoIso[2]}-${formatoIso[3]}`;
  }

  const formatoEuropeo = fechaHora.match(/(\d{2})\/(\d{2})\/(\d{4})/);

  if (formatoEuropeo) {
    return `${formatoEuropeo[3]}-${formatoEuropeo[2]}-${formatoEuropeo[1]}`;
  }

  return null;
}

function obtenerHora(fechaHora: string | null | undefined): string | null {
  if (!fechaHora) {
    return null;
  }

  const coincidencia = fechaHora.match(/(?:T|\s)(\d{1,2}):(\d{2})/);

  if (!coincidencia) {
    return null;
  }

  return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
}

function convertirPartido(partido: PartidoPendienteFbib): ProximoPartido | null {
  const id = convertirTexto(partido.idMatch) ?? convertirTexto(partido.idMatchCall) ?? convertirTexto(partido.universallyid);
  const fecha = obtenerFecha(partido.matchDay);
  const nombreLocal = convertirTexto(partido.nameLocalTeam);
  const nombreVisitante = convertirTexto(partido.nameVisitorTeam);

  if (!id || !fecha || !nombreLocal || !nombreVisitante) {
    return null;
  }

  const nombreInstalacion = convertirTexto(partido.nameField);
  const direccion = convertirTexto(partido.adressField);
  const localidad = convertirTexto(partido.nameTown);
  

  return {
    id,
    fecha,
    hora: obtenerHora(partido.matchDay),
    jornada: convertirTexto(partido.numMatchDay),
    categoria: convertirTexto(partido.nameCategorySigned),
    competicion: convertirTexto(partido.nameCompetition),
    grupo: convertirTexto(partido.nameGroup),
    estado: "Pendiente",
    equipoLocal: {
      nombre: nombreLocal,
      puntos: convertirPuntos(partido.localScore),
      escudo: null,
    },
    equipoVisitante: {
      nombre: nombreVisitante,
      puntos: convertirPuntos(partido.visitorScore),
      escudo: null,
    },
    instalacion:
      nombreInstalacion || direccion || localidad
        ? {
            nombre: nombreInstalacion,
            direccion,
            localidad,
          }
        : null,
    urlFbib: `https://www.fbib.es/partido/${encodeURIComponent(id)}`,
  };
}

export async function obtenerProximoPartidoFbib(idEquipoFbib: string): Promise<ProximoPartido | null> {
  const partidosFbib = await obtenerPartidosPendientesEquipoFbib(idEquipoFbib);
  const partidos = partidosFbib.map(convertirPartido).filter((partido): partido is ProximoPartido => partido !== null);

  if (partidosFbib.length > 0 && partidos.length === 0) {
    throw new Error("La FBIB ha devuelto un partido con un formato inesperado");
  }

  const proximoPartido = seleccionarProximoPartido(partidos);

  if (!proximoPartido) {
    return null;
  }

  const partidoOrigen = partidosFbib.find((partido) => {
    const id = convertirTexto(partido.idMatch) ?? convertirTexto(partido.idMatchCall) ?? convertirTexto(partido.universallyid);

    return id === proximoPartido.id;
  });

  const idEquipoLocal = convertirTexto(partidoOrigen?.idLocalTeam);
  const idEquipoVisitante = convertirTexto(partidoOrigen?.idVisitorTeam);

  if (!idEquipoLocal || !idEquipoVisitante) {
    return proximoPartido;
  }

  const escudos = await obtenerEscudosEquiposFbib(idEquipoLocal, idEquipoVisitante);

  return {
    ...proximoPartido,
    equipoLocal: {
      ...proximoPartido.equipoLocal,
      escudo: escudos.local,
    },
    equipoVisitante: {
      ...proximoPartido.equipoVisitante,
      escudo: escudos.visitante,
    },
  };
}