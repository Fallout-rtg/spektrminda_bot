const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_USERNAME = 'spektrminda';
const CHANNEL_ID = -1002696885166;
const ADMIN_CHAT_ID = -1002818324656;
const COMMENTS_CHAT_ID = -1002899007927;
const MAIN_CHAT_ID = -1002894920473;
const ADMIN_IDS = [1465194766, 2032240231, 1319314897];
const ALLOWED_CHATS = [
  { id: COMMENTS_CHAT_ID, name: 'Комментарии канала Я Спектр ♦️' },
  { id: ADMIN_CHAT_ID, name: 'Чат администрации 🏛️' },
  { id: MAIN_CHAT_ID, name: 'Основной чат 🧨' }
];

const STICKER_PACK_NAME = 'ShizaSpectre';
const COMMENT_TEXT = `<b>⚠️ Краткие правила комментариев:</b>

• Спам категорически запрещён.
• Запрещён любой контент сексуальной направленности. Комментарии должны быть читабельны на работе.
• Ведите себя прилично, не оскорбляйте других участников и поддерживайте обсуждение только по теме поста.
• Любая политика или околополитический контент касающийся событий в реальной жизни запрещен.
• Контент, запрещённый к распространению на территории Российской Федерации, будет удаляться, а участник — блокируется.

📡 <a href="https://t.me/spectrmind">Наш чат</a> | <a href="https://discord.gg/rBnww7ytM3">Discord</a> | <a href="https://www.tiktok.com/@spectr_mindustry?_t=ZN-8yZCVx33mr9&_r=1">TikTok</a>`;

const bot = new Telegraf(BOT_TOKEN);

const processedMediaGroups = new Set();
const messageConnections = new Map();
const userWarnings = new Map();
const spamJobs = new Map();
const stickerSetCache = {
  name: STICKER_PACK_NAME,
  stickers: [],
  lastUpdated: 0
};

const badWordsRhymes = {
  "хуй": "Хуй на мнения не делишь.",
  "пизда": "Пизда — не бриллиант, сиять не обязана.",
  "ебать": "Ебать — не мешки ворочать.",
  "блядь": "Блядь — не Ван Гог, а картины рисует.",
  "еблан": "Еблан — не баран, а блеет.",
  "говно": "Говно — не облако, летать не должно.",
  "долбоёб": "Долбоёб — не трактор, а пашет.",
  "мудак": "Мудак — не кактус, а колется.",
  "жопа": "Жопа — не роза, а краснеет.",
  "заебал": "Заебал — не котёл, а парит.",
  "иди на хуй": "На хуй идут, с хуя падают. Осторожней в пути.",
  "похуй": "Похуй — не озеро, рыбу не ловят.",
  "охуел": "Охуел — не памятник, ходить можешь.",
  "ахуел": "Ахуел — не памятник, ходить можешь.",
  "пиздец": "Пиздец — не телепорт, но переносит в другое состояние.",
  "ебашь": "Ебашь — не копейка, чтобы её беречь.",
  "заебало": "Заебало — не такси, выйти можно в любой момент.",
  "отъебись": "Отъёбись — не дверь, сама не откроется.",
  "выёбываешься": "Выёбываешься — не на выставке, приз не дадут.",
  "распиздяй": "Распиздяй — не фонтан, а разбрызгивает всё вокруг.",
  "конченый": "Конченый — не фильм, хэппи-энда не будет.",
  "блин": "Блин — не оладушек, к чаю не подают.",
  "черт": "Черт — не попугай, повторять не будет.",
  "чёрт": "Чёрт — не попугай, повторять не будет.",
  "ёлки-палки": "Ёлки-палки — не лес, гулять там не стоит.",
  "твою же": "Твою же — не разделяют, а принимают целиком.",
  "японский городовой": "Японский городовой — не самурай, мечом не машет."
};

function isAdmin(ctx) {
  return ADMIN_IDS.includes(ctx.from.id);
}

function isPrivate(ctx) {
  return ctx.chat.type === 'private';
}

function safeHandler(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (error) {
      console.error('Error in handler:', error);
    }
  };
}

function restrictedCommand(handler) {
  return safeHandler(async (ctx) => {
    if (!isPrivate(ctx) && !isAdmin(ctx)) {
      return;
    }
    await handler(ctx);
  });
}

