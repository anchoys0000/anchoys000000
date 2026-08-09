// Единственная точка входа для отправки заказов.
// Токен Telegram живёт в Cloudflare Worker (Secrets), а не здесь.
const WORKER_URL = 'https://cafe-orders.kirillburkalo71.workers.dev/';
