import type { EventoPanel } from "@tipos/EventoPanel";

export type EventoChatbot = Pick<
  EventoPanel,
  | "id"
  | "titulo"
  | "descripcionCorta"
  | "descripcion"
  | "fechaInicio"
  | "fechaFin"
  | "horaInicio"
  | "horaFin"
  | "todoElDia"
  | "ubicacion"
  | "direccion"
  | "imagen"
  | "urlInformacion"
  | "urlInscripcion"
  | "requiereInscripcion"
>;

export interface RespuestaEventosChatbot {
  ok: boolean;
  data: EventoChatbot[] | null;
  error?: string;
}