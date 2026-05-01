import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

function rollDice(
	notation: string,
): { rolls: number[]; modifier: number; total: number } | null {
	// Matches: [X]dY[+/-Z]
	const match = notation.toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
	if (!match) return null;

	const count = parseInt(match[1] || "1", 10);
	const sides = parseInt(match[2], 10);
	const modifier = match[3] ? parseInt(match[3], 10) : 0;

	if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;

	const rolls = Array.from(
		{ length: count },
		() => Math.floor(Math.random() * sides) + 1,
	);
	const total = rolls.reduce((a, b) => a + b, 0) + modifier;

	return { rolls, modifier, total };
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName("dice")
		.setDescription("ダイスを振ります")
		.addStringOption((option) =>
			option
				.setName("notation")
				.setDescription("ダイス記法（例: 2d6, d20, 3d8+5）")
				.setRequired(true),
		),

	async execute(interaction) {
		const notation = interaction.options.getString("notation", true);
		const result = rollDice(notation);

		if (!result) {
			await interaction.reply({
				content: `❌ \`${notation}\` は無効なダイス記法です。例: \`2d6\`, \`d20\`, \`3d8+5\``,
				ephemeral: true,
			});
			return;
		}

		const { rolls, modifier, total } = result;
		const modStr =
			modifier !== 0
				? modifier > 0
					? ` + ${modifier}`
					: ` - ${Math.abs(modifier)}`
				: "";
		const rollsStr =
			rolls.length === 1 ? `${rolls[0]}` : `[${rolls.join(", ")}]`;

		await interaction.reply(
			`🎲 **${notation}**: ${rollsStr}${modStr} = **${total}**`,
		);
	},
};

export default command;
