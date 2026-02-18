import { z } from "zod";

export const projectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  path: z.string(),
});

export const fileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    type: z.enum(["file", "folder"]),
    children: z.array(fileNodeSchema).optional(),
  })
);

export const fileInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  content: z.string(),
  size: z.number(),
  lastModified: z.number(),
});

export const listProjectsInputSchema = z.object({
  workspaceId: z.string(),
});

export const addProjectInputSchema = z.object({
  workspaceId: z.string(),
  path: z.string(),
});

export const removeProjectInputSchema = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const readDirInputSchema = z.object({
  path: z.string(),
  depth: z.number().int().min(1).max(5).optional(),
});

export const readFileInputSchema = z.object({
  path: z.string(),
});

export type Project = z.infer<typeof projectSchema>;
export type FileInfo = z.infer<typeof fileInfoSchema>;

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}
