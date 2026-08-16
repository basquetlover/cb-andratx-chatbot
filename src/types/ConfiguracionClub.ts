export interface RedSocialClub {
  id: string;
  url: string;
  icono: string;
  orden: number;
  activo: boolean;
  nombre: string;
  usuario: string | null;
}

export interface ConfiguracionClub {
  id: string;
  nombreClub: string | null;
  nombreCorto: string | null;
  slug: string | null;
  idClubFbib: number | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  urlFbib: string | null;
  redes: RedSocialClub[];
}

export interface RespuestaConfiguracionClub {
  ok: boolean;
  data: ConfiguracionClub | null;
  error?: string;
}