export type CampaignStatus = 'active' | 'paused' | 'finished';

// Aceptación del CM (Fase J) — separado de CampaignStatus (ciclo operativo).
// cmId queda fijo solo una vez 'aceptada'; antes de eso el Cliente puede
// reasignarlo (ej. si el CM rechaza), lo que resetea esto a 'pendiente'.
export type CmAssignmentStatus = 'pendiente' | 'aceptada' | 'rechazada';

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  description?: string | null;
  objective?: string | null;
  status: CampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
  cmId: string; // FK única — "solo un CM por campaña" a nivel BD
  cmStatus: CmAssignmentStatus;
  cmRespondedAt?: string | null;
  cmRejectionReason?: string | null;
  createdBy: string; // FK -> users.id del Cliente que la creó
  // El backend real incluye estas 2 filas puente (solo IDs, sin nombre/avatar
  // anidado — hay que resolverlos cruzando con listEligibleCMs/
  // listEligibleDesigners/listCategories, ver campaigns.api.ts).
  designers?: CampaignDesigner[];
  categories?: CampaignCategory[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// { userId, name, avatarUrl } — GET /campaigns/eligible-community-managers y
// /eligible-designers, la fuente real para los pickers de CM/Diseñador.
export interface EligibleStaffMember {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

// matchScore solo lo trae eligible-community-managers (Fase J, recomendaciones
// por categoría) — eligible-designers sigue siendo un EligibleStaffMember
// plano.
export interface EligibleCm extends EligibleStaffMember {
  matchScore: number;
}

// Join sin campo de rol — la membresía en esta tabla ya implica "diseñador".
// No confundir con el CM, que vive directo en Campaign.cmId (relación distinta,
// cardinalidad 1, no N) — ver docs/frontend-db-alignment.md §1.2/§9.7.
export interface CampaignDesigner {
  campaignId: string;
  userId: string;
}

export interface CampaignCategory {
  campaignId: string;
  categoryId: string;
}
