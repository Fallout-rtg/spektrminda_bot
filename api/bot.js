const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) console.error('❌ BOT_TOKEN не установлен!');

const CHANNEL_USERNAME = 'spektrminda';
const CHANNEL_ID = -1002696885166;
const CHAT_ID = -1002899007927;
const ADMIN_CHAT_ID = -1002818324656;
const ADMIN_IDS = [1465194766, 2032240231, 1319314897];
const RED_STAR_CHANNEL_ID = -1003079596618;
const RED_STAR_POST_ID = 8;

// ID сообщения с разрешёнными чатами в чате админов (замените на реальный после отправки ботом)
let ALLOWED_CHATS_MESSAGE_ID = null;

const COMMENT_TEXT = `<b>⚠️ Краткие правила комментариев:</b>
• Спам категорически запрещён.
• Запрещён любой контент сексуальной направленности.
• Ведите себя прилично, не оскорбляйте других участников.
• Любая политика или околополитический контент запрещен.

📡 <a href="https://t.me/+qAcLEuOQVbZhYWFi">Наш чат</a> | <a href="https://discord.gg/rBnww7ytM3">Discord</a> | <a href="https://www.tiktok.com/@spectr_mindustry?_t=ZN-8yZCVx33mr9&_r=1">TikTok</a>`;

const bot = new Telegraf(BOT_TOKEN);

let ALLOWED_CHATS = [];
let ACTIVE_CHATS = [];
let REPLY_LINKS = {};
const processedPosts = new Set();
const userFirstMessages = new Set();

// Функция для отправки сообщения с разрешёнными чатами в чат админов
async function sendAllowedChatsMessage() {
  try {
    let text = '📝 Разрешённые чаты:\n';
    if (ALLOWED_CHATS.length === 0) {
      text += 'Список пуст. Используйте /add_chat чтобы добавить чат.';
    } else {
      ALLOWED_CHATS.forEach(chat => {
        text += `• ${chat.name}\nID: ${chat.id}\n`;
      });
    }
    
    const message = await bot.telegram.sendMessage(ADMIN_CHAT_ID, text);
    ALLOWED_CHATS_MESSAGE_ID = message.message_id;
    console.log(`✅ Сообщение с разрешёнными чатами отправлено. ID: ${ALLOWED_CHATS_MESSAGE_ID}`);
    
    return message.message_id;
  } catch (error) {
    console.error('Ошибка при отправке сообщения с чатами:', error);
    return null;
  }
}

// Функция для обновления сообщения с чатами в чате админов
async function updateAllowedChatsMessage() {
  if (!ALLOWED_CHATS_MESSAGE_ID) return;
  
  try {
    let text = '📝 Разрешённые чаты:\n';
    if (ALLOWED_CHATS.length === 0) {
      text += 'Список пуст. Используйте /add_chat чтобы добавить чат.';
    } else {
      ALLOWED_CHATS.forEach(chat => {
        text += `• ${chat.name}\nID: ${chat.id}\n`;
      });
    }
    
    await bot.telegram.editMessageText(
      ADMIN_CHAT_ID, 
      ALLOWED_CHATS_MESSAGE_ID, 
      null, 
      text
    );
    console.log('✅ Сообщение с чатами обновлено');
  } catch (error) {
    console.error('Ошибка при обновлении сообщения с чатами:', error);
  }
}

// Функция для обновления поста в канале "Красная звезда"
async function updateRedStarChannelPost() {
  try {
    let text = '📝 Разрешённые чаты:\n';
    ALLOWED_CHATS.forEach(chat => {
      text += `• ${chat.name}\nID: ${chat.id}\n`;
    });
    
    await bot.telegram.editMessageText(
      RED_STAR_CHANNEL_ID, 
      RED_STAR_POST_ID, 
      null, 
      text
    );
    console.log('✅ Пост в канале "Красная звезда" обновлён');
  } catch (error) {
    console.error('Ошибка при обновлении поста в канале:', error);
  }
}

