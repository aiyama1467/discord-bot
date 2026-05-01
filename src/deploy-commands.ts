import "dotenv/config";
import { REST, Routes } from "discord.js";
import dice from "./commands/dice.js";
import team from "./commands/team.js";

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
	throw new Error("BOT_TOKEN, CLIENT_ID must be set");
}

const rest = new REST().setToken(token);

const commands = [dice, team].map((cmd) => cmd.data.toJSON());

console.log(`Deploying ${commands.length} command(s)...`);

// GUILD_ID があればサーバー限定（即時反映）、なければ全サーバー向け（最大1時間）
if (guildId) {
	await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
		body: commands,
	});
} else {
	await rest.put(Routes.applicationCommands(clientId), {
		body: commands,
	});
}

console.log("Done.");
