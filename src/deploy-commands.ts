import { REST, Routes } from "discord.js";
import dice from "./commands/dice.js";
import team from "./commands/team.js";

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error("BOT_TOKEN, CLIENT_ID, GUILD_ID must be set");
}

const rest = new REST().setToken(token);

const commands = [dice, team].map((cmd) => cmd.data.toJSON());

console.log(`Deploying ${commands.length} command(s)...`);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log("Done.");
