import React from 'react';
import { EvaluationResult } from '../types';
import ScoreCard from '../components/ScoreCard';
import SuggestionPanel from '../components/SuggestionPanel';
import ReportDownload from '../components/ReportDownload';

interface Props {
  result: EvaluationResult;
  onReset: () => void;
}

const SUGGESTION_THRESHOLD = 0.70;

export default function Results({ result, onReset }: Props) {
  const scorePct = Math.round((result.total_score / result.max_score) * 100);

  const scoreColor =
    scorePct >= 70 ? '#22c55e' : scorePct >= 40 ? '#f59e0b' : '#ef4444';

  const isWeak = (key: string) => {
    const cat = result.scores[key as keyof typeof result.scores];
    return cat.score < SUGGESTION_THRESHOLD * cat.max;
  };

  return (
    <div className="results">
      {/* Header */}
      <div className="results-header">
        <div>
          <h1 className="results-name">{result.candidate_name}</h1>
          <p className="results-subtitle">Resume Evaluation Report</p>
        </div>
        <button className="link-btn" onClick={onReset}>← Evaluate another</button>
      </div>

      {/* Overall score banner */}
      <div className="score-banner">
        <div className="score-banner__circle" style={{ borderColor: scoreColor }}>
          <span className="score-banner__value" style={{ color: scoreColor }}>
            {result.total_score}
          </span>
          <span className="score-banner__max">/ {result.max_score}</span>
        </div>
        <div className="score-banner__meta">
          <p className="score-banner__label">Overall Score</p>
          {result.bonus_points.total > 0 && (
            <p className="score-banner__bonus">+{result.bonus_points.total} bonus points</p>
          )}
          {result.deductions.total > 0 && (
            <p className="score-banner__deduction">−{result.deductions.total} deductions</p>
          )}
        </div>
      </div>

      {/* Section scores */}
      <h2 className="section-title">📊 Section Breakdown</h2>
      <div className="score-grid">
        {Object.entries(result.scores).map(([key, cat]) => (
          <ScoreCard key={key} sectionKey={key} data={cat} isWeak={isWeak(key)} />
        ))}
      </div>

      {/* Suggestions */}
      {Object.keys(result.suggestions).length > 0 && (
        <SuggestionPanel suggestions={result.suggestions} />
      )}

      {/* Key strengths */}
      {result.key_strengths.length > 0 && (
        <div className="card">
          <h2 className="section-title">✅ Key Strengths</h2>
          <ul className="bullet-list">
            {result.key_strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Areas for improvement */}
      {result.areas_for_improvement.length > 0 && (
        <div className="card">
          <h2 className="section-title">🔧 Areas for Improvement</h2>
          <ul className="bullet-list">
            {result.areas_for_improvement.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Download */}
      <div className="download-row">
        <ReportDownload result={result} />
      </div>
    </div>
  );
}
