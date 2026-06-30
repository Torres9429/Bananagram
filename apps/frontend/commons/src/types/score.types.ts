export interface BrandScore {
  score: number; consistency: number; engagement: number;
  coverage: number; frequency: number;
  classification: 'bajo' | 'medio' | 'alto'; snapshotDate: string;
}
