export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Bot {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: number;
  bot_id: number;
  name: string;
  system_prompt: string;
  user_prompt: string;
  dev_prompt: string;
  params: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface PromptParams {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  [key: string]: any;
}

// For UI state
export type ViewState = 'dashboard' | 'editor';