// Функция для загрузки разрешённых чатов из сообщения в чате админов
async function loadAllowedChatsFromMessage() {
  if (!ALLOWED_CHATS_MESSAGE_ID) {
    console.error('❌ ID сообщения с чатами не установлен');
    return;
  }
  
  try {
    const message = await bot.telegram.getMessage(ADMIN_CHAT_ID, ALLOWED_CHATS_MESSAGE_ID);
    
    if (!message || !message.text) {
      console.error('❌ Сообщение с разрешёнными чатами не найдено или не содержит текст');
      return;
    }
    
    const lines = message.text.split('\n');
    const chats = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('•')) {
        const name = line.substring(1).trim();
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const idMatch = nextLine.match(/ID:\s*(-?\d+)/);
          
          if (idMatch) {
            const id = parseInt(idMatch[1], 10);
            if (!isNaN(id)) {
              chats.push({ id, name });
              i++;
            }
          }
        }
      }
    }
    
    ALLOWED_CHATS = chats;
    console.log(`✅ Загружено ${ALLOWED_CHATS.length} разрешённых чатов из сообщения`);
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке разрешённых чатов:', error.message);
  }
}

// Функция для добавления чата в разрешённые
async function addChatToAllowed(name, id) {
  // Проверяем, нет ли уже такого чата
  if (ALLOWED_CHATS.some(chat => chat.id === id)) {
    return { success: false, message: '❌ Этот чат уже есть в списке разрешённых.' };
  }
  
  // Добавляем чат в список
  ALLOWED_CHATS.push({ id, name });
  
  try {
    // Обновляем сообщение в чате админов
    await updateAllowedChatsMessage();
    
    // Обновляем пост в канале "Красная звезда"
    await updateRedStarChannelPost();
    
    return { success: true, message: `✅ Чат "${name}" (${id}) добавлен в разрешённые.` };
  } catch (error) {
    console.error('Ошибка при добавлении чата:', error);
    return { success: false, message: '❌ Ошибка при добавлении чата.' };
  }
}

// Функция для удаления чата из разрешённых
async function removeChatFromAllowed(id) {
  // Находим индекс чата в списке
  const index = ALLOWED_CHATS.findIndex(chat => chat.id === id);
  
  if (index === -1) {
    return { success: false, message: '❌ Чат не найден в списке разрешённых.' };
  }
  
  // Удаляем чат из списка
  const removedChat = ALLOWED_CHATS.splice(index, 1)[0];
  
  try {
    // Обновляем сообщение в чате админов
    await updateAllowedChatsMessage();
    
    // Обновляем пост в канале "Красная звезда"
    await updateRedStarChannelPost();
    
    return { success: true, message: `✅ Чат "${removedChat.name}" (${id}) удалён из разрешённых.` };
  } catch (error) {
    console.error('Ошибка при удалении чата:', error);
    return { success: false, message: '❌ Ошибка при удалении чата.' };
  }
}

function safeHandler(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error('Ошибка в обработчике:', err);
      try { await ctx.reply('❌ Произошла ошибка при обработке запроса. Попробуйте позже.'); } catch (e) {}
    }
  };
}

function isAdmin(ctx) {
  try { return ctx.from && ADMIN_IDS.includes(ctx.from.id); } catch { return false; }
}

function isPrivate(ctx) {
  try { return ctx.chat && ctx.chat.type === 'private'; } catch { return false; }
}

function restrictedCommand(handler, { adminOnly = false } = {}) {
  return safeHandler(async (ctx) => {
    if (!isPrivate(ctx) && !isAdmin(ctx)) {
      return ctx.reply('❌ Эту команду можно использовать только в ЛС.', { reply_to_message_id: ctx.message.message_id });
    }
    if (adminOnly && !isAdmin(ctx)) {
      return ctx.reply('❌ Только админам.', { reply_to_message_id: ctx.message.message_id });
    }
    await handler(ctx);
  });
}

