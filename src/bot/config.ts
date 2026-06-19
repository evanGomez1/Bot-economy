export const config = {
  token: process.env["DISCORD_BOT_TOKEN"] ?? "",
  guildId: process.env["DISCORD_GUILD_ID"] ?? "",
  logChannelId: process.env["DISCORD_LOG_CHANNEL_ID"] ?? "",
  purchaseChannelId: process.env["DISCORD_PURCHASE_CHANNEL_ID"] ?? "",
};

export function validateConfig() {
  const missing: string[] = [];
  if (!config.token) missing.push("DISCORD_BOT_TOKEN");
  if (!config.guildId) missing.push("DISCORD_GUILD_ID");
  if (!config.logChannelId) missing.push("DISCORD_LOG_CHANNEL_ID");
  if (!config.purchaseChannelId) missing.push("DISCORD_PURCHASE_CHANNEL_ID");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
