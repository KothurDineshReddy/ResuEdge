import React from 'react';
import { CategoryScore } from '../types';

const SECTION_META: Record<string, { label: string; icon: string }> = {
  open_source:      { label: 'Open Source',           icon: '🌐' },
  self_projects:    { label: 'Self Projects',          icon: '🚀' },
  production:       { label: 'Production Experience',  icon: '🏢' },
  technical_skills: { label: 'Technical Skills',       icon: '💻' },
};

interface Props {
  sectionKey: string;
  data: CategoryScore;
  isWeak: boolean;
}

export default function ScoreCard({ sectionKey, data, isWeak }: Props) {
  const meta = SECTION_META[sectionKey] || { label: sectionKey, icon: '📊' };
  const pct = Math.min((data.score / data.max) * 100, 100);

  const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`score-card ${isWeak ? 'score-card--weak' : ''}`}>
      <div className="score-card__header">
        <span className="score-card__icon">{meta.icon}</span>
        <span className="score-card__label">{meta.label}</span>
        <span className="score-card__score">{data.score}/{data.max}</span>
      </div>
      <div className="score-bar">
        <div className="score-bar__fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <p className="score-card__evidence">{data.evidence}</p>
      {isWeak && <span className="score-card__badge">Needs Improvement</span>}
    </div>
  );
}