async function checkBotChats(botInstance) {
  for (const chatId of ACTIVE_CHATS.slice()) {
    if (!ALLOWED_CHATS.some(chat => chat.id === chatId)) {
      try {
        await botInstance.telegram.sendMessage(
          chatId,
          '🚫 Этот чат не разрешён для работы бота.',
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
      } catch (e) {}
      try {
        await botInstance.telegram.leaveChat(chatId);
      } catch (e) {}
      ACTIVE_CHATS = ACTIVE_CHATS.filter(id => id !== chatId);
    }
  }
}

bot.on('chat_member', async (ctx) => {
  const chat = ctx.chat;
  const newMember = ctx.update.chat_member.new_chat_member;

  if (newMember.user.id === ctx.botInfo.id && chat.type !== 'private') {
    if (!ALLOWED_CHATS.some(chatObj => chatObj.id === chat.id)) {
      try {
        await ctx.telegram.sendMessage(
          chat.id,
          '🚫 Этот чат не разрешён для работы бота.',
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        await ctx.telegram.leaveChat(chat.id);
      } catch (err) {
        console.error('Ошибка при выходе из группы:', err);
      }
    }
  }
});

bot.catch((err, ctx) => {
  console.error('Global error', err, ctx?.update?.update_id);
});

// Команда для инициализации - отправляет сообщение с чатами
bot.command('init_chats', restrictedCommand(async (ctx) => {
  try {
    const messageId = await sendAllowedChatsMessage();
    if (messageId) {
      await ctx.reply(`✅ Сообщение с чатами отправлено. ID: ${messageId}\nТеперь замените значение ALLOWED_CHATS_MESSAGE_ID в коде на этот ID.`);
    } else {
      await ctx.reply('❌ Не удалось отправить сообщение с чатами.');
    }
  } catch (error) {
    console.error('Ошибка при инициализации чатов:', error);
    await ctx.reply('❌ Ошибка при инициализации чатов.');
  }
}, { adminOnly: true }));

// Команда для добавления чата
bot.command('add_chat', restrictedCommand(async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) {
    return ctx.reply('❌ Используйте: /add_chat <название_чата> <ID_чата>');
  }
  
  const name = args.slice(0, -1).join(' ');
  const id = parseInt(args[args.length - 1], 10);
  
  if (isNaN(id)) {
    return ctx.reply('❌ Неверный формат ID чата.');
  }
  
  const result = await addChatToAllowed(name, id);
  await ctx.reply(result.message);
}, { adminOnly: true }));

// Команда для удаления чата
bot.command('remove_chat', restrictedCommand(async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('❌ Используйте: /remove_chat <ID_чата>');
  }
  
  const id = parseInt(args[0], 10);
  
  if (isNaN(id)) {
    return ctx.reply('❌ Неверный формат ID чата.');
  }
  
  const result = await removeChatFromAllowed(id);
  await ctx.reply(result.message);
}, { adminOnly: true }));

// Команда для просмотра списка разрешённых чатов
bot.command('allowed_chats', restrictedCommand(async (ctx) => {
  if (ALLOWED_CHATS.length === 0) {
    return ctx.reply('📝 Список пуст. Используйте /add_chat чтобы добавить чат.');
  }
  
  let chatList = '📝 Разрешённые чаты:\n';
  ALLOWED_CHATS.forEach(chat => {
    chatList += `• ${chat.name}\nID: ${chat.id}\n`;
  });
  
  await ctx.reply(chatList);
}, { adminOnly: true }));

// Команда для принудительной синхронизации
bot.command('sync_chats', restrictedCommand(async (ctx) => {
  try {
    await loadAllowedChatsFromMessage();
    await updateRedStarChannelPost();
    await ctx.reply(`✅ Синхронизация завершена! Загружено ${ALLOWED_CHATS.length} чатов.`);
  } catch (error) {
    console.error('Ошибка при синхронизации чатов:', error);
    await ctx.reply('❌ Ошибка при синхронизации чатов.');
  }
}, { adminOnly: true }));

