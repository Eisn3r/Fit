# FitPulse — Telegram Mini App (Фитнес-планер в стиле FitnessOnline)

Полноценный модульный проект фитнес-приложения для Telegram (**Telegram Mini App + Бот на `aiogram 3.x` + Backend на `FastAPI` + база данных `SQLite`**).

---

## 📁 Архитектура проекта (разбивка по модулям)

```text
fitpulse_tma_project/
├── main.py                      # Единая точка входа (запускает FastAPI сервер и Telegram-бота)
├── requirements.txt             # Зависимости Python
├── .env.example                 # Шаблон переменных окружения (BOT_TOKEN, WEBAPP_URL)
├── bot/                         # Модуль Telegram-бота (aiogram 3.x)
│   ├── __init__.py
│   ├── config.py                # Чтение настроек из .env
│   ├── handlers/
│   │   └── start.py             # Команды /start, /app, статистика и прием данных из Mini App
│   └── keyboards/
│       └── webapp_kb.py         # Inline и Reply кнопки с WebAppInfo для открытия приложения
├── backend/                     # Серверная часть и хранение прогресса
│   ├── __init__.py
│   ├── database.py              # Асинхронная работа с SQLite (aiosqlite): сохранение весов и сетов
│   └── routes/
│       └── api.py               # REST API (/api/state) для синхронизации прогресса пользователя
└── webapp/                      # Фронтенд Telegram Mini App (разбит на чистые подфайлы)
    ├── index.html               # Разметка интерфейса + подключение telegram-web-app.js
    ├── css/
    │   └── styles.css           # Пользовательские стили и анимации
    └── js/
        ├── data.js              # База упражнений (Free Exercise DB), сплиты по дням, 8 недель, растяжка
        ├── telegram.js          # Интеграция с Telegram WebApp SDK и автосохранение на сервер
        └── app.js               # Логика рендеринга, замены тренажеров, таймера отдыха и аналитики
```

---

## 🚀 Пошаговая инструкция по запуску в Telegram

### Шаг 1. Создайте бота и получите токен
1. Откройте в Telegram бота **[@BotFather](https://t.me/BotFather)**.
2. Отправьте команду `/newbot`, укажите имя (например, `FitPulse Coach`) и юзернейм (например, `fitpulse_coach_bot`).
3. Скопируйте выданный **HTTP API Token**.

### Шаг 2. Установите зависимости
Распакуйте архив `fitpulse_tma_project.zip` на вашем компьютере или VPS-сервере и выполните в терминале:

```bash
python3 -m venv venv
source venv/bin/activate        # На Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Шаг 3. Получите HTTPS-ссылку (обязательное требование Telegram)
Telegram открывает Mini Apps только по протоколу `https://`.
- **Для быстрого теста на своем компьютере (за 30 секунд):**
  Установите бесплатную утилиту `ngrok` или `cloudflared` и пробросьте порт `8000`:
  ```bash
  ngrok http 8000
  ```
  Скопируйте полученный адрес вида `https://a1b2-c3d4.ngrok-free.app`.
- **Для постоянной работы на сервере (VPS):**
  Привяжите домен через Nginx + бесплатный SSL-сертификат Let's Encrypt или задеплойте на Railway / Render.

### Шаг 4. Настройте файл `.env`
Скопируйте `.env.example` в `.env` и подставьте ваш токен и HTTPS-ссылку:

```bash
cp .env.example .env
```

Содержимое `.env`:
```env
BOT_TOKEN=ваш_токен_от_BotFather
WEBAPP_URL=https://ваш-домен-или-ngrok.app
APP_HOST=0.0.0.0
APP_PORT=8000
DB_PATH=./fitpulse.db
```

### Шаг 5. Запустите проект!
```bash
python3 main.py
```
При старте `main.py` автоматически:
1. Создаст базу данных `fitpulse.db`.
2. Поднимет веб-сервер с Mini App и API на порту `8000`.
3. Установит синюю кнопку **«🏋️ План тренировок»** прямо в меню чата вашего бота (`MenuButtonWebApp`).
4. Запустит поллинг команд `/start` и `/app`.
