import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";

export interface PartidoPendienteFbib {
  idMatch?: string | number | null;
  idMatchCall?: string | number | null;
  universallyid?: string | null;
  matchDay?: string | null;
  state?: string | number | null;
  numMatchDay?: string | number | null;
  idLocalTeam?: string | number | null;
  idVisitorTeam?: string | number | null;
  nameLocalTeam?: string | null;
  nameVisitorTeam?: string | null;
  localScore?: string | number | null;
  visitorScore?: string | number | null;
  localTeamUuid?: string | null;
  visitorTeamUuid?: string | null;
  nameCategorySigned?: string | null;
  nameCompetition?: string | null;
  nameGroup?: string | null;
  nameField?: string | null;
  adressField?: string | null;
  nameTown?: string | null;
  postalCodeField?: string | null;
}

export async function obtenerPartidosPendientesEquipoFbib(idEquipoFbib: string): Promise<PartidoPendienteFbib[]> {
  const idNormalizado = idEquipoFbib.trim();

  if (!idNormalizado) {
    throw new Error("El identificador FBIB del equipo no es válido");
  }

  const resultado = await obtenerDatosEsbFbib(`/Match/getByStateAndTeamId/0/${encodeURIComponent(idNormalizado)}/1`);

  console.log("Respuesta exacta de la FBIB:");
  console.dir(resultado, {
    depth: null,
  });

  if (resultado === null) {
    return [];
  }

  if (!Array.isArray(resultado)) {
    throw new Error("La FBIB ha devuelto un formato de partidos inesperado");
  }

  return resultado as PartidoPendienteFbib[];
}