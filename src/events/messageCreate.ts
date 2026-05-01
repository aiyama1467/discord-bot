import { type Client, Events, type Message } from "discord.js";

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

export default function register(client: Client): void {
	client.on(Events.MessageCreate, async (message) => {
		if (message.author.bot) return;
		if (!message.inGuild()) return;

		if (isSpam(message.author.id)) {
			await handleSpam(message);
		}
	});
}
