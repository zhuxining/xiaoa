# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

小 A 是一个为非Coding群体打造的Agent工作站。基于`@mariozechner/pi-agent-core`sdk的Agent基础集成能力，参考 `craft-agents-oss` 的产品设计。

**技术栈**: Electron-forge + React 19 | TailwindCSS 4 + shadcn/ui | Jotai
**设计文档**: 架构设计文档位于 `docs/design/architecture.md`，包含详细的设计决策和架构图。

## 子包文档

各子包有独立的 CLAUDE.md，包含领域专属指导：

## 项目结构

```text
xiaoa/

```

## 常用开发命令

```sh
bun run start  #Start the app in development mode
bun run package  #Package the app into an executable bundle
bun run make  #Generate platform-specific distributables (.exe, .dmg, etc.)
bun run publish  #Publish the app to configured publishers
bun run check  #Run Ultracite to check code quality
bun run fix  #Run Ultracite to fix code issues
bun run bump-ui  #Update shadcn-ui components
bun run clean #claen cache
bun run test  #Run unit tests with Vitest
bun run test:watch  #Run Vitest in watch mode
bun run test:unit  #Run unit tests with Vitest (interactive)
bun run test:e2e  #Run end-to-end tests with Playwright
bun run test:all  #Run both unit and E2E tests

```

## 架构概览

## 反模式

## 相关资源

- [产品设计参考](references/craft-agents-oss) — 项目架构参考
- [PI-sdk使用参考](references/pi-mono) — 基础能力参考