async function updateStickerCache() {
  try {
    const stickerSet = await bot.telegram.getStickerSet(STICKER_PACK_NAME);
    stickerSetCache.stickers = stickerSet.stickers;
    stickerSetCache.lastUpdated = Date.now();
    console.log(`Обновлен кэш стикеров: ${stickerSetCache.stickers.length} стикеров`);
  } catch (error) {
    console.error('Ошибка при обновлении кэша стикеров:', error);
  }
}

async function sendRandomSticker(ctx) {
  if (stickerSetCache.stickers.length === 0) {
    await updateStickerCache();
  }

  if (stickerSetCache.stickers.length === 0) {
    await ctx.reply('❌ Стикерпак пуст или недоступен');
    return;
  }

  const randomSticker = stickerSetCache.stickers[
    Math.floor(Math.random() * stickerSetCache.stickers.length)
  ];

  try {
    await ctx.sendSticker(randomSticker.file_id);
  } catch (error) {
    console.error('Ошибка при отправке стикера:', error);
    await ctx.reply('❌ Не удалось отправить стикер');
  }
}

async function sendUserInfo(ctx, forwardedMsgId) {
  const user = ctx.from;
  const time = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const userInfo = `📩 Новое сообщение из ЛС
👤 Имя: ${user.first_name || 'Не указано'} ${user.last_name || ''}
🔖 Username: @${user.username || 'Не указан'}
🆔 ID: ${user.id}
⏰ Время: ${time}`;

  const infoMsg = await ctx.telegram.sendMessage(
    ADMIN_CHAT_ID,
    userInfo,
    {
      reply_parameters: { message_id: forwardedMsgId }
    }
  );

  messageConnections.set(infoMsg.message_id, {
    userId: user.id,
    userName: user.first_name || user.username || 'Пользователь'
  });

  return infoMsg.message_id;
}

async function sendCommentReport(postMessageId, commentMessageId) {
  const postLink = `https://t.me/${CHANNEL_USERNAME}/${postMessageId}`;
  const commentLink = `https://t.me/c/${Math.abs(COMMENTS_CHAT_ID).toString().slice(4)}/${commentMessageId}`;
  
  const reportText = `✅ Комментарий успешно отправлен!\nПост: ${postLink}\nКомментарий: ${commentLink}`;
  
  await bot.telegram.sendMessage(ADMIN_CHAT_ID, reportText);
}

bot.on('channel_post', safeHandler(async (ctx) => {
  const post = ctx.channelPost;
  
  if (!post.text && !post.caption) return;
  
  if (post.media_group_id) {
    if (processedMediaGroups.has(post.media_group_id)) {
      return;
    }
    processedMediaGroups.add(post.media_group_id);
    
    setTimeout(() => {
      processedMediaGroups.delete(post.media_group_id);
    }, 60 * 60 * 1000);
  }
  
  try {
    const commentMessage = await bot.telegram.sendMessage(
      COMMENTS_CHAT_ID,
      COMMENT_TEXT,
      {
        parse_mode: 'HTML',
        reply_parameters: { message_id: post.message_id }
      }
    );
    
    await sendCommentReport(post.message_id, commentMessage.message_id);
  } catch (error) {
    await bot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `❌ Ошибка при добавлении комментария к посту (ID: ${post.message_id}): ${error.message}`
    );
  }
}));

