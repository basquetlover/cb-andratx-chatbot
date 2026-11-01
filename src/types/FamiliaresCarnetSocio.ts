
export interface FamiliarCarnetSocio {
  id: string;
  carnetId: string;
  nombreCompleto: string;
  createdAt: string;
  updatedAt: string;
}

export interface RespuestaFamiliaresCarnetSocio {
  ok: boolean;

  data: {
    familiares: FamiliarCarnetSocio[];
    copiados?: number;
  } | null;

  error: string | null;
}
