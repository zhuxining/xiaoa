import { join } from "node:path";
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { app } from "electron";
import { readConfig } from "@/ipc/config/store";
import { getKnowledgeContent, listKnowledge } from "@/ipc/knowledge/store";
import { getMemory } from "@/ipc/memory/store";
import { listProjects } from "@/ipc/project/store";
import { getSession as getWorkspaceSession } from "@/ipc/sisson/workspace-store";
import { listSkills } from "@/ipc/skill/store";
import { getWorkspace } from "@/ipc/workspace/store";
import type { ActiveRun, ToolContext } from "../run/run-types";
import { createTools } from "../tools";
import { patchToolsWithPermission } from "../tools/permission-guard";
import { filterToLlmMessages } from "./convert-to-llm";
import { buildContextTransform } from "./transform-context";

type GetModelArgs = Parameters<typeof getModel>;
type GetModelReturn = ReturnType<typeof getModel>;

const DEEPSEEK_MODELS: Record<string, { name: string; reasoning: boolean }> = {
  "deepseek-chat": { name: "DeepSeek Chat (V3)", reasoning: false },
  "deepseek-reasoner": { name: "DeepSeek Reasoner (R1)", reasoning: true },
};

export function resolveProjectRoot(run: ActiveRun): string | null {
  if (run.scope === "global" || !run.workspaceId) {
    return null;
  }

  const session = getWorkspaceSession(run.workspaceId, run.sessionId);
  if (!session?.projectId) {
    return null;
  }

  const project = listProjects(run.workspaceId).find(
    (item) => item.id === session.projectId
  );
  if (project?.path) {
    return project.path;
  }
  return join(app.getPath("userData"), "workspaces", run.workspaceId);
}

export function composeSystemPrompt(workspaceId: string): string {
  const workspace = getWorkspace(workspaceId);
  const memory = getMemory(workspaceId).content.slice(0, 2200);
  const skills = listSkills(workspaceId)
    .filter((item) => item.enabled)
    .map((item) => {
      const hint = item.argumentHint ? ` 参数: ${item.argumentHint}` : "";
      return `- ${item.name}: ${item.description || "无描述"}${hint}`;
    })
    .join("\n");
  const knowledge = listKnowledge(workspaceId)
    .filter((item) => item.status === "ready")
    .slice(0, 20)
    .map((item) => `- ${item.name}: ${item.description ?? ""}`)
    .join("\n");

  return [
    workspace?.agent?.systemPrompt || "你是一个专业、务实的助手。",
    "",
    "可用技能：",
    skills || "- 无",
    "",
    "知识库概览：",
    knowledge || "- 无",
    "",
    "长期记忆（节选）：",
    memory,
  ].join("\n");
}

function composeGlobalSystemPrompt(): string {
  const sections = ["你是小 A，一个友好、专业的 AI 助手。"];
  sections.push("\n你可以使用 file_read、file_list 等工具帮助用户。");
  return sections.join("\n");
}

export function shouldUsePiAgent(_run: ActiveRun): boolean {
  const config = readConfig();
  // Fallback for local/custom providers without API keys
  if (config.llm.provider === "ollama" || config.llm.provider === "custom") {
    return false;
  }
  return !!config.llm.apiKey;
}

// Providers natively supported by pi-ai's getModel
const PI_AI_NATIVE_PROVIDERS = [
  "anthropic",
  "openai",
  "azure-openai-responses",
  "google",
  "google-vertex",
  "google-gemini-cli",
  "xai",
  "groq",
  "cerebras",
  "openrouter",
  "vercel-ai-gateway",
  "mistral",
  "minimax",
  "kimi-coding",
] as const;

type PiAiProvider = (typeof PI_AI_NATIVE_PROVIDERS)[number];

function isPiAiNativeProvider(provider: string): provider is PiAiProvider {
  return PI_AI_NATIVE_PROVIDERS.includes(provider as PiAiProvider);
}

export function getModelFromConfig(): GetModelReturn {
  const config = readConfig();
  const provider = config.llm.provider;

  // Handle custom OpenAI-compatible providers
  if (provider === "deepseek") {
    const meta = DEEPSEEK_MODELS[config.llm.model] ?? {
      name: config.llm.model,
      reasoning: false,
    };
    return {
      id: config.llm.model,
      name: meta.name,
      api: "openai-completions",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      reasoning: meta.reasoning,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64_000,
      maxTokens: 8000,
    } as unknown as GetModelReturn;
  }

  if (provider === "ollama") {
    return {
      id: config.llm.model,
      name: config.llm.model,
      api: "openai-completions",
      provider: "ollama",
      baseUrl: config.llm.endpoint || "http://localhost:11434/v1",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 4096,
    } as unknown as GetModelReturn;
  }

  if (provider === "custom") {
    if (!config.llm.endpoint) {
      throw new Error("custom provider 需要配置 endpoint");
    }
    return {
      id: config.llm.model,
      name: config.llm.model,
      api: "openai-completions",
      provider: "custom",
      baseUrl: config.llm.endpoint,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,
      maxTokens: 4096,
    } as unknown as GetModelReturn;
  }

  // Use pi-ai's native getModel for supported providers
  if (isPiAiNativeProvider(provider)) {
    const model = getModel(
      provider as GetModelArgs[0],
      config.llm.model as unknown as GetModelArgs[1]
    );

    if (!model) {
      throw new Error(
        `模型 "${config.llm.model}" 在 ${provider} 中不存在，请在设置中选择有效的模型`
      );
    }

    return model;
  }

  throw new Error(`不支持的 provider: ${provider}`);
}

export function getApiKeyForProvider(provider: string): string {
  const config = readConfig();
  if (provider === config.llm.provider && config.llm.apiKey) {
    return config.llm.apiKey;
  }
  return "";
}

export function createAgent(run: ActiveRun): Agent {
  const projectRoot = resolveProjectRoot(run);
  const systemPrompt = run.workspaceId
    ? composeSystemPrompt(run.workspaceId)
    : composeGlobalSystemPrompt();

  const model = getModelFromConfig();

  const toolContext: ToolContext = {
    run,
    projectRoot,
  };

  const baseTools = run.workspaceId ? createTools(toolContext) : [];
  const tools = patchToolsWithPermission(baseTools, toolContext);

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      tools,
      messages: [],
      thinkingLevel: "minimal",
      isStreaming: false,
      streamMessage: null,
      pendingToolCalls: new Set(),
    },
    sessionId: run.key,
    convertToLlm: filterToLlmMessages,
    transformContext: buildContextTransform(run),
    getApiKey: async (provider: string) => getApiKeyForProvider(provider),
  });

  return agent;
}

export function knowledgeRead(
  workspaceId: string,
  query?: string,
  id?: string,
  limit = 3
): string {
  const ready = listKnowledge(workspaceId).filter(
    (item) => item.status === "ready"
  );
  let selected = ready;

  if (id) {
    selected = ready.filter((item) => item.id === id);
  } else if (query) {
    const lower = query.toLowerCase();
    selected = ready.filter((item) => {
      const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(lower);
    });
  }

  const top = selected.slice(0, limit);
  if (top.length === 0) {
    return "未找到可用知识。";
  }

  const chunks: string[] = [];
  for (const item of top) {
    const content = getKnowledgeContent(workspaceId, item.id);
    if (!content) {
      continue;
    }
    chunks.push(`# ${item.name}\n${content.content.slice(0, 1500)}`);
  }

  return chunks.length > 0 ? chunks.join("\n\n") : "知识内容暂不可用。";
}