bot.on('new_chat_members', safeHandler(async (ctx) => {
  const chatId = ctx.chat.id;
  const newMembers = ctx.message.new_chat_members;

  const botMember = newMembers.find(member => member.id === ctx.botInfo.id);
  if (botMember && !ALLOWED_CHATS.some(chat => chat.id === chatId)) {
    try {
      await ctx.reply(
        '🚫 Этот чат не разрешён для работы бота.\n' +
        '📢 Подписывайтесь на наш канал: https://t.me/red_star_development',
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }

    try {
      await ctx.leaveChat();
    } catch (error) {
      console.error('Ошибка при выходе из чата:', error);
    }
    return;
  }

  if (chatId === COMMENTS_CHAT_ID) {
    for (const newMember of newMembers) {
      if (newMember.is_bot) continue;

      const warningMessage = await ctx.reply(
        `👋 Привет, ${newMember.first_name || 'пользователь'}!\n\n` +
        `⚠️ Этот чат предназначен только для комментариев к постам канала. ` +
        `Пожалуйста, покиньте чат в течение 5 минут, иначе вы будете исключены.\n\n` +
        `Если останетесь, мы будем вынуждены принять меры.`,
        { parse_mode: 'HTML' }
      );
      
      userWarnings.set(newMember.id, {
        chatId: ctx.chat.id,
        warningMessageId: warningMessage.message_id,
        joinTime: Date.now()
      });
      
      setTimeout(async () => {
        try {
          const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, newMember.id);
          
          if (['member', 'administrator', 'creator'].includes(chatMember.status)) {
            await ctx.telegram.banChatMember(ctx.chat.id, newMember.id, undefined, {
              revoke_messages: false
            });
            
            await ctx.reply(
              `❌ Пользователь ${newMember.first_name || 'без имени'} был исключен за нарушение правил чата.`,
              { reply_parameters: { message_id: warningMessage.message_id } }
            );
          }
        } catch (error) {
          console.error('Ошибка при исключении пользователя:', error);
        } finally {
          userWarnings.delete(newMember.id);
        }
      }, 5 * 60 * 1000);
    }
  }
}));

bot.on('left_chat_member', safeHandler(async (ctx) => {
  if (ctx.chat.id !== COMMENTS_CHAT_ID) return;
  
  const leftMember = ctx.message.left_chat_member;
  
  if (userWarnings.has(leftMember.id)) {
    const warningInfo = userWarnings.get(leftMember.id);
    
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        warningInfo.warningMessageId,
        null,
        `✅ Пользователь ${leftMember.first_name || 'без имени'} покинул чат добровольно. Спасибо за понимание!`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error('Ошибка при редактировании сообщения:', error);
    }
    
    userWarnings.delete(leftMember.id);
  }
}));

bot.command('shiza', restrictedCommand(async (ctx) => {
  await sendRandomSticker(ctx);
}));

