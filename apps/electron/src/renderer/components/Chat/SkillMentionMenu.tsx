import { useAtomValue } from "jotai";
import { skillsAtom } from "../../atoms";

interface SkillMentionMenuProps {
	query: string;
	onSelect: (skill: { name: string; description: string }) => void;
}

export function SkillMentionMenu({ query, onSelect }: SkillMentionMenuProps) {
	const skills = useAtomValue(skillsAtom);

	const filteredSkills = skills.filter(
		(s) =>
			s.invocation !== "model-only" &&
			(s.name.toLowerCase().includes(query.toLowerCase()) ||
				s.description.toLowerCase().includes(query.toLowerCase())),
	);

	if (filteredSkills.length === 0) {
		return null;
	}

	return (
		<div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
			<div className="p-2">
				<div className="text-xs text-muted-foreground mb-2">技能</div>
				{filteredSkills.map((skill) => (
					<button
						key={skill.name}
						type="button"
						onClick={() => onSelect(skill)}
						className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2"
					>
						{skill.icon && <span className="text-lg">{skill.icon}</span>}
						<div className="flex-1">
							<div className="font-medium">{skill.name}</div>
							<div className="text-xs text-muted-foreground truncate">
								{skill.description}
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
