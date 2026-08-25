import { obtenerPatrocinadoresPanel } from "./obtenerPatrocinadoresPanel";

import type { PatrocinadorListadoPanel } from "../../../types/PatrocinadorPanel";

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

export async function obtenerPatrocinadorPanelPorId(patrocinadorId: string): Promise<PatrocinadorListadoPanel | null> {
  const idNormalizado = patrocinadorId.trim();

  if (!validarUuid(idNormalizado)) {
    return null;
  }

  const resultado = await obtenerPatrocinadoresPanel();

  return resultado.patrocinadores.find((patrocinador) => patrocinador.id === idNormalizado) ?? null;
}