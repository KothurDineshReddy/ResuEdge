import React, { useState } from 'react';
import Home from './pages/Home';
import Results from './pages/Results';
import { evaluateResume } from './api/evaluate';
import { EvaluationResult } from './types';
import './App.css';

export default function App() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (apiKey: string, model: string, file: File) => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluateResume(file, apiKey, model);
      setResult(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <nav className="navbar">
        <span className="navbar-brand" onClick={handleReset} style={{ cursor: 'pointer' }}>
          Resu<span className="accent">Edge</span>
        </span>
      </nav>
      <main className="main">
        {result ? (
          <Results result={result} onReset={handleReset} />
        ) : (
          <Home onSubmit={handleSubmit} loading={loading} error={error} />
        )}
      </main>
    </div>
  );
}
