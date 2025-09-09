const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) console.error('❌ BOT_TOKEN не установлен!');

const CHANNEL_USERNAME = 'spektrminda';
const CHANNEL_ID = -1002696885166;
const ADMIN_CHAT_ID = -1002818324656;
const ADMIN_IDS = [1465194766, 2032240231, 1319314897];
const ADMIN_NAMES = {
  1465194766: 'Спектр ♦️',
  2032240231: 'Советчик 📜',
  1319314897: 'Устричный Комиссар 🏛️'
};

const ALLOWED_CHATS = [
  { id: -1002899007927, name: 'Комментарии канала Я Спектр ♦️' },
  { id: -1002818324656, name: 'Чат администрации 🏛️' },
  { id: -1002894920473, name: 'Основной чат 🧨' }
];

const COMMENT_TEXT = `<b>⚠️ Краткие правила комментариев:</b>

• Спам категорически запрещён.
• Запрещён любой контент сексуальной направленности. Комментарии должны быть читабельны на работе.
• Ведите себя прилично, не оскорбляйте других участников и поддерживайте обсуждение только по теме поста.
• Любая политика или околополитический контент касающийся событий в реальной жизни запрещен.
• Контент, запрещённый к распространению на территории Российской Федерации, будет удаляться, а участник — блокироваться.

📡 <a href="https://t.me/+qAcLEuOQVbZhYWFi">Наш чат</a> | <a href="https://discord.gg/rBnww7ytM3">Discord</a> | <a href="https://www.tiktok.com/@spectr_mindustry?_t=ZN-8yZCVx33mr9&_r=1">TikTok</a>`;

const bot = new Telegraf(BOT_TOKEN);

let ACTIVE_CHATS = [];
let REPLY_LINKS = {};
const processedPosts = new Set();
const userFirstMessages = new Set();

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
          '🚫 Этот бот работает только для канала @spektrminda.',
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
          '🚫 Этот бот работает только для канала @spektrminda.',
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
Вы обратились в бот обратной связи канала Я Спектр ♦️.

💬 Здесь можно:
— обжаловать бан или другое наказание,
— предложить идею,
— задать вопрос администрации.

🕓 Обычно отвечаем в течение 1–2 дней.<a href="https://static-sg.winudf.com/wupload/xy/aprojectadmin/FxsBnVvw.jpg">​</a>`;
    
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
/info — информация о боте
/test — проверка работоспособности
/allowed_chats — показать список разрешённых чатов
/comment_text — показать текст комментариев под постами
/adm — анкета на вступление в Совет Элит
/appeal — анкета для обжалования наказания

<b>Как отвечать</b>:
💡 В ЛС: пересланное сообщение от пользователя -> ответьте на него — бот пересылает ответ пользователю.
💡 В чатах: отправьте ссылку на сообщение формата <code>https://t.me/c/&lt;chat_short_id&gt;/&lt;message_id&gt;</code>. Бот подтвердит принятие ссылки. Следующее отправленное вами сообщение (текст/фото/стикер/файл/видео/опрос) будет переслано как ответ на указанный пост.`;
    await ctx.reply(adminHelpText, { parse_mode: 'HTML', disable_web_page_preview: true });
  } else {
    const userHelpText = `ℹ️ Команды пользователя:

/start — запустить бота
/help — показать это сообщение
/info — информации о боте
/adm — анкета на вступление в Совет Элит
/appeal — анкета для обжалования наказания`;
    await ctx.reply(userHelpText, { parse_mode: 'HTML', disable_web_page_preview: true });
  }
}));

