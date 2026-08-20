import { obtenerDatosEsbFbib } from "../cliente/obtenerDatosEsbFbib";

export interface PartidoPendienteFbib {
  idMatch?: string | number | null;
  idMatchCall?: string | number | null;
  universallyid?: string | null;
  matchCallUuid?: string | null;

  matchDay?: string | null;
  state?: string | number | null;
  numMatchDay?: string | number | null;

  idLocalClub?: string | number | null;
  idVisitorClub?: string | number | null;
  idLocalTeam?: string | number | null;
  idVisitorTeam?: string | number | null;

  nameLocalTeam?: string | null;
  nameVisitorTeam?: string | null;

  localScore?: string | number | null;
  visitorScore?: string | number | null;

  localTeamUuid?: string | null;
  visitorTeamUuid?: string | null;

  nameCategory?: string | null;
  nameCategorySigned?: string | null;
  nameCompetition?: string | null;
  nameGroup?: string | null;

  idField?: string | number | null;
  nameField?: string | null;
  adressField?: string | null;
  postalCodeField?: string | null;
  latitudeField?: string | number | null;
  longitudeField?: string | number | null;
  nameTown?: string | null;
}

export async function obtenerPartidosPendientesEquipoFbib(idEquipoFbib: string): Promise<PartidoPendienteFbib[]> {
  const idNormalizado = idEquipoFbib.trim();

  if (!idNormalizado) {
    throw new Error("El identificador FBIB del equipo no es válido");
  }

  const ruta = `/Match/getByStateAndTeamId/0/${encodeURIComponent(idNormalizado)}/1`;
  const resultado = await obtenerDatosEsbFbib(ruta);

  if (resultado === null) {
    return [];
  }

  if (!Array.isArray(resultado)) {
    throw new Error("La FBIB ha devuelto un formato de partidos inesperado");
  }

  return resultado as PartidoPendienteFbib[];
}