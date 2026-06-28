import React, { useState } from 'react';
import ApiKeyForm from '../components/ApiKeyForm';
import UploadPanel from '../components/UploadPanel';

interface Props {
  onSubmit: (apiKey: string, model: string, file: File) => void;
  loading: boolean;
  error: string | null;
}

export default function Home({ onSubmit, loading, error }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'key' | 'upload'>('key');

  const handleKeySubmit = (key: string, selectedModel: string) => {
    setApiKey(key);
    setModel(selectedModel);
    setStep('upload');
  };

  const handleGo = () => {
    if (file && apiKey) onSubmit(apiKey, model, file);
  };

  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">
          Resu<span className="accent">Edge</span>
        </h1>
        <p className="hero-subtitle">
          AI-powered resume scorer with section-level improvement suggestions
        </p>
      </div>

      <div className="home-content">
        {step === 'key' ? (
          <ApiKeyForm onSubmit={handleKeySubmit} />
        ) : (
          <>
            <div className="key-confirmed">
              ✅ Gemini connected · <span className="model-tag">{model}</span>
              <button className="link-btn" onClick={() => setStep('key')}>Change</button>
            </div>
            <UploadPanel onUpload={setFile} onGo={handleGo} loading={loading} />
          </>
        )}

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
