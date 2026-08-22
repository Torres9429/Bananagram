// coverage es informativa — NO forma parte de la fórmula ponderada del score
// (Score = Consistencia×0.30 + Engagement×0.40 + Frecuencia×0.30). No la
// trates como un 4º factor que pondera igual que los otros tres — ver
// modelo.txt y docs/frontend-db-alignment.md §1.4.
export interface BrandScore {
  id: string;
  brandId: string;
  score: number;
  consistency: number;
  engagement: number;
  frequency: number;
  coverage: number; // informativa — no pondera
  classification: string; // string abierto (no enum en BD) — ver modelo.txt
  snapshotDate: string;
}
