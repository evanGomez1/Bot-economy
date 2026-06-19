import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  EmbedBuilder,
  TextChannel,
  Guild,
  GuildMember,
} from "discord.js";
import { logger } from "../lib/logger";
import { config } from "./config";
import { SHOP_ROLE_MAP } from "./shopRoles";

let client: Client | null = null;

/**
 * Parse a UnbelievaBoat shop purchase embed.
 * Returns { userId, itemName, amountSpent } or null if not a shop log.
 */
function parseShopEmbed(
  message: Message,
): { userId: string; itemName: string; amountSpent: string } | null {
  if (!message.embeds.length) return null;

  for (const embed of message.embeds) {
    const author = (embed.author?.name ?? "").toLowerCase();
    const description = embed.description ?? "";

    logger.info(
      { embedAuthor: embed.author?.name, embedDescription: embed.description },
      "Raw embed received in log channel",
    );

    const isShopLog =
      author.includes("balance updated") ||
      description.toLowerCase().includes("buy item");

    if (!isShopLog) {
      logger.info({ embedAuthor: embed.author?.name }, "Embed skipped — not a shop purchase log");
      continue;
    }

    let userId: string | null = null;
    let itemName: string | null = null;
    let amountSpent = "N/A";

    const userMatch = description.match(/\*\*User:\*\*\s*<@!?(\d+)>/i);
    if (userMatch) userId = userMatch[1];

    const amountMatch = description.match(/Cash:\s*`([^`]+)`/i);
    if (amountMatch) amountSpent = amountMatch[1].replace("-", "").trim();

    const reasonMatch = description.match(/buy item\s*\(([^)]+)\)/i);
    if (reasonMatch) {
      itemName = reasonMatch[1]
        .replace(
          /^[\s\S]*?([A-Za-zÀ-ÖØ-öø-ÿ\u00f1\u00d1][\w\s\-+À-ÖØ-öø-ÿ\u00f1\u00d1]*)$/,
          "$1",
        )
        .trim();
    }

    logger.info({ userId, itemName, amountSpent }, "Parsed embed result");

    if (userId && itemName) return { userId, itemName, amountSpent };
  }

  return null;
}

async function assignRoles(
  guild: Guild,
  userId: string,
  itemName: string,
): Promise<{ assigned: string[]; skipped: string[]; member: GuildMember | null }> {
  const assigned: string[] = [];
  const skipped: string[] = [];
  let member: GuildMember | null = null;

  try {
    member = await guild.members.fetch(userId);
  } catch (err) {
    logger.warn({ userId, err }, "Could not fetch guild member");
    return { assigned, skipped, member: null };
  }

  const normalised = itemName.toLowerCase();
  let roleIds: string[] = [];

  for (const [key, value] of Object.entries(SHOP_ROLE_MAP)) {
    if (key.toLowerCase() === normalised) {
      roleIds = Array.isArray(value) ? value : [value];
      break;
    }
  }

  if (roleIds.length === 0) {
    logger.warn(
      { itemName, availableItems: Object.keys(SHOP_ROLE_MAP) },
      "No role mapping found for item — check the item name matches exactly",
    );
    return { assigned, skipped, member };
  }

  await guild.roles.fetch();

  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      logger.warn({ roleId, itemName }, "Role not found in guild — check the role ID is correct");
      skipped.push(roleId);
      continue;
    }
    if (member.roles.cache.has(roleId)) {
      logger.info({ userId, roleName: role.name }, "User already has role, skipping");
      skipped.push(role.name);
      continue;
    }
    try {
      await member.roles.add(role, `UnbelievaBoat shop purchase: ${itemName}`);
      assigned.push(role.name);
      logger.info({ userId, roleId, roleName: role.name, itemName }, "Role assigned after shop purchase");
    } catch (err) {
      logger.error({ err, userId, roleId }, "Failed to assign role — check bot role position and permissions");
      skipped.push(role.name);
    }
  }

  return { assigned, skipped, member };
}

function registerEvents(c: Client): void {
  c.once(Events.ClientReady, (ready) => {
    logger.info({ tag: ready.user.tag }, "Discord bot ready");
    ready.user.setPresence({
      status: "online",
      activities: [{ name: "『🌊』Blox Fruits Central | alewis_897", type: 3 }],
    });
  });

  // — Reconexión automática —
  c.on(Events.ShardDisconnect, (_, shardId) => {
    logger.warn({ shardId }, "Shard disconnected — Discord.js will reconnect automatically");
  });

  c.on(Events.ShardReconnecting, (shardId) => {
    logger.info({ shardId }, "Shard reconnecting...");
  });

  c.on(Events.ShardResume, (shardId, replayed) => {
    logger.info({ shardId, replayed }, "Shard resumed — bot is back online");
  });

  c.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  c.on(Events.MessageCreate, async (message: Message) => {
    if (message.channelId === config.logChannelId) {
      logger.info(
        {
          channelId: message.channelId,
          authorId: message.author.id,
          authorTag: message.author.tag,
          isBot: message.author.bot,
          hasEmbeds: message.embeds.length > 0,
          embedCount: message.embeds.length,
          contentPreview: message.content?.slice(0, 100),
        },
        "Message received in log channel",
      );
    }

    if (message.channelId !== config.logChannelId) return;
    if (!message.author.bot) return;

    const parsed = parseShopEmbed(message);
    if (!parsed) {
      logger.warn("Bot message in log channel did not parse as a shop embed");
      return;
    }

    const { userId, itemName, amountSpent } = parsed;
    logger.info({ userId, itemName, amountSpent }, "Detected shop purchase");

    const guild = message.guild ?? c.guilds.cache.get(config.guildId);
    if (!guild) {
      logger.error("Could not resolve guild");
      return;
    }

    const { assigned, skipped, member } = await assignRoles(guild, userId, itemName);

    if (assigned.length > 0) {
      logger.info({ userId, itemName, assigned, skipped }, "Role assignment complete");

      const memberMention = member ? `<@${member.id}>` : `\`${userId}\``;
      const rolesText = assigned.map((r) => `\`${r}\``).join(", ");
      const now = new Date();
      const botAvatar = c.user?.displayAvatarURL() ?? undefined;
      const timeStr =
        now.toLocaleString("es-ES", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false,
        }) + " UTC";

      // — Canal de compras (público, se borra en 15s) —
      try {
        const fetchedChannel = await c.channels.fetch(config.purchaseChannelId);
        if (!fetchedChannel || !fetchedChannel.isTextBased()) {
          logger.error({ channelId: config.purchaseChannelId }, "Purchase channel not found or not a text channel");
        } else {
          const purchaseChannel = fetchedChannel as TextChannel;
          const purchaseEmbed = new EmbedBuilder()
            .setColor(0xffd700)
            .setAuthor({ name: "✨ ¡Compra Exitosa!" })
            .setTitle(`🎉 ${member?.displayName ?? userId}`)
            .setDescription(`> Gracias por tu compra en la tienda. Tu rol ha sido entregado automáticamente.`)
            .addFields(
              { name: "🛍️ Artículo comprado", value: `**${itemName}**`, inline: true },
              { name: "🎭 Rol(es) recibido(s)", value: rolesText, inline: true },
            )
            .setThumbnail(member?.user.displayAvatarURL() ?? null)
            .setFooter({ text: "Sistema de Tienda • Gracias por tu apoyo" })
            .setTimestamp(now);
          const sent = await purchaseChannel.send({ content: memberMention, embeds: [purchaseEmbed] });
          logger.info({ channelId: config.purchaseChannelId }, "Purchase channel embed sent");
          setTimeout(() => {
            sent.delete().catch((err) => logger.warn({ err }, "Could not delete purchase confirmation message"));
          }, 15_000);
        }
      } catch (err) {
        logger.error({ err }, "Failed to send purchase channel embed");
      }

      // — Canal de logs (admin, permanente) —
      try {
        const logChannel = message.channel as TextChannel;
        const logEmbed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({ name: "🏪 Registro de Compra", iconURL: botAvatar })
          .setDescription(`${memberMention} realizó una compra en la tienda.`)
          .addFields(
            { name: "👤 Usuario", value: `${memberMention}\n\`ID: ${userId}\``, inline: true },
            { name: "🛍️ Artículo", value: `**${itemName}**`, inline: true },
            { name: "💸 Gastó", value: `**$${amountSpent}**`, inline: true },
            { name: "✅ Rol(es) asignado(s)", value: rolesText, inline: true },
            { name: "📢 Canal de compra", value: `<#${config.purchaseChannelId}>`, inline: true },
            { name: "🕐 Hora", value: timeStr, inline: true },
            ...(skipped.length > 0
              ? [{ name: "⏭️ Ya tenía", value: skipped.map((r) => `\`${r}\``).join(", "), inline: false }]
              : []),
          )
          .setThumbnail(member?.user.displayAvatarURL() ?? null)
          .setFooter({ text: "Tienda • Sistema automático de roles", iconURL: botAvatar })
          .setTimestamp(now);
        await logChannel.send({ embeds: [logEmbed] });
      } catch (err) {
        logger.error({ err }, "Failed to send log channel embed");
      }
    } else {
      logger.warn({ userId, itemName, skipped }, "No new roles were assigned");
    }
  });
}

export async function startBot(retries = 0): Promise<void> {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  registerEvents(client);

  try {
    await client.login(config.token);
  } catch (err: any) {
    logger.error({ err }, "Bot login failed");
    client.destroy();
    client = null;

    if (retries >= 5) {
      logger.error("Max retries reached — bot will not restart");
      return;
    }

    const delay = Math.min(5_000 * 2 ** retries, 60_000); // 5s → 10s → 20s → 40s → 60s
    logger.info({ delay: delay / 1000, attempt: retries + 1 }, "Retrying bot login...");
    await new Promise((r) => setTimeout(r, delay));
    return startBot(retries + 1);
  }
}

export async function stopBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    logger.info("Discord bot stopped");
  }
}
