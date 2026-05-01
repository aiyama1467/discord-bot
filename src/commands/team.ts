import {
	type ChatInputCommandInteraction,
	type Client,
	type Message,
	SlashCommandBuilder,
	TextChannel,
} from "discord.js";
import type { Command } from "../types.js";

interface TeamSession {
	messageId: string;
	channelId: string;
	teamCount: number;
	timeout: NodeJS.Timeout;
	client: Client;
}

// guildId → session
const sessions = new Map<string, TeamSession>();

const REACT_EMOJI = "✅";
const SESSION_DURATION_MS = 60_000;

async function closeSession(guildId: string): Promise<string> {
	const session = sessions.get(guildId);
	if (!session) return "アクティブなチーム分けセッションがありません。";

	clearTimeout(session.timeout);
	sessions.delete(guildId);

	const channel = await session.client.channels.fetch(session.channelId);
	if (!channel || !(channel instanceof TextChannel)) {
		return "チャンネルが見つかりませんでした。";
	}

	const message: Message = await channel.messages.fetch(session.messageId);
	const reaction = message.reactions.cache.get(REACT_EMOJI);
	if (!reaction) return "リアクションが見つかりませんでした。";

	const users = await reaction.users.fetch();
	const participants = users.filter((u) => !u.bot).map((u) => u.toString());

	if (participants.length < session.teamCount) {
		return `参加者が少なすぎます（${participants.length} 人 < ${session.teamCount} チーム）。`;
	}

	// Fisher-Yates shuffle
	for (let i = participants.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[participants[i], participants[j]] = [participants[j], participants[i]];
	}

	const teams: string[][] = Array.from({ length: session.teamCount }, () => []);
	participants.forEach((p, i) => {
		teams[i % session.teamCount].push(p);
	});

	const teamLines = teams
		.map((members, i) => `**チーム ${i + 1}**: ${members.join(", ")}`)
		.join("\n");

	return `⚔️ チーム分け結果（${participants.length} 人 → ${session.teamCount} チーム）\n${teamLines}`;
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName("team")
		.setDescription("チーム分けを管理します")
		.addSubcommand((sub) =>
			sub
				.setName("start")
				.setDescription("チーム分けを開始します")
				.addIntegerOption((opt) =>
					opt
						.setName("count")
						.setDescription("チーム数（2〜10）")
						.setRequired(true)
						.setMinValue(2)
						.setMaxValue(10),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName("close")
				.setDescription("参加受付を締め切り、チームを発表します"),
		),

	async execute(interaction: ChatInputCommandInteraction, client: Client) {
		const guildId = interaction.guildId;
		if (!guildId) {
			await interaction.reply({
				content: "サーバー内でのみ使用できます。",
				ephemeral: true,
			});
			return;
		}

		const sub = interaction.options.getSubcommand();

		if (sub === "start") {
			if (sessions.has(guildId)) {
				await interaction.reply({
					content:
						"すでにチーム分けが進行中です。`/team close` で締め切ってください。",
					ephemeral: true,
				});
				return;
			}

			const teamCount = interaction.options.getInteger("count", true);

			await interaction.reply(
				`⚔️ チーム分けを開始します！参加したい人は ${REACT_EMOJI} をつけてください。\n60秒後に締め切ります（または \`/team close\` で即締め切り）`,
			);

			const recruitMessage = await interaction.fetchReply();
			await recruitMessage.react(REACT_EMOJI);

			const timeout = setTimeout(async () => {
				const result = await closeSession(guildId);
				const ch = await client.channels.fetch(interaction.channelId);
				if (ch instanceof TextChannel) await ch.send(result);
			}, SESSION_DURATION_MS);

			sessions.set(guildId, {
				messageId: recruitMessage.id,
				channelId: interaction.channelId,
				teamCount,
				timeout,
				client,
			});
			return;
		}

		if (sub === "close") {
			await interaction.deferReply();
			const result = await closeSession(guildId);
			await interaction.editReply(result);
		}
	},
};

export default command;
