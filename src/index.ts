import "dotenv/config";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import dice from "./commands/dice.js";
import team from "./commands/team.js";
import registerGuildMemberAdd from "./events/guildMemberAdd.js";
import registerMessageCreate from "./events/messageCreate.js";
import type { Command } from "./types.js";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not set");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
});

const commands = new Collection<string, Command>();
for (const cmd of [dice, team]) {
	commands.set(cmd.data.name, cmd);
}

registerGuildMemberAdd(client);
registerMessageCreate(client);

client.once(Events.ClientReady, (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = commands.get(interaction.commandName);
	if (!command) return;
	try {
		await command.execute(interaction, client);
	} catch (err) {
		console.error(err);
		const msg = {
			content: "コマンドの実行中にエラーが発生しました。",
			ephemeral: true,
		};
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(msg);
		} else {
			await interaction.reply(msg);
		}
	}
});

client.login(token);