bot.command('danger', restrictedCommand(async (ctx) => {
  if (ctx.from.id !== 2032240231) {
    await ctx.reply('❌ Эта команда только для Советчика.');
    return;
  }

  const messageText = ctx.message.text.split(' ').slice(1).join(' ');
  if (!messageText) {
    await ctx.reply('❌ Укажите сообщение для отправки. Пример: /danger Ваше сообщение');
    return;
  }

  const jobId = Date.now();
  let lastMessageId = null;

  const stopButton = Markup.inlineKeyboard([
    Markup.button.callback('СТОП', `stop_spam_${jobId}`)
  ]);

  const sendSpamMessage = async () => {
    try {
      if (lastMessageId) {
        try {
          await bot.telegram.deleteMessage(1465194766, lastMessageId);
        } catch (error) {
          console.error('Ошибка при удалении сообщения:', error);
        }
      }

      const sentMessage = await bot.telegram.sendMessage(
        1465194766,
        `${messageText}\n\n`,
        {
          parse_mode: 'HTML',
          ...stopButton
        }
      );

      lastMessageId = sentMessage.message_id;
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  await sendSpamMessage();

  const intervalId = setInterval(sendSpamMessage, 5000);
  spamJobs.set(jobId, {
    intervalId,
    lastMessageId,
    userId: ctx.from.id
  });

  await ctx.reply(`✅ Спам запущен с ID: ${jobId}. Для остановки нажмите кнопку СТОП в сообщении.`);
}));

bot.action(/stop_spam_(\d+)/, safeHandler(async (ctx) => {
  const jobId = parseInt(ctx.match[1]);
  const job = spamJobs.get(jobId);

  if (!job) {
    await ctx.answerCbQuery('Спам уже остановлен.');
    return;
  }

  if (ctx.from.id !== job.userId && !isAdmin(ctx)) {
    await ctx.answerCbQuery('У вас нет прав для остановки этого спама.');
    return;
  }

  clearInterval(job.intervalId);
  spamJobs.delete(jobId);

  if (job.lastMessageId) {
    try {
      await bot.telegram.deleteMessage(1465194766, job.lastMessageId);
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
    }
  }

  await ctx.answerCbQuery('Спам остановлен.');
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
}));

bot.on('message', safeHandler(async (ctx) => {
  const message = ctx.message;
  if (!message) return;
  
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text || '';

  if (text.startsWith('/')) {
    return;
  }

  if (isPrivate(ctx) && userId === 1319314897 && text.includes('Железяка, быстро мне анкету нарисовал блять')) {
    const userName = ctx.from.first_name || ctx.from.username || '';
    const currentTime = new Date().toLocaleString('ru-RU', { 
      timeZone: 'Europe/Moscow', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    const admText = `<b>📜 Анкета кандидата в администрации</b>

💬 Привет, ${userName}! Заполни эту анкету, если хочешь стать администратором. Отвечай честно — оцениваем не только опыт, но и личные качества.

<b>1️⃣ Ник в чате</b>

<b>2️⃣ Возраст</b>

<b>3️⃣ Часовой пояс</b> (указывай МСК, текущее время: <i>${currentTime}</i>)

<b>4️⃣ Как поступишь, если другой админ начнёт тебя оскорблять в чате?</b>

<b>5️⃣ Если два участника спорят на пустом месте — какие будут твои действия?</b>

<b>6️⃣ Как ты относишься к правилам чата?</b>

<b>7️⃣ Случалось ли тебе нарушать правила? Если да — опиши ситуацию.</b>

<b>8️⃣ Какой, по-твоему, должен быть админ?</b>

<b>9️⃣ Как часто ты заходишь в чат?</b>

<b>🔟 Сколько времени в среднем проводишь в чате за день?</b>

<b>1️⃣1️⃣ Почему ты хочешь стать админом?</b>

<b>1️⃣2️⃣ Чем ты можешь быть полезен чату?</b>`;
    
    await ctx.reply(admText, { parse_mode: 'HTML', disable_web_page_preview: true });
    return;
  }

  const lowerText = text.toLowerCase();
  for (const [word, rhyme] of Object.entries(badWordsRhymes)) {
    if (lowerText.includes(word)) {
      await ctx.reply(rhyme, { reply_parameters: { message_id: message.message_id } });
      break;
    }
  }

  if (isPrivate(ctx) && !isAdmin(ctx)) {
    try {
      const forwardedMsg = await ctx.forwardMessage(ADMIN_CHAT_ID);
      
      messageConnections.set(forwardedMsg.message_id, {
        userId: userId,
        userName: message.from.first_name || message.from.username || 'Пользователь'
      });
      
      const user = ctx.from;
      const time = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const userInfo = `📩 Новое сообщение из ЛС
👤 Имя: ${user.first_name || 'Не указано'} ${user.last_name || ''}
🔖 Username: @${user.username || 'Не указан'}
🆔 ID: ${user.id}
⏰ Время: ${time}`;

      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID,
        userInfo,
        {
          reply_parameters: { message_id: forwardedMsg.message_id }
        }
      );
      
      await ctx.reply('✅ Ваше сообщение отправлено администраторам. Ответим в ближайшее время.');
      
      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `✅ Сообщение от пользователя @${message.from.username || message.from.first_name} переслано в чат админов`
      );
    } catch (error) {
      console.error('Ошибка при пересылке сообщения:', error);
      await ctx.reply('❌ Произошла ошибка при отправке сообщения.');
      
      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `❌ Ошибка при пересылке сообщения от пользователя @${message.from.username || message.from.first_name}: ${error.message}`
      );
    }
    return;
  }
  
  if (chatId === ADMIN_CHAT_ID && isAdmin(ctx) && message.reply_to_message) {
    try {
      const repliedMsg = message.reply_to_message;
      const userData = messageConnections.get(repliedMsg.message_id);
      
      if (userData) {
        await ctx.copyMessage(userData.userId);
        
        await ctx.reply('✅ Ответ отправлен пользователю.', {
          reply_parameters: { message_id: message.message_id }
        });
        
        await ctx.telegram.sendMessage(
          userData.userId,
          '✅ Ваше сообщение было обработано администрацией. Спасибо за обращение!'
        );
      } else {
        await ctx.reply('❌ Не удалось найти пользователя для этого сообщения.', {
          reply_parameters: { message_id: message.message_id }
        });
      }
    } catch (error) {
      console.error('Ошибка при отправке ответа пользователю:', error);
      await ctx.reply('❌ Не удалось отправить ответ пользователю. Возможно, он заблокировал бота.', {
        reply_parameters: { message_id: message.message_id }
      });
    }
  }
}));

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

🕓 Обычно отвечаем в течение 1–2 дней.`;

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
/danger — отправка повторяющихся сообщений (только для Советчика)
/shiza — отправить случайный стикер из пака Шизы

<b>Как отвечать</b>:
💡 В ЛС: пересланное сообщение от пользователя -> ответьте на него — бот пересылает ответ пользователю.
💡 В чатах: отправьте ссылку на сообщение формата <code>https://t.me/c/&lt;chat_short_id&gt;/&lt;message_id&gt;</code>. Бот подтвердит принятие ссылки. Следующее отправленное вами сообщение (текст/фото/стикер/файл/видеo/опрос) будет переслано как ответ на указанный пост.`;
    await ctx.reply(adminHelpText, { parse_mode: 'HTML', disable_web_page_preview: true });
  } else {
    const userHelpText = `ℹ️ Команды пользователя:

/start — запустить бота
/help — показать это сообщение
/info — информации о боте
/adm — анкета на вступление в Совет Элит
/appeal — анкета для обжалования наказания
/shiza — отправить случайный стикер из пака Шизы`;
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
  if (!isAdmin(ctx)) return;
  await ctx.reply('✅ Бот работает корректно!');
}));

