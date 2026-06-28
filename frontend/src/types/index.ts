export interface CategoryScore {
  score: number;
  max: number;
  evidence: string;
}

export interface Scores {
  open_source: CategoryScore;
  self_projects: CategoryScore;
  production: CategoryScore;
  technical_skills: CategoryScore;
}

export interface BonusPoints {
  total: number;
  breakdown: string;
}

export interface Deductions {
  total: number;
  reasons: string;
}

export interface Suggestion {
  title: string;
  action: string;
  why: string;
}

export interface SectionSuggestion {
  reason: string;
  priority: 'High' | 'Medium';
  suggestions: Suggestion[];
}

export interface EvaluationResult {
  candidate_name: string;
  total_score: number;
  max_score: number;
  scores: Scores;
  bonus_points: BonusPoints;
  deductions: Deductions;
  suggestions: Record<string, SectionSuggestion>;
  key_strengths: string[];
  areas_for_improvement: string[];
}

export type ModelId =
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite';
