import { ScrollArea } from "@/components/ui/scroll-area";
import { type Skill, SkillCard } from "./skill-card";

interface SkillListProps {
  skills: Skill[];
  selectedSkillId: string | null;
  onSkillSelect: (id: string) => void;
  className?: string;
}

export function SkillList({
  skills,
  selectedSkillId,
  onSkillSelect,
  className,
}: SkillListProps) {
  return (
    <ScrollArea className={className}>
      <div className="flex flex-col gap-2 p-4">
        {skills.map((skill) => (
          <SkillCard
            isSelected={skill.id === selectedSkillId}
            key={skill.id}
            onClick={() => onSkillSelect(skill.id)}
            skill={skill}
          />
        ))}
        {skills.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            暂无技能
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
