import type { CatalogItem } from './catalog.types';

// Nombres completos en minúsculas — igual que SocialNetwork.code en modelo.txt.
// Antes se usaban códigos cortos en mayúsculas ('IG'/'TK'/'LI'/'FB'/'X'/'YT')
// en brands-front/posts-front/analytics-front — decisión del equipo de
// alinear al valor real de BD, ver docs/frontend-db-alignment.md §1.5/§9.2.
export type SocialNetworkCode = 'instagram' | 'tiktok' | 'facebook' | 'x' | 'linkedin' | 'youtube';

// Catálogo de plataformas — gestionado solo por Admin. Extiende CatalogItem
// con los campos propios de esta red (patrón a seguir si otro catálogo
// necesita campos extra en el futuro — ver docs/frontend-db-alignment.md §9.12).
export interface SocialNetwork extends CatalogItem {
  code: SocialNetworkCode;
  baseEngagementRate: number; // % base para simulación de métricas (cron)
}

// Instancia por marca (antes "BrandProfile") — una fila por red que la marca
// gestiona. socialNetworkId es FK al catálogo de arriba, no un código crudo.
export interface SocialAccount {
  id: string;
  brandId: string;
  socialNetworkId: string;
  handle?: string | null;
  followers: number;
  active: boolean;
}

// Vista de presentación de una red del catálogo (label + color de acento) —
// usada por selectores de red en formularios. No es un modelo de modelo.txt
// en sí, es una capa de UI sobre SocialNetworkCode/SocialNetwork.
export interface SocialNetworkOption {
  id: string;
  code: SocialNetworkCode;
  label: string;
  color: string;
}
