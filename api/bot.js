const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не установлен!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Функция для выхода из всех чатов
async function leaveAllChats() {
  try {
    // Получаем информацию о боте
    const botInfo = await bot.telegram.getMe();
    console.log(`🤖 Бот ${botInfo.first_name} начинает процесс отключения...`);
    
    // Здесь должен быть код для получения списка всех чатов, где состоит бот
    // К сожалению, Telegram Bot API не предоставляет метод для получения этого списка
    // Поэтому нужно вручную указать ID чатов, из которых нужно выйти
    
    const knownChats = [
      -1002818324656, // Чат администрации 🏛️
      -1002894920473, // Основной чат 🧨
      -1002899007927, // Комментарии канала Я Спектр ♦️
      // Добавьте сюда другие ID чатов, из которых нужно выйти
    ];
    
    // Выходим из всех известных чатов
    for (const chatId of knownChats) {
      try {
        // Отправляем прощальное сообщение
        await bot.telegram.sendMessage(
          chatId,
          '👋 Прощайте! Бот прекращает свою работу. Спасибо за всё! 🎉\n\n' +
          'Если потребуется снова запустить бота, обратитесь к разработчикам.'
        );
        
        // Выходим из чата
        await bot.telegram.leaveChat(chatId);
        console.log(`✅ Вышли из чата ${chatId}`);
        
        // Небольшая задержка между выходами
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Ошибка при выходе из чата ${chatId}:`, error.message);
      }
    }
    
    console.log('✅ Бот успешно вышел из всех чатов. Завершаем работу...');
    
  } catch (error) {
    console.error('❌ Произошла ошибка:', error);
  } finally {
    // Завершаем процесс
    process.exit(0);
  }
}

// Запускаем процесс выхода
leaveAllChats();

// Обработчик для немедленного выхода при получении сообщения (на случай необходимости)
bot.command('shutdown', async (ctx) => {
  await ctx.reply('🛑 Начинаю процесс отключения...');
  leaveAllChats();
});

// Запускаем бота для обработки команды shutdown
bot.launch().then(() => {
  console.log('🔄 Бот запущен для обработки команды /shutdown');
});

// Правильно обрабатываем завершение процесса
process.once('SIGINT', () => leaveAllChats());
process.once('SIGTERM', () => leaveAllChats());
