import {
	type ChatInputCommandInteraction,
	type Client,
	SlashCommandBuilder,
	TextChannel,
} from "discord.js";
import type { Command } from "../types.js";

interface Reminder {
	id: number;
	userId: string;
	channelId: string;
	message: string;
	fireAt: Date;
	timeout: NodeJS.Timeout;
}

const MIN_MS = 10_000;
const MAX_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_USER = 5;

// userId → Reminder[]
const reminders = new Map<string, Reminder[]>();

function parseTime(input: string): number | null {
	const match = input.trim().match(/^(\d+)(s|m|h|d)$/);
	if (!match) return null;
	const value = parseInt(match[1], 10);
	const unit = match[2];
	const multipliers: Record<string, number> = {
		s: 1_000,
		m: 60_000,
		h: 3_600_000,
		d: 86_400_000,
	};
	return value * multipliers[unit];
}

function nextId(userReminders: Reminder[]): number {
	const used = new Set(userReminders.map((r) => r.id));
	for (let i = 1; i <= MAX_PER_USER; i++) {
		if (!used.has(i)) return i;
	}
	return -1;
}

function formatDuration(ms: number): string {
	if (ms < 60_000) return `${ms / 1000}秒`;
	if (ms < 3_600_000) return `${ms / 60_000}分`;
	if (ms < 86_400_000) return `${ms / 3_600_000}時間`;
	return `${ms / 86_400_000}日`;
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName("remind")
		.setDescription("リマインダーを管理します")
		.addSubcommand((sub) =>
			sub
				.setName("set")
				.setDescription("リマインダーを登録します")
				.addStringOption((opt) =>
					opt
						.setName("time")
						.setDescription("通知までの時間（例: 30m, 2h, 1d）")
						.setRequired(true),
				)
				.addStringOption((opt) =>
					opt.setName("message").setDescription("通知内容").setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub.setName("list").setDescription("登録中のリマインダーを表示します"),
		)
		.addSubcommand((sub) =>
			sub
				.setName("cancel")
				.setDescription("リマインダーをキャンセルします")
				.addIntegerOption((opt) =>
					opt
						.setName("id")
						.setDescription("キャンセルするリマインダーのID")
						.setRequired(true)
						.setMinValue(1)
						.setMaxValue(MAX_PER_USER),
				),
		),

	async execute(interaction: ChatInputCommandInteraction, client: Client) {
		const sub = interaction.options.getSubcommand();
		const userId = interaction.user.id;

		if (sub === "set") {
			const timeInput = interaction.options.getString("time", true);
			const message = interaction.options.getString("message", true);

			const ms = parseTime(timeInput);
			if (ms === null) {
				await interaction.reply({
					content: "❌ `10s〜7d` の形式で入力してください（例: 30m, 2h）",
					ephemeral: true,
				});
				return;
			}
			if (ms < MIN_MS) {
				await interaction.reply({
					content: "❌ 最短は **10秒** です",
					ephemeral: true,
				});
				return;
			}
			if (ms > MAX_MS) {
				await interaction.reply({
					content: "❌ 最長は **7日** です",
					ephemeral: true,
				});
				return;
			}

			const userReminders = reminders.get(userId) ?? [];
			if (userReminders.length >= MAX_PER_USER) {
				await interaction.reply({
					content:
						"❌ リマインダーは最大5件までです。`/remind cancel` で削除してください",
					ephemeral: true,
				});
				return;
			}

			const id = nextId(userReminders);
			const channelId = interaction.channelId;

			const timeout = setTimeout(async () => {
				const ch = await client.channels.fetch(channelId).catch(() => null);
				if (ch instanceof TextChannel) {
					await ch.send(`⏰ <@${userId}> ${message}`);
				}
				const list = reminders.get(userId);
				if (list) {
					const updated = list.filter((r) => r.id !== id);
					if (updated.length === 0) {
						reminders.delete(userId);
					} else {
						reminders.set(userId, updated);
					}
				}
			}, ms);

			userReminders.push({
				id,
				userId,
				channelId,
				message,
				fireAt: new Date(Date.now() + ms),
				timeout,
			});
			reminders.set(userId, userReminders);

			await interaction.reply({
				content: `⏰ **${formatDuration(ms)}後**にリマインドします：${message}（ID: ${id}）`,
				ephemeral: true,
			});
			return;
		}

		if (sub === "list") {
			const userReminders = reminders.get(userId);
			if (!userReminders || userReminders.length === 0) {
				await interaction.reply({
					content: "📭 登録中のリマインダーはありません",
					ephemeral: true,
				});
				return;
			}

			const lines = userReminders.map((r) => {
				const remaining = Math.max(0, r.fireAt.getTime() - Date.now());
				return `**ID ${r.id}** — ${r.message}（あと ${formatDuration(remaining)}）`;
			});

			await interaction.reply({
				content: `📋 **登録中のリマインダー**\n${lines.join("\n")}`,
				ephemeral: true,
			});
			return;
		}

		if (sub === "cancel") {
			const id = interaction.options.getInteger("id", true);
			const userReminders = reminders.get(userId);
			const target = userReminders?.find((r) => r.id === id);

			if (!target) {
				await interaction.reply({
					content: `❌ ID ${id} のリマインダーは見つかりませんでした`,
					ephemeral: true,
				});
				return;
			}

			clearTimeout(target.timeout);
			const updated = userReminders!.filter((r) => r.id !== id);
			if (updated.length === 0) {
				reminders.delete(userId);
			} else {
				reminders.set(userId, updated);
			}

			await interaction.reply({
				content: `🗑️ リマインダー（ID: ${id}）をキャンセルしました：${target.message}`,
				ephemeral: true,
			});
		}
	},
};

export default command;
