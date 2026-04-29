export type BlockType =
  | 'markdown'
  | 'chart'
  | 'table'
  | 'mermaid'
  | 'html'
  | 'react'
  | 'svg'
  | 'math'
  | 'code';

export type Block =
  | { type: 'markdown'; content: string }
  | { type: 'chart'; content: string; raw: string }
  | { type: 'table'; content: string }
  | { type: 'mermaid'; content: string }
  | { type: 'html'; content: string; title?: string }
  | { type: 'react'; content: string; title?: string }
  | { type: 'svg'; content: string }
  | { type: 'math'; content: string; display: boolean }
  | { type: 'code'; content: string; language: string; filename?: string };

export interface Artifact {
  id: string;
  type: 'html' | 'react' | 'chart' | 'mermaid' | 'code';
  title: string;
  content: string;
  createdAt: string;
  versions: ArtifactVersion[];
}

export interface ArtifactVersion {
  id: string;
  content: string;
  timestamp: string;
  label?: string;
}
