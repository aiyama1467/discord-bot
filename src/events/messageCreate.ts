import { type Client, Events, type Message } from "discord.js";
import { askWithSearch } from "../lib/bedrock.js";

// Per-user message timestamps for spam detection
const messageTimes = new Map<string, number[]>();

const SPAM_WINDOW_MS = 5_000;
const SPAM_THRESHOLD = 5;

function isSpam(userId: string): boolean {
	const now = Date.now();
	const times = (messageTimes.get(userId) ?? []).filter(
		(t) => now - t < SPAM_WINDOW_MS,
	);
	times.push(now);
	messageTimes.set(userId, times);
	return times.length >= SPAM_THRESHOLD;
}

async function handleSpam(message: Message<true>): Promise<void> {
	try {
		await message.delete();
	} catch {
		// Message may already be deleted
	}
	await message.channel.send(
		`⚠️ ${message.author} スパムを検知しました。メッセージを削除しました。`,
	);
}

async function handleAsk(
	message: Message<true>,
	client: Client,
): Promise<void> {
	const question = message.content.replace(/<@!?\d+>/g, "").trim();
	if (!question) return;

	await message.channel.sendTyping();

	try {
		const answer = await askWithSearch(question);
		const reply = answer.length > 1990 ? `${answer.slice(0, 1990)}…` : answer;
		await message.reply(reply);
	} catch (err) {
		console.error(err);
		await message.reply(
			"エラーが発生しました。しばらく後にもう一度お試しください。",
		);
	}
}

export default function register(client: Client): void {
	client.on(Events.MessageCreate, async (message) => {
		if (message.author.bot) return;
		if (!message.inGuild()) return;

		const botId = client.user?.id;
		if (botId && message.mentions.has(botId)) {
			await handleAsk(message, client);
			return;
		}

		if (isSpam(message.author.id)) {
			await handleSpam(message);
		}
	});
}
