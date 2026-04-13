# МПТ — Система учёта практической подготовки студентов

Веб-приложение для ведения данных по практической подготовке студентов, назначению на базы практики, учёту руководителей и формированию отчётных файлов XLSX.

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript + Prisma ORM |
| **База данных** | SQLite (файл `backend/prisma/dev.db`, ничего устанавливать не нужно) |
| **Авторизация** | JWT + RBAC (Admin / Methodist / Observer) |
| **Выгрузка** | ExcelJS → XLSX |

---

## Быстрый старт

### 1. Требования

- [Node.js](https://nodejs.org/) ≥ 18 — и всё, PostgreSQL не нужен!

### 2. Установить зависимости

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Создать БД и заполнить тестовыми данными (один раз)

```bash
cd backend
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### 4. Запустить бэкенд (порт 4000)

```bash
cd backend
npm run dev
```

### 5. Запустить фронтенд (порт 5173) — в новом терминале

```bash
cd frontend
npm run dev
```

Открыть в браузере: **http://localhost:5173**

---

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@mpt.ru | admin123 |
| Методист | methodist@mpt.ru | methodist123 |

---

## Структура проекта

```
MPTpractic/
├── backend/                  # Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma     # Схема БД
│   │   └── seed.ts           # Тестовые данные
│   └── src/
│       ├── index.ts          # Точка входа
│       ├── middleware/auth.ts # JWT + RBAC
│       ├── routes/           # REST API маршруты
│       │   ├── auth.ts
│       │   ├── organizations.ts
│       │   ├── modules.ts
│       │   ├── practices.ts
│       │   ├── groups.ts
│       │   ├── students.ts
│       │   ├── techSupervisors.ts
│       │   ├── assignments.ts
│       │   ├── analytics.ts
│       │   └── reports.ts    # XLSX выгрузка
│       └── utils/prisma.ts
├── frontend/                 # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── api/              # HTTP клиент + все API-методы
│       ├── components/
│       │   ├── layout/       # Sidebar, AppLayout
│       │   └── ui/           # Modal, FormField, PageHeader...
│       ├── pages/            # Все экраны приложения
│       ├── store/auth.ts     # Zustand: авторизация
│       └── types/index.ts    # TypeScript типы
├── docker-compose.yml        # PostgreSQL + pgAdmin
└── README.md
```

---

## Основные экраны

| Маршрут | Экран |
|---------|-------|
| `/` | Дашборд (сводные показатели, нагрузка руководителей) |
| `/modules` | Справочник модулей |
| `/practices` | Справочник практик |
| `/organizations` | Справочник организаций |
| `/groups` | Справочник групп |
| `/students` | Реестр студентов + назначения |
| `/supervisors` | Руководители ПП от техникума |
| `/search` | Поиск студента (полная карточка) |
| `/reports` | Выгрузка в XLSX |

---

## API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Вход в систему |
| GET | `/api/auth/me` | Текущий пользователь |
| GET/POST | `/api/organizations` | Организации |
| GET/POST | `/api/modules` | Модули |
| GET/POST | `/api/practices` | Практики |
| GET/POST | `/api/groups` | Группы |
| GET/POST | `/api/students` | Студенты (поиск/фильтр) |
| GET/POST | `/api/tech-supervisors` | Руководители ПП |
| GET/POST | `/api/assignments` | Назначения студентов |
| GET | `/api/analytics/dashboard` | Статистика дашборда |
| GET | `/api/analytics/supervisor-load` | Нагрузка руководителей |
| GET | `/api/reports/export` | Скачать XLSX |

---

## Роли и права

| Действие | Admin | Methodist | Observer |
|---------|-------|-----------|----------|
| Просмотр | ✅ | ✅ | ✅ |
| Создание/редактирование | ✅ | ✅ | ❌ |
| Назначение студентов | ✅ | ✅ | ❌ |
| Удаление | ✅ | ❌ | ❌ |
| Архивирование модулей | ✅ | ❌ | ❌ |
| Выгрузка XLSX | ✅ | ✅ | ❌ |

---

## pgAdmin

URL: http://localhost:5050  
Email: admin@mpt.ru  
Пароль: admin  
Сервер: `postgres` / порт `5432` / БД `mptpractic`
