import { memo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { codeToHtml } from "shiki";
import { cn } from "../lib/utils";

interface CodeBlockProps {
	language: string;
	code: string;
	className?: string;
}

const CodeBlock = memo(function CodeBlock({
	language,
	code,
	className,
}: CodeBlockProps) {
	const [html, setHtml] = useState<string>("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);

		codeToHtml(code, {
			lang: language || "text",
			theme: "github-dark",
		})
			.then((result) => {
				if (!cancelled) {
					setHtml(result);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [code, language]);

	if (loading) {
		return (
			<pre
				className={cn(
					"shiki bg-zinc-900 rounded-lg p-4 overflow-x-auto",
					className,
				)}
			>
				<code>{code}</code>
			</pre>
		);
	}

	// shiki generates safe HTML for syntax highlighting - no user content is rendered
	return (
		<div
			className={cn(
				"shiki [&_pre]:bg-zinc-900 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto",
				className,
			)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is safe
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
});

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

interface MarkdownProps {
	children: string;
	className?: string;
	proseClassName?: string;
}

export function Markdown({
	children,
	className,
	proseClassName = "prose prose-sm dark:prose-invert max-w-none",
}: MarkdownProps) {
	return (
		<div className={cn(proseClassName, className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeRaw]}
				components={{
					code({ className: codeClassName, children, ...props }) {
						const isInline = !codeClassName;
						const match = /language-(\w+)/.exec(codeClassName || "");
						const codeString = String(children).replace(/\n$/, "");

						if (isInline) {
							return (
								<code
									className={cn(
										"px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-sm font-mono",
										codeClassName,
									)}
									{...props}
								>
									{children}
								</code>
							);
						}

						return (
							<CodeBlock
								language={match?.[1] || "text"}
								code={codeString}
								className="my-2"
							/>
						);
					},
				}}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
}
