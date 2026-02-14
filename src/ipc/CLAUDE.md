---
title: "Inter-Process Communication (IPC)"
description: "How to use IPC in electron-shadcn to enable communication between the main process and renderer processes."
---

import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";

electron-shadcn uses [oRPC](https://orpc.dev) for type-safe Inter-Process Communication (IPC) between the main process and renderer processes. This approach provides full TypeScript type inference, making your IPC calls as safe as regular function calls.

## Why oRPC?

Traditional Electron IPC can be error-prone:

- No type safety between processes
- Easy to misspell channel names
- No autocomplete for parameters or return types
- Runtime errors instead of compile-time errors

With oRPC, you get:

- **End-to-end type safety**: Full TypeScript inference from renderer to main
- **Schema validation**: Input validation with Zod
- **Autocomplete**: IDE suggestions for all IPC calls
- **Refactoring support**: Rename procedures and TypeScript catches all usages

## Directory Structure

IPC-related code is organized in the following directories:

```
src/
├── actions/          # Client-side actions (renderer)
├── ipc/              # IPC configuration and handlers
│   ├── theme/        # Theme-related IPC
│   └── window/       # Window control IPC
```

## Creating a New IPC Procedure

<Steps>
<Step>
### Define the Schema

Create a Zod schema for your procedure's input:

```ts
// src/ipc/files/schema.ts
import { z } from "zod";

export const readFileSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
});

export const writeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});
```

</Step>

<Step>
### Create the Handler (Main Process)

Define the handler that runs in the main process:

```ts
// src/ipc/files/handler.ts
import { os } from "@orpc/server";
import { readFileSchema, writeFileSchema } from "./schema";
import fs from "fs/promises";

export const filesRouter = os.router({
  readFile: os
    .input(readFileSchema)
    .handler(async ({ input }) => {
      const content = await fs.readFile(input.path, input.encoding);
      return { content };
    }),

  writeFile: os
    .input(writeFileSchema)
    .handler(async ({ input }) => {
      await fs.writeFile(input.path, input.content);
      return { success: true };
    }),
});
```

</Step>

<Step>
### Register the Router

Add your router to the main IPC configuration:

```ts
// src/ipc/router.ts
import { os } from "@orpc/server";
import { windowRouter } from "./window/handler";
import { themeRouter } from "./theme/handler";
import { filesRouter } from "./files/handler";

export const appRouter = os.router({
  window: windowRouter,
  theme: themeRouter,
  files: filesRouter, // Add your new router
});

export type AppRouter = typeof appRouter;
```

</Step>

<Step>
### Create the Action (Renderer)

Create a client-side action to call the IPC procedure:

```ts
// src/actions/files.ts
import { client } from "@/ipc/client";

export async function readFile(path: string, encoding?: "utf-8" | "base64") {
  return client.files.readFile({ path, encoding });
}

export async function writeFile(path: string, content: string) {
  return client.files.writeFile({ path, content });
}
```

</Step>

<Step>
### Use in Components

Call your actions from React components:

```tsx
// src/routes/index.tsx
import { readFile, writeFile } from "@/actions/files";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const handleReadFile = async () => {
    const result = await readFile("/path/to/file.txt");
    console.log(result.content);
  };

  return (
    <Button onClick={handleReadFile}>
      Read File
    </Button>
  );
}
```

</Step>
</Steps>

## Built-in IPC Procedures

electron-shadcn comes with pre-configured IPC procedures:

### Window Controls

Control the application window from the renderer:

```ts
import { minimizeWindow, maximizeWindow, closeWindow } from "@/actions/window";

// Minimize the window
await minimizeWindow();

// Maximize/restore the window
await maximizeWindow();

// Close the window
await closeWindow();
```

### Theme Management

Control the application theme:

```ts
import { setTheme, getTheme } from "@/actions/theme";

// Set theme to dark mode
await setTheme("dark");

// Set theme to light mode
await setTheme("light");

// Use system preference
await setTheme("system");

// Get current theme
const currentTheme = await getTheme();
```

## Using with React Query

If you want to integrate IPC calls with React Query for caching and state management, you can create custom hooks:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { readFile, writeFile } from "@/actions/files";

export function useFileContent(path: string) {
  return useQuery({
    queryKey: ["file", path],
    queryFn: () => readFile(path),
  });
}

export function useWriteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      writeFile(path, content),
    onSuccess: (_, { path }) => {
      // Invalidate the file query to refetch
      queryClient.invalidateQueries({ queryKey: ["file", path] });
    },
  });
}
```

Then use in components:

```tsx
export default function FileEditor({ path }: { path: string }) {
  const { data, isLoading, error } = useFileContent(path);
  const writeMutation = useWriteFile();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading file</div>;

  return (
    <div>
      <textarea defaultValue={data?.content} />
      <Button
        onClick={() => writeMutation.mutate({ path, content: "new content" })}
        disabled={writeMutation.isPending}
      >
        Save
      </Button>
    </div>
  );
}
```

## Error Handling

Handle IPC errors gracefully:

```ts
// In your handler
import { os } from "@orpc/server";
import { ORPCError } from "@orpc/server";

export const filesRouter = os.router({
  readFile: os
    .input(readFileSchema)
    .handler(async ({ input }) => {
      try {
        const content = await fs.readFile(input.path, input.encoding);
        return { content };
      } catch (error) {
        if (error.code === "ENOENT") {
          throw new ORPCError({
            code: "NOT_FOUND",
            message: `File not found: ${input.path}`,
          });
        }
        throw new ORPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to read file",
        });
      }
    }),
});
```

Handle errors in the renderer:

```tsx
const handleReadFile = async () => {
  try {
    const result = await readFile("/path/to/file.txt");
    console.log(result.content);
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      toast.error("File not found");
    } else {
      toast.error("An error occurred");
    }
  }
};
```

## Input Validation with Zod

oRPC uses Zod for runtime validation. Define complex schemas for your inputs:

```ts
import { z } from "zod";

// Complex nested schema
export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]),
    notifications: z.boolean(),
  }),
});

// Array inputs
export const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// Union types
export const exportFormatSchema = z.discriminatedUnion("format", [
  z.object({ format: z.literal("json"), pretty: z.boolean() }),
  z.object({ format: z.literal("csv"), delimiter: z.string() }),
]);
```

<Callout type="info">
Zod schemas provide both compile-time TypeScript types and runtime validation, ensuring your IPC calls are always type-safe.
</Callout>

## Best Practices

- **Keep handlers focused**: Each handler should do one thing well
- **Use meaningful names**: Name procedures descriptively (e.g., `readUserSettings` not `getData`)
- **Validate inputs**: Always define Zod schemas for input validation
- **Handle errors**: Provide meaningful error messages for debugging
- **Organize by feature**: Group related IPC procedures in feature-specific directories
