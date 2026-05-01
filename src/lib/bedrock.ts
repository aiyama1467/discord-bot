import {
	BedrockRuntimeClient,
	ConverseCommand,
	type Message,
} from "@aws-sdk/client-bedrock-runtime";

const MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0";
const MAX_TOKENS = 1024;

const client = new BedrockRuntimeClient({
	region: process.env.AWS_REGION ?? "us-east-1",
});

const TOOLS = [
	{
		toolSpec: {
			name: "web_search",
			description: "Search the web for current information about a topic.",
			inputSchema: {
				json: {
					type: "object" as const,
					properties: {
						query: {
							type: "string",
							description: "Search query",
						},
					},
					required: ["query"],
				},
			},
		},
	},
];

async function tavilySearch(query: string): Promise<string> {
	const apiKey = process.env.TAVILY_API_KEY;
	if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

	const res = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			api_key: apiKey,
			query,
			search_depth: "basic",
			max_results: 5,
		}),
	});

	if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);

	const data = (await res.json()) as {
		results: Array<{ title: string; url: string; content: string }>;
	};

	return data.results
		.map((r) => `[${r.title}](${r.url})\n${r.content}`)
		.join("\n\n");
}

export async function askWithSearch(question: string): Promise<string> {
	const messages: Message[] = [{ role: "user", content: [{ text: question }] }];

	const res1 = await client.send(
		new ConverseCommand({
			modelId: MODEL_ID,
			messages,
			toolConfig: { tools: TOOLS },
			inferenceConfig: { maxTokens: MAX_TOKENS },
		}),
	);

	if (res1.stopReason !== "tool_use") {
		const block = res1.output?.message?.content?.[0];
		return block && "text" in block
			? (block.text ?? "")
			: "回答を生成できませんでした。";
	}

	const assistantContent = res1.output?.message?.content ?? [];
	const toolUseBlock = assistantContent.find((b) => "toolUse" in b);
	if (!toolUseBlock || !("toolUse" in toolUseBlock)) {
		return "回答を生成できませんでした。";
	}

	const { toolUseId, input } = toolUseBlock.toolUse!;
	const searchResults = await tavilySearch((input as { query: string }).query);

	messages.push({ role: "assistant", content: assistantContent });
	messages.push({
		role: "user",
		content: [
			{
				toolResult: {
					toolUseId,
					content: [{ text: searchResults }],
				},
			},
		],
	});

	const res2 = await client.send(
		new ConverseCommand({
			modelId: MODEL_ID,
			messages,
			toolConfig: { tools: TOOLS },
			inferenceConfig: { maxTokens: MAX_TOKENS },
		}),
	);

	const block = res2.output?.message?.content?.[0];
	return block && "text" in block
		? (block.text ?? "")
		: "回答を生成できませんでした。";
}
