export type CampaignStatus = 'active' | 'paused' | 'finished';

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
  createdBy: string; // FK -> users.id del Cliente que la creó
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
