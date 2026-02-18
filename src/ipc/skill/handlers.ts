import { os } from "@orpc/server";
import {
  createSkillInputSchema,
  deleteSkillInputSchema,
  getSkillInputSchema,
  listSkillsInputSchema,
  updateSkillInputSchema,
} from "./schemas";
import {
  createSkill as createSkillStore,
  deleteSkill as deleteSkillStore,
  getSkill as getSkillStore,
  listSkills,
  updateSkill as updateSkillStore,
} from "./store";

// 列出工作区的所有技能
export const getSkills = os
  .input(listSkillsInputSchema)
  .handler(({ input }) => {
    return listSkills(input.workspaceId);
  });

// 获取单个技能
export const getSkill = os.input(getSkillInputSchema).handler(({ input }) => {
  return getSkillStore(input.workspaceId, input.id);
});

// 创建技能
export const createSkill = os
  .input(createSkillInputSchema)
  .handler(({ input }) => {
    return createSkillStore(
      input.workspaceId,
      input.name,
      input.prompt,
      input.description
    );
  });

// 更新技能
export const updateSkill = os
  .input(updateSkillInputSchema)
  .handler(({ input }) => {
    const { id, workspaceId, ...updates } = input;
    return updateSkillStore(workspaceId, id, updates);
  });

// 删除技能
export const deleteSkill = os
  .input(deleteSkillInputSchema)
  .handler(({ input }) => {
    const success = deleteSkillStore(input.workspaceId, input.id);
    return { success, id: input.id };
  });