bot.start(restrictedCommand(async (ctx) => {
  const user = ctx.message.from;
  const firstName = user.first_name || '';
  const userID = user.id;

  if (isAdmin(ctx)) {
    let greeting = '';
    if (userID === 1465194766) greeting = `👑 Приветствую, Спектр ♦️!`;
    else if (userID === 2032240231) greeting = `⚜️ Здравствуйте, Советчик 📜!`;
    else if (userID === 1319314897) greeting = `🏛️ Приветствую, Устричный Комиссар 🏛️!`;
    greeting += `\n\nИспользуйте /help для списка команд.`;
    await ctx.reply(greeting);
  } else {
    const greeting = `Здравствуйте, ${firstName ? firstName : 'пользователь'}!
Вы обратились в бот обратной связи канала Я Спектр ♦️.`;
    
    await ctx.reply(greeting, {
      parse_mode: 'HTML',
      disable_web_page_preview: false
    });
  }
}));

bot.help(restrictedCommand(async (ctx) => {
  if (isAdmin(ctx)) {
    const adminHelpText = `<b>🛠 Команды админов:</b>

/start — запуск бота
/help — показать это сообщение
/init_chats — создать сообщение с чатами
/add_chat — добавить чат в разрешённые
/remove_chat — удалить чат из разрешённых
/allowed_chats — показать список разрешённых чатов
/sync_chats — синхронизировать чаты

<b>Как отвечать</b>:
💡 В ЛС: пересланное сообщение от пользователя -> ответьте на него — бот пересылает ответ пользователю.`;
    await ctx.reply(adminHelpText, { parse_mode: 'HTML', disable_web_page_preview: true });
  } else {
    const userHelpText = `ℹ️ Команды пользователя:

/start — запустить бота
/help — показать это сообщение
/adm — анкета на вступление в администрацию
/appeal — анкета для обжалования наказания`;
    await ctx.reply(userHelpText, { parse_mode: 'HTML', disable_web_page_preview: true });
  }
}));