bot.command('allowed_chats', restrictedCommand(async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  let response = `<b>📋 Разрешённые чаты:</b>\n\n`;
  ALLOWED_CHATS.forEach(chat => {
    response += `• ${chat.name} (ID: ${chat.id})\n`;
  });
  
  await ctx.reply(response, { parse_mode: 'HTML' });
}));

bot.command('comment_text', restrictedCommand(async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  await ctx.reply(COMMENT_TEXT, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('adm', restrictedCommand(async (ctx) => {
  const userName = ctx.from.first_name || ctx.from.username || '';
  const currentTime = new Date().toLocaleString('ru-RU', { 
    timeZone: 'Europe/Moscow', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  const admText = `<b>📜 Анкета кандидата в администрации</b>

💬 Привет, ${userName}! Заполни эту анкету, если хочешь стать администратором. Отвечай честно — оцениваем не только опыт, но и личные качества.

<b>1️⃣ Ник в чате</b>

<b>2️⃣ Возраст</b>

<b>3️⃣ Часовой пояс</b> (указывай МСК, текущее время: <i>${currentTime}</i>)

<b>4️⃣ Как поступишь, если другой админ начнёт тебя оскорблять в чате?</b>

<b>5️⃣ Если два участника спорят на пустом месте — какие будут твои действия?</b>

<b>6️⃣ Как ты относишься к правилам чата?</b>

<b>7️⃣ Случалось ли тебе нарушать правила? Если да — опиши ситуацию.</b>

<b>8️⃣ Какой, по-твоему, должен быть админ?</b>

<b>9️⃣ Как часто ты заходишь в чат?</b>

<b>🔟 Сколько времени в среднем проводишь в чате за день?</b>

<b>1️⃣1️⃣ Почему ты хочешь стать админом?</b>

<b>1️⃣2️⃣ Чем ты можешь быть полезен чату?</b>`;
  
  await ctx.reply(admText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

bot.command('appeal', restrictedCommand(async (ctx) => {
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
<em>(объясни своей точки зрения — коротко и по делу)</em>

<b>6. Обещаешь ли ты не нарушать правила в будущем?</b>
<em>(честно)</em>

🔴 <b>Важно:</b>
— Сообщения без анкеты <b>не рассматриваются.</b>
— Жалобы с матами и угрозами — <b>игнорируются.</b>
— Повторная подача возможна <b>через 3 дня.</b>

⚖️ Ответ придёт в течение 48 часов.`;
  
  await ctx.reply(appealText, { parse_mode: 'HTML', disable_web_page_preview: true });
}));

setInterval(updateStickerCache, 60 * 60 * 1000);

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(400).send('Error');
  }
};

if (process.env.NODE_ENV === 'development') {
  bot.launch();
  console.log('Бот запущен в режиме разработки');
  updateStickerCache();
}
