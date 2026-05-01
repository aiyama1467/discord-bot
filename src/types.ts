import type {
	ChatInputCommandInteraction,
	Client,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export interface Command {
	data: {
		name: string;
		toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
	};
	execute: (
		interaction: ChatInputCommandInteraction,
		client: Client,
	) => Promise<void>;
}