bot.command('info', restrictedCommand(async (ctx) => {
  const infoText = `⚙️ О боте
Версия: 0.0.1
Разработчики: Красная звезда`;
  await ctx.reply(infoText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('test', restrictedCommand(async (ctx) => {
  await ctx.reply('✅ Бот активен и работает в штатном режиме!');
}, { adminOnly: true }));

bot.command('comment_text', restrictedCommand(async (ctx) => {
  await ctx.reply(COMMENT_TEXT, { parse_mode: 'HTML', disable_web_page_preview: true });
}, { adminOnly: true }));

bot.command('adm', safeHandler(async (ctx) => {
  if (!isPrivate(ctx) && !isAdmin(ctx)) {
    return ctx.reply('❌ Эту команду можно использовать только в ЛС.', { reply_to_message_id: ctx.message.message_id });
  }
  
  const userName = ctx.from.first_name || ctx.from.username || '';
  const admText = `<b>📜 Анкета кандидата в администрацию</b>

💬 Привет, ${userName}! Заполни эту анкету, если хочешь стать администратором.`;
  await ctx.reply(admText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('appeal', safeHandler(async (ctx) => {
  if (!isPrivate(ctx) && !isAdmin(ctx)) {
    return ctx.reply('❌ Эту команду можно использовать только в ЛС.', { reply_to_message_id: ctx.message.message_id });
  }
  
  const appealText = `<b>📄 АНКЕТА ДЛЯ ОБЖАЛОВАНИЯ НАКАЗАНИЯ</b>

<b>1. Твой ник в Telegram:</b>
<em>(укажи имя, под которым тебя можно найти)</em>`;
  
  await ctx.reply(appealText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.on('message', safeHandler(async (ctx) => {
  const message = ctx.message;
  if (!message) return;
  const userId = message.from.id;
  const chatId = message.chat.id;

  if (message.text?.startsWith('/')) {
    return;
  }

  if (message.new_chat_members) {
    const isBotAdded = message.new_chat_members.some(m => m.is_bot && m.id === ctx.botInfo.id);
    if (isBotAdded) {
      if (!ACTIVE_CHATS.includes(chatId)) ACTIVE_CHATS.push(chatId);
      if (!ALLOWED_CHATS.some(chat => chat.id === chatId)) {
        try {
          await ctx.reply('🚫 Этот чат не разрешён для работы бота.');
        } catch (e) {}
        try { await new Promise(r => setTimeout(r, 1500)); } catch {}
        try { await ctx.leaveChat(); } catch (e) {}
        ACTIVE_CHATS = ACTIVE_CHATS.filter(id => id !== chatId);
      }
    }
  }

  if (isAdmin(ctx) && chatId === ADMIN_CHAT_ID && message.reply_to_message) {
    let originalId = null;
    const replied = message.reply_to_message;

    if (replied.forward_from && replied.forward_from.id) {
      originalId = replied.forward_from.id;
    }
    else if (replied.text || replied.caption) {
      const sourceText = (replied.text || replied.caption).toString();
      const idMatch = sourceText.match(/🆔\s*ID[:\s]*([0-9]{7,})/) ||
                      sourceText.match(/ID[:\s]*([0-9]{7,})/i);
      if (idMatch) {
        originalId = parseInt(idMatch[1], 10);
      }
    }

    if (!originalId || isNaN(originalId)) {
      return;
    }

    try {
      const sendOptions = { reply_to_message_id: message.reply_to_message.message_id };
      
      if (message.text) {
        await ctx.telegram.sendMessage(originalId, message.text, { ...sendOptions, disable_web_page_preview: true });
      } else if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(originalId, fileId, { ...sendOptions, caption: message.caption || '' });
      } else if (message.video) {
        await ctx.telegram.sendVideo(originalId, message.video.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.document) {
        await ctx.telegram.sendDocument(originalId, message.document.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.sticker) {
        await ctx.telegram.sendSticker(originalId, message.sticker.file_id, sendOptions);
      } else if (message.animation) {
        await ctx.telegram.sendAnimation(originalId, message.animation.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.audio) {
        await ctx.telegram.sendAudio(originalId, message.audio.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.voice) {
        await ctx.telegram.sendVoice(originalId, message.voice.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.video_note) {
        await ctx.telegram.sendVideoNote(originalId, message.video_note.file_id, sendOptions);
      } else if (message.poll) {
        const p = message.poll;
        const options = p.options.map(o => o.text);
        await ctx.telegram.sendPoll(originalId, p.question, options, {
          is_anonymous: p.is_anonymous,
          type: p.type,
          ...sendOptions
        });
      }
      
      await ctx.reply('✅ Ответ отправлен пользователю.', { reply_to_message_id: message.message_id });
    } catch (err) {
      console.error('Ошибка при отправке ответа пользователю:', err);
      await ctx.reply('❌ Не удалось отправить ответ.', { reply_to_message_id: message.message_id });
    }
    return;
  }

  if (isAdmin(ctx) && isPrivate(ctx) && message.text && message.text.startsWith('https://t.me/c/')) {
    const match = message.text.match(/https:\/\/t\.me\/c\/(\d+)\/(\d+)/);
    if (!match) {
      await ctx.reply('❌ Неверный формат ссылки.');
      return;
    }
    const shortChat = match[1];
    const msgId = parseInt(match[2], 10);
    const targetChatId = parseInt('-100' + shortChat, 10);
    REPLY_LINKS[userId] = { chatId: targetChatId, messageId: msgId };
    await ctx.reply('✅ Ссылка принята. Следующее отправленное вами сообщение будет переслано как ответ.');
    return;
  }

  if (isAdmin(ctx) && REPLY_LINKS[userId] && !(message.text?.startsWith('/'))) {
    const { chatId: targetChat, messageId: targetMessage } = REPLY_LINKS[userId];
    try {
      if (message.text) {
        await ctx.telegram.sendMessage(targetChat, message.text, { reply_to_message_id: targetMessage, disable_web_page_preview: true });
      } else if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(targetChat, fileId, { caption: message.caption || '', reply_to_message_id: targetMessage });
      } else if (message.video) {
        await ctx.telegram.sendVideo(targetChat, message.video.file_id, { caption: message.caption || '', reply_to_message_id: targetMessage });
      } else if (message.document) {
        await ctx.telegram.sendDocument(targetChat, message.document.file_id, { caption: message.caption || '', reply_to_message_id: targetMessage });
      } else if (message.sticker) {
        await ctx.telegram.sendSticker(targetChat, message.sticker.file_id, { reply_to_message_id: targetMessage });
      } else if (message.animation) {
        await ctx.telegram.sendAnimation(targetChat, message.animation.file_id, { caption: message.caption || '', reply_to_message_id: targetMessage });
      } else if (message.audio) {
        await ctx.telegram.sendAudio(targetChat, message.audio.file_id, { 
          caption: message.caption || '', 
          reply_to_message_id: targetMessage 
        });
      } else if (message.voice) {
        await ctx.telegram.sendVoice(targetChat, message.voice.file_id, { 
          caption: message.caption || '', 
          reply_to_message_id: targetMessage 
        });
      } else if (message.video_note) {
        await ctx.telegram.sendVideoNote(targetChat, message.video_note.file_id, { 
          reply_to_message_id: targetMessage 
        });
      } else if (message.poll) {
        const p = message.poll;
        const options = p.options.map(o => o.text);
        await ctx.telegram.sendPoll(targetChat, p.question, options, { 
          is_anonymous: p.is_anonymous, 
          type: p.type,
          reply_to_message_id: targetMessage
        });
      }
      
      await ctx.reply('✅ Сообщение успешно отправлено.');
      delete REPLY_LINKS[userId];
    } catch (err) {
      console.error('Ошибка при пересылке по ссылке:', err);
      await ctx.reply(`❌ Ошибка при пересылке: ${err?.description || err?.message || err}`);
    }
    return;
  }

  if (!isAdmin(ctx) && isPrivate(ctx) && !message.text?.startsWith('/')) {
    const userName = message.from.first_name || 'Без имени';
    const userUsername = message.from.username ? '@' + message.from.username : 'нет username';
    const time = new Date().toLocaleString('ru-RU');
    const caption = `📩 Новое сообщение из ЛС\n👤 Имя: ${userName}\n🔖 Username: ${userUsername}\n🆔 ID: ${userId}\n⏰ Время: ${time}`;

    try {
      await ctx.forwardMessage(ADMIN_CHAT_ID, chatId, message.message_id);
      await ctx.telegram.sendMessage(ADMIN_CHAT_ID, caption, { 
        parse_mode: 'HTML', 
        disable_web_page_preview: true 
      });
      
      if (!userFirstMessages.has(userId)) {
        await ctx.reply(`Спасибо, ${userName}!\nВаше сообщение получено. Мы свяжемся с вами в ближайшее время.`);
        userFirstMessages.add(userId);
      }
    } catch (err) {
      console.error('Ошибка при пересылке сообщения админам:', err);
    }
    return;
  }

  if (chatId === CHAT_ID && 
      message.forward_from_chat && 
      message.forward_from_chat.id === CHANNEL_ID && 
      message.forward_from_message_id &&
      !processedPosts.has(message.forward_from_message_id) &&
      !message.text?.startsWith('/')) {
    
    try {
      const sentMessage = await ctx.telegram.sendMessage(CHAT_ID, COMMENT_TEXT, {
        reply_to_message_id: message.message_id,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID, 
        `✅ Комментарий успешно отправлен!`, 
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
      
      processedPosts.add(message.forward_from_message_id);
    } catch (err) {
      console.error('Ошибка при отправке комментария:', err);
      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID, 
        `❌ Не удалось отправить комментарий!`, 
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
    }
    return;
  }
}));

setInterval(() => checkBotChats(bot), 5 * 60 * 1000);

// Загружаем чаты при запуске
setTimeout(() => {
  if (ALLOWED_CHATS_MESSAGE_ID) {
    loadAllowedChatsFromMessage();
  } else {
    console.log('ℹ️ ID сообщения с чатами не установлен. Используйте /init_chats для создания сообщения.');
  }
}, 3000);

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).send('Bot is running.');
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).send('Internal Server Error');
  }
};
