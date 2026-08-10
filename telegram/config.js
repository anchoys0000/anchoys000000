// Адрес обработчика заказов в Yandex Cloud Functions.
// Функция работает на серверах в РФ — открывается без VPN,
// а до api.telegram.org достукивается со своей стороны сама.
// ВАЖНО: после создания функции вставь её URL сюда (см. telegram/README.txt).
const WORKER_URL = 'https://functions.yandexcloud.net/d4eucc08lavaic714un4';
