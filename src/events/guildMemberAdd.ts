import { type Client, Events, TextChannel } from "discord.js";

export default function register(client: Client): void {
	client.on(Events.GuildMemberAdd, async (member) => {
		const channelId = process.env.WELCOME_CHANNEL_ID;
		if (!channelId) return;

		const channel = member.guild.channels.cache.get(channelId);
		if (!(channel instanceof TextChannel)) return;

		await channel.send(`👋 ${member} さん、サーバーへようこそ！`);
	});
}
