export interface ContenidoEmail {
  asunto: string;
  html: string;
}

export interface DestinatarioEmail {
  email: string;
  nombre?: string;
}