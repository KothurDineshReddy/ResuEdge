import React, { useState } from 'react';
import { SectionSuggestion } from '../types';

const SECTION_LABELS: Record<string, string> = {
  open_source:      'Open Source',
  self_projects:    'Self Projects',
  production:       'Production Experience',
  technical_skills: 'Technical Skills',
};

interface Props {
  suggestions: Record<string, SectionSuggestion>;
}

export default function SuggestionPanel({ suggestions }: Props) {
  const sections = Object.entries(suggestions);
  const [openSection, setOpenSection] = useState<string | null>(sections[0]?.[0] ?? null);

  if (sections.length === 0) return null;

  return (
    <div className="suggestion-panel">
      <h2 className="section-title">💡 Improvement Suggestions</h2>
      <p className="hint">Sections that scored below 70% of their maximum.</p>
      {sections.map(([key, data]) => (
        <div key={key} className="suggestion-section">
          <button
            className={`suggestion-header ${openSection === key ? 'open' : ''}`}
            onClick={() => setOpenSection(openSection === key ? null : key)}
          >
            <span className="suggestion-section-label">
              <span className={`priority-dot priority--${data.priority.toLowerCase()}`} />
              {SECTION_LABELS[key] || key}
            </span>
            <span className="suggestion-priority">{data.priority} Priority</span>
            <span className="chevron">{openSection === key ? '▲' : '▼'}</span>
          </button>

          {openSection === key && (
            <div className="suggestion-body">
              <p className="suggestion-reason">{data.reason}</p>
              <div className="suggestion-list">
                {data.suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <div className="suggestion-item__num">{i + 1}</div>
                    <div className="suggestion-item__content">
                      <h4 className="suggestion-item__title">{s.title}</h4>
                      <p className="suggestion-item__action">{s.action}</p>
                      <p className="suggestion-item__why">
                        <strong>Why it helps:</strong> {s.why}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
