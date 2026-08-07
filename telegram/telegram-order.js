/* ============================================================
   ОТПРАВКА ЗАКАЗА В TELEGRAM
   Этот файл подключается после config.js и основного script
   ============================================================ */

// Отправка одного сообщения через Telegram Bot API
async function tgSend(text){
  const url='https://api.telegram.org/bot'+TG_BOT_TOKEN+'/sendMessage';
  const res=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      chat_id:TG_CHAT_ID,
      text:text,
      parse_mode:'HTML',
      disable_web_page_preview:true
    })
  });
  if(!res.ok) throw new Error('Telegram API: '+res.status);
  return res.json();
}

// Читаем текущие значения из формы оформления заказа
function coVal(sel){
  const el=checkoutBody.querySelector(sel);
  return el?el.value.trim():'';
}

// Формируем и отправляем заказ. Возвращает Promise<true|false>
async function tgSendOrder(orderNum){
  const{sum,delivery,total}=cartTotals();
  const type=coVal('input[name="coType"]:checked')==='delivery'?'Доставка':'Самовывоз';
  const pay=coVal('input[name="coPay"]:checked')==='cash'?'Наличные':'Картой';

  const lines=['<b>🛎 НОВЫЙ ЗАКАЗ № '+orderNum+'</b>',''];
  lines.push('👤 <b>Имя:</b> '+escTg(coVal('#coName')));
  lines.push('📞 <b>Телефон:</b> '+escTg(coVal('#coPhone')));
  lines.push('🚗 <b>Получение:</b> '+type);
  if(type==='Доставка') lines.push('📍 <b>Адрес:</b> '+escTg(coVal('#coAddress')));
  const tm=coVal('#coTime');       if(tm) lines.push('🕐 <b>Когда:</b> '+escTg(tm));
  lines.push('💳 <b>Оплата:</b> '+pay);
  const cmt=coVal('#coComment');   if(cmt) lines.push('💬 <b>Комментарий:</b> '+escTg(cmt));
  lines.push('');
  lines.push('<b>Состав заказа:</b>');
  cart.forEach((n,id)=>{
    const p=byId(id);
    lines.push('• '+p.name+' × '+n+' — '+fmt(p.price*n));
  });
  lines.push('');
  lines.push('Сумма: '+fmt(sum));
  lines.push('Доставка: '+(delivery===0?'Бесплатно':fmt(delivery)));
  lines.push('<b>Итого: '+fmt(total)+'</b>');

  try{ await tgSend(lines.join('\n')); return true; }
  catch(e){ console.error('Заказ не отправлен в Telegram:',e); return false; }
}

// Экранируем &<> чтобы текст клиента не ломал HTML-разметку сообщения
function escTg(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
