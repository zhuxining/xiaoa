import { useAtom } from "jotai";
import { globalConfigAtom } from "../../atoms";

export function SettingsPage() {
	const [config, setConfig] = useAtom(globalConfigAtom);

	return (
		<div className="p-6 max-w-2xl">
			<h1 className="text-2xl font-bold mb-6">设置</h1>

			{/* LLM 配置 */}
			<section className="mb-8">
				<h2 className="text-lg font-semibold mb-4">LLM 服务</h2>
				<div className="space-y-4">
					<div>
						<label
							htmlFor="llm-provider"
							className="block text-sm font-medium mb-1"
						>
							服务商
						</label>
						<select id="llm-provider" className="input-base w-full">
							<option>Anthropic</option>
							<option>OpenAI</option>
							<option>OpenRouter</option>
						</select>
					</div>
					<div>
						<label
							htmlFor="llm-api-key"
							className="block text-sm font-medium mb-1"
						>
							API Key
						</label>
						<input
							id="llm-api-key"
							type="password"
							className="input-base w-full"
							placeholder="•••••••••"
						/>
					</div>
					<div>
						<label
							htmlFor="llm-model"
							className="block text-sm font-medium mb-1"
						>
							默认模型
						</label>
						<select id="llm-model" className="input-base w-full">
							<option>Claude Sonnet 4.5</option>
							<option>Claude Opus 4.6</option>
						</select>
					</div>
				</div>
			</section>

			{/* 外观 */}
			<section className="mb-8">
				<h2 className="text-lg font-semibold mb-4">外观</h2>
				<div className="space-y-4">
					<div>
						<fieldset>
							<legend className="block text-sm font-medium mb-1">主题</legend>
							<div className="flex gap-2">
								{["light", "dark", "system"].map((theme) => (
									<label key={theme} className="flex items-center gap-2">
										<input
											type="radio"
											name="theme"
											checked={config.preferences.theme === theme}
											onChange={() =>
												setConfig({
													...config,
													preferences: {
														...config.preferences,
														theme: theme as "light" | "dark" | "system",
													},
												})
											}
										/>
										<span className="capitalize text-sm">{theme}</span>
									</label>
								))}
							</div>
						</fieldset>
					</div>
				</div>
			</section>

			{/* 关于 */}
			<section>
				<h2 className="text-lg font-semibold mb-4">关于</h2>
				<p className="text-sm text-muted-foreground">版本 v0.1.0</p>
			</section>
		</div>
	);
}
