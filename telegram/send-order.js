/* ============================================================
   ОТПРАВКА ЗАКАЗА ЧЕРЕЗ YANDEX CLOUD FUNCTION
   Вызывается из index.html после оформления заказа.
   Настройки лежат в config.js (WORKER_URL).
   Токен Telegram НЕ хранится на сайте — он в переменных
   окружения функции. Защита от спама — на её стороне
   (проверка origin, honeypot-поле, скорость заполнения).
   ============================================================ */

// order = {
//   num, name, phone, type ('delivery'|'pickup'), address,
//   pay, comment, items:[...], subtotal, delivery, total,
//   hp: '' (honeypot — должен остаться пустым),
//   elapsed: секунд от открытия формы до отправки
// }
function escTg(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendOrderToTelegram(order) {
  // Формируем текст сообщения для Worker
  const lines = [
    '🛎 <b>Новый заказ ' + escTg(order.num) + '</b>',
    '',
    '<b>Клиент:</b> ' + escTg(order.name),
    '<b>Телефон:</b> ' + escTg(order.phone),
    '<b>Получение:</b> ' + (order.type === 'delivery' ? '🚗 Доставка' : '🏃 Самовывоз'),
  ];
  if (order.type === 'delivery') lines.push('<b>Адрес:</b> ' + escTg(order.address));
  lines.push('<b>Оплата:</b> ' + (order.pay === 'card' ? '💳 Картой' : '💵 Наличные'));
  if (order.comment) lines.push('<b>Комментарий:</b> ' + escTg(order.comment));
  lines.push('', '<b>Состав заказа:</b>');
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach(item => lines.push('• ' + escTg(item)));
  }
  lines.push('');
  lines.push('<b>Сумма:</b> ' + escTg(order.subtotal));
  lines.push('<b>Доставка:</b> ' + escTg(order.delivery));
  lines.push('<b>ИТОГО: ' + escTg(order.total) + '</b>');

  // Добавляем таймаут 10 секунд
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        text: lines.join('\n'),
        hp: String(order.hp || ''),
        elapsed: Number(order.elapsed) || 0
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
      const errText = await res.text().catch(() => 'no body');
      console.error('Worker error:', res.status, errText);
      throw new Error('Server error: ' + res.status);
    }
    return true;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('Timeout: Worker не ответил за 10 секунд');
      throw new Error('Сервер не отвечает. Попробуйте позже.');
    }
    console.error('Network error:', err);
    throw err;
  }
}
