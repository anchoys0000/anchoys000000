/* ============================================================
   ОТПРАВКА ЗАКАЗА В TELEGRAM
   Сайт вызывает: tgSendOrder(order)
   order = {
     num:      'ЗК-1234',          // номер заказа
     name:     'Иван',             // имя клиента
     phone:    '+7 (999) 111-22-33',
     type:     'delivery',         // 'delivery' | 'pickup'
     address:  'ул. Ленина, 1',    // при доставке
     time:     'Как можно скорее',
     pay:      'cash',             // 'cash' | 'card'
     comment:  'без лука',
     items:    [{name, qty, price, sum}, ...],
     subtotal: 990,                // сумма без доставки
     delivery: 200,                // стоимость доставки (0 = бесплатно)
     total:    1190
   }
   ============================================================ */

function tgSendOrder(order) {
  // Не настроено? Не ломаем заказ, просто предупреждаем в консоль.
  if (!window.TG_BOT_TOKEN || !window.TG_CHAT_ID ||
      window.TG_BOT_TOKEN.indexOf('ВСТАВЬ') === 0 ||
      window.TG_CHAT_ID.indexOf('ВСТАВЬ') === 0) {
    console.warn('[Telegram] Бот не настроен: заполните telegram/config.js');
    return Promise.resolve(false);
  }

  var typeLabel = order.type === 'pickup' ? '🏃 Самовывоз' : '🚗 Доставка';
  var payLabel  = order.pay === 'card' ? '💳 Картой курьеру' : '💵 Наличные';

  var lines = [];
  lines.push('<b>🔔 НОВЫЙ ЗАКАЗ ' + tgEsc(order.num) + '</b>');
  lines.push('');
  order.items.forEach(function (it, i) {
    lines.push((i + 1) + '. ' + tgEsc(it.name) + ' ×' + it.qty + ' — ' + tgEsc(it.sumText));
  });
  lines.push('');
  lines.push('Сумма: ' + tgEsc(order.subtotalText));
  if (order.type === 'pickup') {
    lines.push('Получение: ' + typeLabel);
  } else {
    lines.push('Доставка: ' + (order.delivery === 0 ? 'бесплатно' : tgEsc(order.deliveryText)));
  }
  lines.push('<b>Итого: ' + tgEsc(order.totalText) + '</b>');
  lines.push('');
  lines.push('👤 Имя: ' + tgEsc(order.name));
  lines.push('📞 Телефон: ' + tgEsc(order.phone));
  lines.push(typeLabel + (order.type !== 'pickup' ? ': ' + tgEsc(order.address) : ''));
  lines.push('🕐 Когда: ' + tgEsc(order.time));
  lines.push('Оплата: ' + payLabel);
  if (order.comment) lines.push('💬 Комментарий: ' + tgEsc(order.comment));

  var url = 'https://api.telegram.org/bot' + window.TG_BOT_TOKEN + '/sendMessage';
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: window.TG_CHAT_ID,
      text: lines.join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  }).then(function (r) {
    if (!r.ok) console.warn('[Telegram] Ошибка отправки, HTTP ' + r.status);
    return r.ok;
  }).catch(function (e) {
    console.warn('[Telegram] Не удалось отправить:', e);
    return false;
  });
}

// Экранирование для телеграм-формата HTML
function tgEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
