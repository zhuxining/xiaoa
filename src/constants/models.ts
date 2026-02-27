export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export const MODELS: ModelInfo[] = [
  {
    id: "claude-sonnet-4-5-20250514",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-opus-4-5-20250514",
    name: "Claude Opus 4.5",
    provider: "anthropic",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
  },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai" },
  { id: "deepseek-chat", name: "DeepSeek Chat", provider: "deepseek" },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", provider: "deepseek" },
  { id: "llama3.1", name: "Llama 3.1", provider: "ollama" },
  { id: "llama3.2", name: "Llama 3.2", provider: "ollama" },
  { id: "mistral", name: "Mistral", provider: "ollama" },
  { id: "codellama", name: "Code Llama", provider: "ollama" },
];

export const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "ollama", name: "Ollama" },
  { id: "custom", name: "自定义" },
] as const;

export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getModelName(id: string): string {
  return MODELS.find((m) => m.id === id)?.name ?? id;
}
