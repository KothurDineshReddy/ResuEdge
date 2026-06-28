import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onUpload: (file: File) => void;
  onGo: () => void;
  loading: boolean;
}

export default function UploadPanel({ onUpload, onGo, loading }: Props) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      onUpload(accepted[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  return (
    <div className="card">
      <h2 className="section-title">Upload Resume</h2>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
        <input {...getInputProps()} />
        {file ? (
          <div className="file-info">
            <span className="file-icon">📄</span>
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <div className="drop-prompt">
            <span className="upload-icon">⬆️</span>
            <p>{isDragActive ? 'Drop it here' : 'Drag & drop your PDF here'}</p>
            <span className="browse-hint">or click to browse</span>
          </div>
        )}
      </div>
      <button
        className="btn-primary btn-go"
        disabled={!file || loading}
        onClick={onGo}
      >
        {loading ? 'Analyzing...' : 'Analyze Resume →'}
      </button>
    </div>
  );
}
