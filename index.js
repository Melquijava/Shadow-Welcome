require('dotenv').config();

const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');

const emojiPath = path.join(__dirname, 'assets', 'emoji', 'seta.webp');
const emojiName = 'seta_shadow';
const emojiPromises = new Map();
const automaticRoleId = '1517781495605891083';

const requiredVariables = [
  'TOKEN',
  'WELCOME_CHANNEL_ID',
  'HOW_TO_PLAY_CHANNEL_ID',
  'RULES_CHANNEL_ID',
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(
    `[CONFIG] Variaveis obrigatorias ausentes: ${missingVariables.join(', ')}`,
  );
  process.exit(1);
}

// O GuildMembers e necessario para receber o evento guildMemberAdd.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', (readyClient) => {
  console.log(`[BOT] Online como ${readyClient.user.tag}`);
});

// Localiza ou cria no servidor o emoji salvo em assets/emoji/seta.webp.
async function getWelcomeEmoji(guild) {
  if (!emojiPromises.has(guild.id)) {
    const emojiPromise = (async () => {
      const emojis = await guild.emojis.fetch();
      const existingEmoji = emojis.find((emoji) => emoji.name === emojiName);

      if (existingEmoji) {
        return existingEmoji.toString();
      }

      const createdEmoji = await guild.emojis.create({
        attachment: emojiPath,
        name: emojiName,
        reason: 'Emoji da mensagem de boas-vindas',
      });

      console.log(`[WELCOME] Emoji criado no servidor: ${createdEmoji.name}`);
      return createdEmoji.toString();
    })().catch((error) => {
      emojiPromises.delete(guild.id);
      throw error;
    });

    emojiPromises.set(guild.id, emojiPromise);
  }

  return emojiPromises.get(guild.id);
}

client.on('guildMemberAdd', async (member) => {
  console.log(`[WELCOME] Novo membro: ${member.user.username}`);

  // Aplica automaticamente o cargo inicial ao novo membro, sem enviar aviso.
  await member.roles.add(automaticRoleId).catch((error) => {
    console.error('[WELCOME] Erro ao aplicar o cargo automatico:', error);
  });

  try {
    const welcomeChannel = await member.guild.channels
      .fetch(process.env.WELCOME_CHANNEL_ID)
      .catch(() => null);

    if (!welcomeChannel) {
      console.error(
        `[WELCOME] Canal de boas-vindas nao encontrado: ${process.env.WELCOME_CHANNEL_ID}`,
      );
      return;
    }

    if (!welcomeChannel.isTextBased() || !welcomeChannel.isSendable()) {
      console.error(
        `[WELCOME] O canal configurado nao aceita mensagens: ${process.env.WELCOME_CHANNEL_ID}`,
      );
      return;
    }

    const welcomeEmoji = await getWelcomeEmoji(member.guild);
    const message = [
      `## Seja Bem-Vindo(a) ${member} à Shadow Apostas.`,
      '',
      `${welcomeEmoji} Como Jogar? <#${process.env.HOW_TO_PLAY_CHANNEL_ID}>`,
      `${welcomeEmoji} Leia as <#${process.env.RULES_CHANNEL_ID}> e comece suas apostas.`,
    ].join('\n');

    await welcomeChannel.send({
      content: message,
      allowedMentions: { users: [member.id] },
    });
  } catch (error) {
    console.error('[WELCOME] Erro ao enviar a mensagem:', error);
  }
});

client.on('error', (error) => {
  console.error('[DISCORD] Erro no cliente:', error);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error('[BOT] Nao foi possivel iniciar:', error);
  process.exit(1);
});

