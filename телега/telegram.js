async function sendOrderToTelegram(order){
  const WORKER_URL = 'https://cafe-orders.kirillburkalo71.workers.dev';
  const SECRET = 'crvt-7f3a9-qz421';
  const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const lines=[
    '🛎 <b>НОВЫЙ ЗАКАЗ № '+E(order.num)+'</b>','',
    '👤 <b>Имя:</b> '+E(order.name),
    '📞 <b>Телефон:</b> '+E(order.phone),
    order.type==='delivery' ? '🚗 <b>Доставка:</b> '+E(order.address) : '🏃 <b>Самовывоз</b>',
    '💰 <b>Оплата:</b> '+(order.pay==='cash'?'Наличные':'Картой'),
  ];
  if(order.comment)lines.push('💬 <b>Комментарий:</b> '+E(order.comment));
  lines.push('','<b>Состав заказа:</b>');
  order.items.forEach(it=>lines.push('• '+E(it)));
  lines.push('','<b>Блюда:</b> '+E(order.subtotal),'<b>Доставка:</b> '+E(order.delivery),'<b>ИТОГО: '+E(order.total)+'</b>');
  try{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),15000);
    const res = await fetch(WORKER_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key:SECRET, text:lines.join('\n')}),
      signal:ctrl.signal
    });
    clearTimeout(timer);
    return res.ok;
  }catch(e){return false}
}
