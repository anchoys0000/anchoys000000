/* ============================================================
   ОТПРАВКА ЗАКАЗА НА CLOUDFLARE WORKER
   Токен Telegram хранится на сервере (Worker), а не на сайте.
   Настройка: WORKER_URL в config.js
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

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });
  if (!res.ok) throw new Error('Worker error: ' + res.status);
}

// Экранирование спецсимволов HTML для parse_mode=HTML на стороне Worker
function tgEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
