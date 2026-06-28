import React, { useState } from 'react';

const MODELS = [
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (Recommended)' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Fast)' },
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro (Best Quality)' },
];

interface Props {
  onSubmit: (apiKey: string, model: string) => void;
}

export default function ApiKeyForm({ onSubmit }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) onSubmit(apiKey.trim(), model);
  };

  return (
    <div className="card">
      <h2 className="section-title">Connect Gemini</h2>
      <p className="hint">
        Your API key is used only for this session and never stored.{' '}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
          Get a free key →
        </a>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Gemini API Key</label>
          <div className="input-row">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              required
            />
            <button type="button" className="toggle-btn" onClick={() => setShowKey(v => !v)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary" disabled={!apiKey.trim()}>
          Continue →
        </button>
      </form>
    </div>
  );
}
