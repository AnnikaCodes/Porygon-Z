/**
 * moderation.ts
 * Commands useful for server moderators
 * and administrators.
 */
import Discord = require('discord.js');
import { ID, prefix, toID, pgPool } from '../common';
import { BaseCommand, DiscordChannel, IAliasList } from '../command_base';

export class Whois extends BaseCommand {
	private readonly KEY_PERMISSIONS: {[key: string]: string}
	constructor(message: Discord.Message) {
		super(message);
		this.KEY_PERMISSIONS = {
			'ADMINISTRATOR': 'Server Admin',
			'BAN_MEMBERS': 'Ban Members',
			'KICK_MEMBERS': 'Kick Members',
			'MANAGE_CHANNELS': 'Edit Channels',
			'MANAGE_GUILD': 'Edit Server',
			'MANAGE_ROLES': 'Assign Roles',
			'MANAGE_WEBHOOKS': 'Configure Webhooks',
			'MOVE_MEMBERS': 'Move Members in Voice Calls',
			'MUTE_MEMBERS': 'Mute Members',
			'VIEW_AUDIT_LOG': 'View Audit Log',
		};
	}

	private async getJoinPosition(user: Discord.GuildMember): Promise<string> {
		const guild = user.guild;
		await guild.members.fetch();
		let orderedList = guild.members.cache.array().sort((a, b) => {
			return (a.joinedTimestamp || Date.now()) - (b.joinedTimestamp || Date.now());
		});

		return `${orderedList.indexOf(user) + 1} of ${orderedList.length}`;
	}

	public async execute() {
		if (!(await this.can('KICK_MEMBERS'))) return this.errorReply(`Access Denied.`);

		let user = this.getUser(this.target);
		if (!user) return this.errorReply(`The user "${this.target}" was not found.`);
		let guildUser = await this.guild.members.fetch(user.id);

		let embed: Discord.MessageEmbedOptions = {
			color: 0x6194fd,
			description: `Information of ${user}.`,
			author: {
				name: user.tag,
				icon_url: user.displayAvatarURL(),
			},
			fields: [
				{
					name: 'Joined',
					value: guildUser.joinedAt ? guildUser.joinedAt.toUTCString() : 'N/A',
				},
				{
					name: 'Join Position',
					value: await this.getJoinPosition(guildUser),
				},
				{
					name: 'Registered',
					value: user.createdAt.toUTCString(),
				},
				{
					name: 'Roles',
					value: guildUser.roles.cache.map(r => r.name === '@everyone' ? '' : r.toString()).join(' ').trim() || 'No Roles',
				},
				{
					name: 'Key Permissions',
					value: guildUser.permissions.toArray().filter(p => (p in this.KEY_PERMISSIONS)).map(p => this.KEY_PERMISSIONS[p]).join(', ') || 'None',
				}
			],
			timestamp: Date.now(),
			footer: {
				text: `User ID: ${user.id}`,
			}
		}

		this.channel.send({embed: embed});
	}
}

export class Boosters extends BaseCommand {
	constructor(message: Discord.Message) {
		super(message);
	}

	public async execute() {
		if (!(await this.can('MANAGE_ROLES'))) return this.errorReply(`Access Denied.`);
		this.guild.members.fetch(); // Load guild users to cache

		let embed: Discord.MessageEmbedOptions = {
			color: 0xf47fff,
			description: `Current Nitro Boosters`,
			author: {
				name: this.guild.name,
				icon_url: this.guild.iconURL() || '',
			},
			timestamp: Date.now(),
			footer: {
				text: `Server ID: ${this.guild.id}`,
			}
		}
		embed.fields = []; // To appease typescript, we do this here

		for (let [id, gm] of this.guild.members.cache) {
			if (!gm.premiumSince) continue;
			let d = gm.premiumSince.toUTCString();
			d = d.slice(0, d.indexOf(':') - 3);
			embed.fields.push({
				name: gm.user.tag,
				value: `Since ${d}`,
			});
		}

		if (!embed.fields.length) embed.fields.push({
			name: 'No Boosters',
			value: 'Try this command again once you have a nitro booster.',
		});

		this.channel.send({embed: embed});
	}
}
