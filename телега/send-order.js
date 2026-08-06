/* ============================================================
   ОТПРАВКА ЗАКАЗА В TELEGRAM
   Вызывается из index.html после оформления заказа.
   Настройки лежат в config.js (TG_BOT_TOKEN, TG_CHAT_ID)
   ============================================================ */

// order = {
//   num, name, phone, type ('delivery'|'pickup'), address,
//   pay, comment, items:[{name,qty,price}], subtotal, delivery, total
// }
async function sendOrderToTelegram(order) {
  const lines = [
    '🛎 <b>Новый заказ ' + order.num + '</b>',
    '',
    '<b>Клиент:</b> ' + tgEsc(order.name),
    '<b>Телефон:</b> ' + tgEsc(order.phone),
    '<b>Получение:</b> ' + (order.type === 'delivery' ? '🚗 Доставка' : '🏃 Самовывоз'),
  ];
  if (order.type === 'delivery') lines.push('<b>Адрес:</b> ' + tgEsc(order.address));
  lines.push('<b>Оплата:</b> ' + (order.pay === 'card' ? '💳 Картой' : '💵 Наличные'));
  if (order.comment) lines.push('<b>Комментарий:</b> ' + tgEsc(order.comment));
  lines.push('', '<b>Состав заказа:</b>');
  order.items.forEach(it => {
    lines.push('• ' + tgEsc(it.name) + ' ×' + it.qty + ' — ' + tgEsc(it.price));
  });
  lines.push('');
  lines.push('<b>Сумма:</b> ' + tgEsc(order.subtotal));
  lines.push('<b>Доставка:</b> ' + (order.delivery === 0 ? 'Бесплатно' : tgEsc(order.delivery)));
  lines.push('<b>ИТОГО: ' + tgEsc(order.total) + '</b>');

  const url = 'https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: lines.join('\n'),
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) throw new Error('Telegram API error: ' + res.status);
}

// Экранирование спецсимволов HTML для parse_mode=HTML
function tgEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
