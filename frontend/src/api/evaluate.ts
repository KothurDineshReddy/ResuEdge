import axios from 'axios';
import { EvaluationResult } from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export async function evaluateResume(
  pdf: File,
  geminiApiKey: string,
  model: string
): Promise<EvaluationResult> {
  const form = new FormData();
  form.append('pdf', pdf);
  form.append('gemini_api_key', geminiApiKey);
  form.append('model', model);

  const response = await axios.post<EvaluationResult>(
    `${BASE_URL}/api/evaluate`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return response.data;
}

export async function fetchModels(): Promise<{ models: string[]; default: string }> {
  const response = await axios.get(`${BASE_URL}/api/models`);
  return response.data;
}