bot.command('info', restrictedCommand(async (ctx) => {
  const infoText = `⚙️ О боте
Версия: 0.0.1
ИИ: Red-AI 0.1
Разработчики: <a href="https://t.me/red_star_development">Красная звезда</a>`;
  await ctx.reply(infoText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('test', restrictedCommand(async (ctx) => {
  await ctx.reply('✅ Бот активен и работает в штатном режиме!');
}, { adminOnly: true }));

bot.command('allowed_chats', restrictedCommand(async (ctx) => {
  let chatList = '📝 Разрешённые чаты:\n';
  ALLOWED_CHATS.forEach(chat => {
    chatList += `• ${chat.name}\nID: ${chat.id}\n`;
  });
  
  await ctx.reply(chatList);
}, { adminOnly: true }));

bot.command('comment_text', restrictedCommand(async (ctx) => {
  await ctx.reply(COMMENT_TEXT, { parse_mode: 'HTML', disable_web_page_preview: true });
}, { adminOnly: true }));

bot.command('adm', safeHandler(async (ctx) => {
  if (!isPrivate(ctx) && !isAdmin(ctx)) {
    return ctx.reply('❌ Эту команду можно использовать только в ЛС.', { reply_to_message_id: ctx.message.message_id });
  }
  
  const userName = ctx.from.first_name || ctx.from.username || '';
  const currentTime = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const admText = `<b>📜 Анкета кандидата в администрацию</b>

💬 Привет, ${userName}! Заполни эту анкету, если хочешь стать администратором. Отвечай честно — оцениваем не только опыт, но и личные качества.

<b>1️⃣ Ник в чате</b>

<b>2️⃣ Возраст</b>

<b>3️⃣ Часовой пояс</b> (указывай МСК, текущее время: <i>${currentTime}</i>)

<b>4️⃣ Как поступишь, если другой админ начнёт тебя оскорблять в чате?</b>

<b>5️⃣ Если два участника спорят на пустом месте — какие будут твои действия?</b>

<b>6️⃣ Как ты относишься к правилам чата?</b>

<b>7️⃣ Случалось ли тебе нарушать правила? Если да — опиши ситуацию.</b>

<b>8️⃣ Какой, по-твоему, должен быть админ?</b>

<b>9️⃣ Что важнее: правила или личные отношения? Почему?</b>

<b>🔟 Как часто ты заходишь в чат?</b>

<b>1️⃣1️⃣ Сколько времени в среднем проводишь в чате за день?</b>

<b>1️⃣2️⃣ Почему ты хочешь стать админом?</b>

<b>1️⃣3️⃣ Чем ты можешь быть полезен чату?</b>`;
  await ctx.reply(admText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('appeal', safeHandler(async (ctx) => {
  if (!isPrivate(ctx) && !isAdmin(ctx)) {
    return ctx.reply('❌ Эту команду можно использовать только в ЛС.', { reply_to_message_id: ctx.message.message_id });
  }
  
  const appealText = `<b>📄 АНКЕТА ДЛЯ ОБЖАЛОВАНИЯ НАКАЗАНИЯ</b>

<b>1. Твой ник в Telegram:</b>
<em>(укажи имя, под которым тебя можно найти)</em>

<b>2. Какое наказание ты получил?</b>
<em>(Бан / Мут / Другое)</em>

<b>3. Дата и примерное время наказания:</b>
<em>(если не знаешь точно — укажи хотя бы приблизительно)</em>

<b>4. Причина, по которой тебя наказали:</b>
<em>(как ты это понял — что написал, куда скинул, кому ответил)</em>

<b>5. Почему ты считаешь, что наказание нужно отменить или сократить?</b>
<em>(объясни свою точку зрения — коротко и по делу)</em>

<b>6. Обещаешь ли ты не нарушать правила в будущем?</b>
<em>(честно)</em>

🔴 <b>Важно:</b>
— Сообщения без анкеты <b>не рассматриваются.</b>
— Жалобы с матами и угрозами — <b>игнорируются.</b>
— Повторная подача возможна <b>через 3 дня.</b>

⚖️ Ответ придёт в течение 48 часов.`;
  
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
          await ctx.reply('🚫 Этот бот работает только для канала @spektrminda.', { parse_mode: 'HTML', disable_web_page_preview: true });
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
    const parts = message.text.split(' ');
    const link = parts[0];
    const hasRFlag = parts.length > 1 && parts[1].toUpperCase() === 'Р';
    
    const match = link.match(/https:\/\/t\.me\/c\/(\d+)\/(\d+)/);
    if (!match) {
      await ctx.reply('❌ Неверный формат ссылки.');
      return;
    }
    
    const shortChat = match[1];
    const msgId = parseInt(match[2], 10);
    const targetChatId = parseInt('-100' + shortChat, 10);
    const isMainChat = targetChatId === -1002894920473;
    
    REPLY_LINKS[userId] = { 
      chatId: targetChatId, 
      messageId: msgId,
      shouldReply: !(isMainChat && hasRFlag)
    };
    
    await ctx.reply('✅ Ссылка принята. Следующее отправленное вами сообщение будет переслано' + 
                   (isMainChat && hasRFlag ? ' в чат без ответа.' : ' как ответ.'));
    return;
  }

  if (isAdmin(ctx) && REPLY_LINKS[userId] && !(message.text?.startsWith('/'))) {
    const { chatId: targetChat, messageId: targetMessage, shouldReply } = REPLY_LINKS[userId];
    try {
      const sendOptions = shouldReply ? { reply_to_message_id: targetMessage } : {};
      
      if (message.text) {
        await ctx.telegram.sendMessage(targetChat, message.text, { ...sendOptions, disable_web_page_preview: true });
      } else if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(targetChat, fileId, { ...sendOptions, caption: message.caption || '' });
      } else if (message.video) {
        await ctx.telegram.sendVideo(targetChat, message.video.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.document) {
        await ctx.telegram.sendDocument(targetChat, message.document.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.sticker) {
        await ctx.telegram.sendSticker(targetChat, message.sticker.file_id, sendOptions);
      } else if (message.animation) {
        await ctx.telegram.sendAnimation(targetChat, message.animation.file_id, { ...sendOptions, caption: message.caption || '' });
      } else if (message.audio) {
        await ctx.telegram.sendAudio(targetChat, message.audio.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.voice) {
        await ctx.telegram.sendVoice(targetChat, message.voice.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.video_note) {
        await ctx.telegram.sendVideoNote(targetChat, message.video_note.file_id, sendOptions);
      } else if (message.poll) {
        const p = message.poll;
        const options = p.options.map(o => o.text);
        await ctx.telegram.sendPoll(targetChat, p.question, options, { 
          ...sendOptions,
          is_anonymous: p.is_anonymous, 
          type: p.type
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

  const isAllowedChat = ALLOWED_CHATS.some(chat => 
    chat.id === chatId && 
    (chat.id === -1002899007927 || chat.id === -1002894920473)
  );

  if (isAllowedChat && 
      message.forward_from_chat && 
      message.forward_from_chat.id === CHANNEL_ID && 
      message.forward_from_message_id &&
      !processedPosts.has(message.forward_from_message_id) &&
      !message.text?.startsWith('/')) {
    
    try {
      const sentMessage = await ctx.telegram.sendMessage(chatId, COMMENT_TEXT, {
        reply_to_message_id: message.message_id,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      const postLink = `https://t.me/${message.forward_from_chat.username}/${message.forward_from_message_id}`;
      const commentLink = `https://t.me/c/${String(chatId).slice(4)}/${sentMessage.message_id}`;

      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID, 
        `✅ Комментарий успешно отправлен!\nПост: ${postLink}\nКомментарий: ${commentLink}`, 
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
      
      processedPosts.add(message.forward_from_message_id);
    } catch (err) {
      console.error('Ошибка при отправке комментария:', err);
      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID, 
        `❌ Не удалось отправить комментарий!\nОшибка: ${err?.message || err}`, 
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
    }
    return;
  }
}));

setInterval(() => checkBotChats(bot), 5 * 60 * 1000);

setTimeout(() => {
  console.log('Инициализация завершена');
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
