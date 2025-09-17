const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не установлен!');
  process.exit(1);
}

const CHANNEL_USERNAME = 'spektrminda';
const CHANNEL_ID = -1002696885166;
const ADMIN_CHAT_ID = -1002818324656;
const MAIN_CHAT_ID = -1002894920473;
const COMMENTS_CHAT_ID = -1002899007927;
const ADMIN_IDS = [1465194766, 2032240231, 1319314897];

const ADMIN_TARGETS = {
  SPECTRE: 1465194766,
  ADVISOR: 2032240231,
  COMMISSAR: 1319314897
};

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

📡 <a href="https://t.me/+qAcLEuOQVbZhYWFi">Наш чат</a> | <a href="https://discord.gg/rBnww7ytM3">Discord</a> | <a href="https://www.tiktok.com/@spectr_mindustry?_t=ZN-8yZCVx33mr9&_r=1">TikTok</a>`;

const bot = new Telegraf(BOT_TOKEN);

let ACTIVE_CHATS = [];
let REPLY_LINKS = {};
let DANGER_MODE = false;
let DANGER_TARGET = null;
let DANGER_MESSAGE = null;
const processedPosts = new Set();
const userFirstMessages = new Set();
const spamIntervals = new Map();
const userWarnings = new Map();
const stickerCache = {
  stickers: [],
  lastUpdated: 0
};

const badWordsRhymes = {
  "хуй": "Хуй на мнения не делишь.",
  "пизда": "Пизда — не бриллиант, сиять не обязана.",
  "ебать": "Ебать — не мешки ворочать.",
  "блядь": "Блядь — не Ван Гог, а картины рисует.",
  "еблан": "Еблан — не баран, а блеет.",
  "говно": "Говно — не облака, летать не должно.",
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

async function isBotAdmin(chatId) {
  try {
    const chatMember = await bot.telegram.getChatMember(chatId, bot.botInfo.id);
    return ['administrator', 'creator'].includes(chatMember.status);
  } catch (error) {
    console.error('Ошибка при проверке прав бота:', error);
    return false;
  }
}

async function updateStickerCache() {
  try {
    const stickerSet = await bot.telegram.getStickerSet(STICKER_PACK_NAME);
    stickerCache.stickers = stickerSet.stickers;
    stickerCache.lastUpdated = Date.now();
    console.log(`Обновлен кэш стикеров: ${stickerCache.stickers.length} стикеров`);
  } catch (error) {
    console.error('Ошибка при загрузке стикерпака:', error);
  }
}

async function sendRandomSticker(chatId) {
  if (stickerCache.stickers.length === 0 || Date.now() - stickerCache.lastUpdated > 3600000) {
    await updateStickerCache();
  }

  if (stickerCache.stickers.length === 0) {
    return false;
  }

  const randomIndex = Math.floor(Math.random() * stickerCache.stickers.length);
  const randomSticker = stickerCache.stickers[randomIndex];
  
  try {
    await bot.telegram.sendSticker(chatId, randomSticker.file_id);
    return true;
  } catch (error) {
    console.error('Ошибка при отправке стикера:', error);
    return false;
  }
}

async function sendRandomStickerToChat(chatId) {
  if (Math.random() < 0.02) {
    await sendRandomSticker(chatId);
  }
}

function safeHandler(handler) {
  return async (ctx) => {
    try {
      await handler(ctx);
    } catch (err) {
      console.error('Ошибка в обработчике:', err);
      try { 
        if (ctx && ctx.reply) {
          await ctx.reply('❌ Произошла ошибка при обработке запроса. Попробуйте позже.'); 
        }
      } catch (e) {
        console.error('Не удалось отправить сообщение об ошибке:', e);
      }
    }
  };
}

function isAdmin(ctx) {
  try { 
    return ctx.from && ADMIN_IDS.includes(ctx.from.id); 
  } catch { 
    return false; 
  }
}

function isPrivate(ctx) {
  try { 
    return ctx.chat && ctx.chat.type === 'private'; 
  } catch { 
    return false; 
  }
}

function restrictedCommand(handler, { adminOnly = false } = {}) {
  return safeHandler(async (ctx) => {
    if (!isPrivate(ctx) && !isAdmin(ctx)) {
      try {
        await ctx.reply('❌ Эту команду можно использовать только в ЛС.', { 
          reply_to_message_id: ctx.message?.message_id 
        });
      } catch (e) {
        console.error('Не удалось отправить сообщение о ограничении:', e);
      }
      return;
    }
    if (adminOnly && !isAdmin(ctx)) {
      try {
        await ctx.reply('❌ Только админам.', { 
          reply_to_message_id: ctx.message?.message_id 
        });
      } catch (e) {
        console.error('Не удалось отправить сообщение о правах админа:', e);
      }
      return;
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
          '🚫 Этот чат не разрешён для работы бота.\n\n📢 Подписывайтесь на наш канал: https://t.me/red_star_development',
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
      } catch (e) {
        console.error('Не удалось отправить сообщение о выходе:', e);
      }
      
      try {
        const isAdmin = await isBotAdmin(chatId);
        if (isAdmin) {
          await botInstance.telegram.leaveChat(chatId);
          console.log(`Бот вышел из чата ${chatId}`);
        } else {
          console.log(`Бот не является администратором в чате ${chatId}, не может выйти самостоятельно`);
        }
      } catch (e) {
        console.error(`Не удалось выйти из чата ${chatId}:`, e);
      }
      
      ACTIVE_CHATS = ACTIVE_CHATS.filter(id => id !== chatId);
    }
  }
}

bot.on('chat_member', async (ctx) => {
  try {
    const chat = ctx.chat;
    const newMember = ctx.update.chat_member.new_chat_member;

    if (newMember.user.id === ctx.botInfo.id && chat.type !== 'private') {
      if (!ALLOWED_CHATS.some(chatObj => chatObj.id === chat.id)) {
        try {
          await ctx.telegram.sendMessage(
            chat.id,
            '🚫 Этот чат не разрешён для работы бота.\n\n📢 Подписывайтесь на наш канал: https://t.me/red_star_development',
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        } catch (e) {
          console.error('Не удалось отправить сообщение о выходе:', e);
        }
        
        try {
          const isAdmin = await isBotAdmin(chat.id);
          if (isAdmin) {
            await ctx.telegram.leaveChat(chat.id);
            console.log(`Бот вышел из чата ${chat.id}`);
          } else {
            console.log(`Бot не может выйти из чата ${chat.id} самостоятельно`);
          }
        } catch (err) {
          console.error('Ошибка при выходе из группы:', err);
        }
      }
    }
  } catch (err) {
    console.error('Ошибка в обработчике chat_member:', err);
  }
});

bot.on('new_chat_members', safeHandler(async (ctx) => {
  if (ctx.chat.id !== COMMENTS_CHAT_ID) return;
  
  for (const newMember of ctx.message.new_chat_members) {
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
            { reply_to_message_id: warningMessage.message_id }
          );
        }
      } catch (error) {
        console.error('Ошибка при исключении пользователя:', error);
      } finally {
        userWarnings.delete(newMember.id);
      }
    }, 5 * 60 * 1000);
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

bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('stop_spam_')) {
      const spamId = data.replace('stop_spam_', '');
      
      if (spamIntervals.has(spamId)) {
        const spamInfo = spamIntervals.get(spamId);
        clearInterval(spamInfo.interval);
        spamIntervals.delete(spamId);
        
        await ctx.telegram.editMessageText(
          spamInfo.chatId,
          spamInfo.messageId,
          null,
          '✅ Спам остановлен вручную.',
          { reply_markup: { inline_keyboard: [] } }
        );
        
        await ctx.answerCbQuery('Спам остановлен');
      } else {
        await ctx.answerCbQuery('Спам уже остановлен');
      }
    }
    
    if (data.startsWith('danger_')) {
      if (ctx.from.id !== 2032240231) {
        await ctx.answerCbQuery('❌ Только Советчик может использовать эту команду.');
        return;
      }

      const targetMap = {
        'danger_spectre': ADMIN_TARGETS.SPECTRE,
        'danger_advisor': ADMIN_TARGETS.ADVISOR,
        'danger_commissar': ADMIN_TARGETS.COMMISSAR
      };

      DANGER_TARGET = targetMap[data];
      DANGER_MODE = true;

      await ctx.editMessageText('✅ Режим опасности активирован. Отправьте сообщение для спама.');
      await ctx.answerCbQuery();
    }
    
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Ошибка при обработке callback query:', error);
  }
});

bot.catch((err, ctx) => {
  console.error('Global error', err, ctx?.update?.update_id);
});

bot.command('shiza', restrictedCommand(async (ctx) => {
  const success = await sendRandomSticker(MAIN_CHAT_ID);
  if (success) {
    await ctx.reply('✅ Стикер отправлен в основной чат');
  } else {
    await ctx.reply('❌ Не удалось отправить стикер');
  }
}, { adminOnly: true }));

bot.command('danger', restrictedCommand(async (ctx) => {
  if (ctx.from.id !== 2032240231) {
    await ctx.reply('❌ Эта команда только для Советчика.');
    return;
  }

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('Спектр ♦️', 'danger_spectre')],
    [Markup.button.callback('Советчик 📜', 'danger_advisor')],
    [Markup.button.callback('Устричный Комиссар 🏛️', 'danger_commissar')]
  ]);

  await ctx.reply('✅ Режим опасности активирован. Выберите админа для спама:', buttons);
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
/shiza — отправить случайный стикер из пака Шизы в основной чат

<b>Как отвечать</b>:
💡 В ЛС: пересланное сообщение от пользователя -> ответьте на него — бот пересылает ответ пользователю.
💡 В чатах: отправьте ссылку на сообщение формата <code>https://t.me/c/&lt;chat_short_id&gt;/&lt;message_id&gt;</code> или <code>https://t.me/spectrmind/1/&lt;message_id&gt;</code>. Бot подтвердит принятие ссылки. Следующее отправленное вами сообщение (текст/фото/стикер/файл/видео/опрос) будет переслано как ответ на указанный пост.`;
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
    try {
      await ctx.reply('❌ Эту команду можно использовать только в ЛС.', { 
        reply_to_message_id: ctx.message?.message_id 
      });
    } catch (e) {}
    return;
  }
  
  const userName = ctx.from.first_name || ctx.from.username || '';
  const currentTime = new Date().toLocaleString('ru-RU', { 
    timeZone: 'Europe/Moscow', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
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
    try {
      await ctx.reply('❌ Эту команду можно использовать только в ЛС.', { 
        reply_to_message_id: ctx.message?.message_id 
      });
    } catch (e) {}
    return;
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
  const text = message.text || '';

  if (ALLOWED_CHATS.some(chat => chat.id === chatId) && !message.text?.startsWith('/')) {
    await sendRandomStickerToChat(chatId);
  }

  if (DANGER_MODE && userId === 2032240231 && DANGER_TARGET) {
    DANGER_MODE = false;
    DANGER_MESSAGE = text;

    const spamId = Date.now().toString();
    let messageCount = 0;
    const MAX_MESSAGES = 50;

    const stopButton = Markup.inlineKeyboard([
      [Markup.button.callback('🛑 ОСТАНОВИТЬ СПАМ', `stop_spam_${spamId}`)]
    ]);

    const sentMessage = await ctx.reply(
      `🔴 Спам запущен для админа ${DANGER_TARGET}\nОтправлено сообщений: ${messageCount}/${MAX_MESSAGES}\n\nДля остановки нажмите кнопку ниже:`,
      stopButton
    );

    const spamInterval = setInterval(async () => {
      if (messageCount >= MAX_MESSAGES) {
        clearInterval(spamInterval);
        spamIntervals.delete(spamId);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          sentMessage.message_id,
          null,
          `✅ Спам завершен. Достигнут лимит в ${MAX_MESSAGES} сообщений.`,
          { reply_markup: { inline_keyboard: [] } }
        );
        return;
      }

      try {
        await bot.telegram.sendMessage(
          DANGER_TARGET,
          DANGER_MESSAGE,
          { parse_mode: 'HTML' }
        );
        
        messageCount++;
        
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          sentMessage.message_id,
          null,
          `🔴 Спам запущен для админа ${DANGER_TARGET}\nОтправлено сообщений: ${messageCount}/${MAX_MESSAGES}\n\nДля остановки нажмите кнопку ниже:`,
          stopButton
        );
      } catch (error) {
        console.error('Ошибка при отправке спама:', error);
        
        if (error.description && error.description.includes('bot was blocked by the user')) {
          clearInterval(spamInterval);
          spamIntervals.delete(spamId);
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMessage.message_id,
            null,
            `❌ Спам остановлен. Бот заблокирован пользователем ${DANGER_TARGET}.`,
            { reply_markup: { inline_keyboard: [] } }
          );
        } else {
          console.error('Ошибка при спаме, но продолжаем:', error);
        }
      }
    }, 3000);

    spamIntervals.set(spamId, {
      interval: spamInterval,
      messageId: sentMessage.message_id,
      chatId: ctx.chat.id
    });
    
    DANGER_TARGET = null;
    return;
  }

  if (userId === 1319314897 && isPrivate(ctx) && text.includes('Железяка, быстро мне анкету нарисовал блять')) {
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

<b>9️⃣ Что важнее: правила или личные отношения? Почему?</b>

<b>🔟 Как часто ты заходишь в чат?</b>

<b>1️⃣1️⃣ Сколько времени в среднем проводишь в чате за день?</b>

<b>1️⃣2️⃣ Почему ты хочешь стать админом?</b>

<b>1️⃣3️⃣ Чем ты можешь быть полезен чату?</b>`;
    
    await ctx.reply(admText, { parse_mode: 'HTML', disable_web_page_preview: true });
    return;
  }

  const lowerText = text.toLowerCase();
  for (const [word, rhyme] of Object.entries(badWordsRhymes)) {
    if (lowerText.includes(word.toLowerCase())) {
      await ctx.reply(rhyme, { reply_to_message_id: message.message_id });
      break;
    }
  }

  if (message.text?.startsWith('/')) {
    return;
  }

  if (message.new_chat_members) {
    const botId = ctx.botInfo?.id || (await ctx.telegram.getMe()).id;
    const isBotAdded = message.new_chat_members.some(m => m.is_bot && m.id === botId);
    
    if (isBotAdded) {
      if (!ACTIVE_CHATS.includes(chatId)) ACTIVE_CHATS.push(chatId);
      
      if (!ALLOWED_CHATS.some(chat => chat.id === chatId)) {
        try {
          await ctx.reply('🚫 Этот чат не разрешён для работы бота.\n\n📢 Подписывайтесь на наш канал: https://t.me/red_star_development', { 
            parse_mode: 'HTML', 
            disable_web_page_preview: true 
          });
        } catch (e) {
          console.error('Не удалось отправить сообщение о выходе:', e);
        }
        
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch {}
        
        try { 
          const isAdmin = await isBotAdmin(chatId);
          if (isAdmin) {
            await ctx.leaveChat(); 
            console.log(`Бот вышел из чата ${chatId}`);
          } else {
            console.log(`Бот не является администратором в чате ${chatId}, не может выйти самостоятельно`);
          }
        } catch (e) {
          console.error(`Не удалось выйти из чата ${chatId}:`, e);
        }
        
        ACTIVE_CHATS = ACTIVE_CHATS.filter(id => id !== chatId);
      }
    }
    return;
  }

  if (isAdmin(ctx) && chatId === ADMIN_CHAT_ID && message.reply_to_message) {
    let originalId = null;
    const replied = message.reply_to_message;

    if (replied.forward_from && replied.forward_from.id) {
      originalId = replied.forward_from.id;
    } else if (replied.text || replied.caption) {
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
      const sendOptions = {};
      
      if (message.text) {
        await ctx.telegram.sendMessage(originalId, message.text, { 
          ...sendOptions, 
          disable_web_page_preview: true 
        });
      } else if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(originalId, fileId, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.video) {
        await ctx.telegram.sendVideo(originalId, message.video.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.document) {
        await ctx.telegram.sendDocument(originalId, message.document.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.sticker) {
        await ctx.telegram.sendSticker(originalId, message.sticker.file_id, sendOptions);
      } else if (message.animation) {
        await ctx.telegram.sendAnimation(originalId, message.animation.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.audio) {
        await ctx.telegram.sendAudio(originalId, message.audio.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.voice) {
        await ctx.telegram.sendVoice(originalId, message.voice.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
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
      
      await ctx.reply('✅ Ответ отправлен пользователю.', { 
        reply_to_message_id: message.message_id 
      });
    } catch (err) {
      console.error('Ошибка при отправке ответа пользователю:', err);
      if (err.description && err.description.includes('Forbidden')) {
        await ctx.reply('❌ Не удалось отправить ответ: пользователь заблокировал бота.', { 
          reply_to_message_id: message.message_id 
        });
      } else {
        await ctx.reply('❌ Не удалось отправить ответ.', { 
          reply_to_message_id: message.message_id 
        });
      }
    }
    return;
  }

  if (isAdmin(ctx) && isPrivate(ctx) && message.text) {
    const linkMatch = message.text.match(/https:\/\/t\.me\/(c\/|spectrmind\/1\/)(\d+)/);
    if (linkMatch) {
      const messageId = parseInt(linkMatch[2], 10);
      let targetChatId = null;
      
      if (linkMatch[1].startsWith('c/')) {
        targetChatId = parseInt('-100' + messageId, 10);
      } else {
        targetChatId = MAIN_CHAT_ID;
      }
      
      REPLY_LINKS[userId] = { 
        chatId: targetChatId, 
        messageId: messageId,
        shouldReply: true
      };
      
      await ctx.reply('✅ Ссылка принята. Следующее отправленное вами сообщение будет переслано как ответ.');
      return;
    }
  }

  if (isAdmin(ctx) && REPLY_LINKS[userId] && !(message.text?.startsWith('/'))) {
    const { chatId: targetChat, messageId: targetMessage, shouldReply } = REPLY_LINKS[userId];
    try {
      const sendOptions = shouldReply ? { reply_to_message_id: targetMessage } : {};
      
      if (message.text) {
        await ctx.telegram.sendMessage(targetChat, message.text, { 
          ...sendOptions, 
          disable_web_page_preview: true 
        });
      } else if (message.photo) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(targetChat, fileId, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.video) {
        await ctx.telegram.sendVideo(targetChat, message.video.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.document) {
        await ctx.telegram.sendDocument(targetChat, message.document.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
      } else if (message.sticker) {
        await ctx.telegram.sendSticker(targetChat, message.sticker.file_id, sendOptions);
      } else if (message.animation) {
        await ctx.telegram.sendAnimation(targetChat, message.animation.file_id, { 
          ...sendOptions, 
          caption: message.caption || '' 
        });
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
      if (err.description && err.description.includes('Forbidden')) {
        await ctx.reply('❌ Не удалось отправить сообщение: бот не имеет доступа к чату или был заблокирован.');
      } else if (err.description && err.description.includes('chat not found')) {
        await ctx.reply('❌ Не удалось отправить сообщение: чат не найден.');
      } else {
        await ctx.reply(`❌ Ошибка при пересылке: ${err?.description || err?.message || 'Неизвестная ошибка'}`);
      }
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
      try {
        await ctx.telegram.sendMessage(
          ADMIN_CHAT_ID, 
          `📩 Новое сообщение из ЛС (не удалось переслать)\n👤 Имя: ${userName}\n🔖 Username: ${userUsername}\n🆔 ID: ${userId}\n⏰ Время: ${time}`,
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        
        if (message.text) {
          await ctx.telegram.sendMessage(
            ADMIN_CHAT_ID,
            `📝 Текст сообщения: ${message.text}`,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        
        if (!userFirstMessages.has(userId)) {
          await ctx.reply(`Спасибо, ${userName}!\nВаше сообщение получено. Мы свяжемся с вами в ближайшее время.`);
          userFirstMessages.add(userId);
        }
      } catch (e) {
        console.error('Не удалось отправить уведомление админам:', e);
      }
    }
    return;
  }

  const isAllowedChat = ALLOWED_CHATS.some(chat => 
    chat.id === chatId && 
    (chat.id === COMMENTS_CHAT_ID || chat.id === MAIN_CHAT_ID)
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

      let postLink, commentLink;
      
      if (chatId === COMMENTS_CHAT_ID) {
        postLink = `https://t.me/${message.forward_from_chat.username}/${message.forward_from_message_id}`;
        commentLink = `https://t.me/c/${Math.abs(chatId).toString().slice(4)}/${sentMessage.message_id}`;
      } else {
        postLink = `https://t.me/${CHANNEL_USERNAME}/${message.forward_from_message_id}`;
        commentLink = `https://t.me/${CHANNEL_USERNAME}/1/${sentMessage.message_id}`;
      }

      await ctx.telegram.sendMessage(
        ADMIN_CHAT_ID, 
        `✅ Комментарий успешно отправлен!\nПост: ${postLink}\nКомментарий: ${commentLink}`, 
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
      
      processedPosts.add(message.forward_from_message_id);
    } catch (err) {
      console.error('Ошибка при отправке комментария:', err);
      try {
        await ctx.telegram.sendMessage(
          ADMIN_CHAT_ID, 
          `❌ Не удалось отправить комментарий!\nОшибка: ${err?.message || err}`, 
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
      } catch (e) {}
    }
    return;
  }
}));

setInterval(() => checkBotChats(bot), 5 * 60 * 1000);
setInterval(updateStickerCache, 60 * 60 * 1000);

setTimeout(() => {
  console.log('Инициализация завершена');
  updateStickerCache();
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
