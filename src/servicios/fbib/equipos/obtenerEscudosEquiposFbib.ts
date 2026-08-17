import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";

export interface EscudosEquiposFbib {
  local: string | null;
  visitante: string | null;
}

function normalizarEscudo(valor: unknown): string | null {
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

export async function obtenerEscudosEquiposFbib(idEquipoLocal: string, idEquipoVisitante: string): Promise<EscudosEquiposFbib> {
  try {
    const resultado = await obtenerDatosEsbFbib(`/Clubs/getImagesByTeamId/${encodeURIComponent(idEquipoLocal)}/${encodeURIComponent(idEquipoVisitante)}`);

    if (!Array.isArray(resultado)) {
      console.error("Formato inesperado al obtener los escudos:", resultado);

      return {
        local: null,
        visitante: null,
      };
    }

    return {
      local: normalizarEscudo(resultado[0]),
      visitante: normalizarEscudo(resultado[1]),
    };
  } catch (error) {
    console.error("Error al obtener los escudos de la FBIB:", error);

    return {
      local: null,
      visitante: null,
    };
  }
}