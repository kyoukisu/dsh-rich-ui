import type { RichSpec, Expr, RichNode } from "../core/schema";
const state = (key: string): Expr => ({ state: key });
const op = (op: string, ...args: Expr[]): Expr => ({ op, args }) as Expr;
export const technical: RichSpec = {
  version: 1,
  title: "Почему задача зависает",
  nodes: [
    {
      type: "text",
      content:
        "Контекст отменён, но worker всё ещё пытается отправить результат. Получатель уже завершил работу.",
    },
    {
      type: "card",
      title: "Что происходит в задаче",
      children: [
        {
          type: "row",
          children: [
            { type: "icon", name: "clock", tone: "muted" },
            {
              type: "text",
              content: "0 мс — worker получает `7` и начинает `Sleep(100ms)`",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "error", tone: "danger" },
            {
              type: "text",
              content: "~10 мс — контекст отменяется, consumer выходит",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "clock", tone: "muted" },
            {
              type: "text",
              content: "~100 мс — worker просыпается и отправляет `14`",
            },
          ],
        },
        { type: "divider" },
        {
          type: "row",
          children: [
            { type: "icon", name: "lock", tone: "warning" },
            {
              type: "text",
              content: "**Worker:** заблокирован на `results <- value`",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "lock", tone: "warning" },
            { type: "text", content: "**Coordinator:** ждёт `wg.Wait()`" },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "x", tone: "danger" },
            {
              type: "text",
              content: "`close(results)` никогда не выполняется",
            },
          ],
        },
      ],
    },
    {
      type: "text",
      variant: "subtitle",
      content: "Отправка тоже должна учитывать отмену",
    },
    {
      type: "diagram",
      direction: "horizontal",
      caption: "Порядок событий в задаче: отмена приходит раньше отправки.",
      steps: [
        {
          id: "worker",
          label: "Worker",
          detail: "Sleep(100ms)",
          connector: "0 мс",
        },
        {
          id: "cancel",
          label: "Контекст отменён",
          detail: "consumer выходит",
          tone: "warning",
          connector: "10 мс",
        },
        {
          id: "send",
          label: "Отправка 14",
          detail: "блокируется навсегда",
          tone: "danger",
          connector: "100 мс",
        },
        {
          id: "wait",
          label: "Coordinator",
          detail: "ждёт wg.Wait()",
          tone: "warning",
        },
      ],
    },
    {
      type: "code",
      language: "go",
      title: "Отправка с учётом отмены",
      lineNumbers: true,
      code: "select {\ncase results <- value:\ncase <-ctx.Done():\n    return\n}",
    },
  ],
};
export const films: RichSpec = {
  version: 1,
  title: "Когда хочется хорошей научной фантастики",
  entities: [
    {
      id: "interstellar",
      kind: "Фильм",
      title: "Interstellar",
      subtitle: "2014 · Научная фантастика · 169 мин",
      description:
        "Экспедиция за пределы Солнечной системы, время и связь между близкими. Для вечера, когда хочется большого путешествия и сильной эмоции.",
      image: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      images: [
        "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      ],
      facts: [
        { label: "Режиссёр", value: "Кристофер Нолан" },
        { label: "Год", value: 2014 },
        { label: "Длительность", value: "169 минут" },
      ],
      sources: [
        {
          title: "Карточка фильма · TMDB",
          url: "https://www.themoviedb.org/movie/157336-interstellar",
        },
      ],
      related: ["arrival"],
    },
    {
      id: "arrival",
      kind: "Фильм",
      title: "Arrival",
      subtitle: "2016 · Научная фантастика · 116 мин",
      description:
        "Лингвист пытается понять язык прибывших на Землю существ. Тихая, собранная история о восприятии и выборе.",
      image: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
      facts: [
        { label: "Режиссёр", value: "Дени Вильнёв" },
        { label: "Год", value: 2016 },
      ],
      sources: [
        {
          title: "Карточка фильма · TMDB",
          url: "https://www.themoviedb.org/movie/329865-arrival",
        },
      ],
      related: ["interstellar"],
    },
    {
      id: "martian",
      kind: "Фильм",
      title: "The Martian",
      subtitle: "2015 · Приключения · 144 мин",
      description:
        "Один человек на Марсе, инженерная смекалка и много упрямства. Более светлая история о том, как решать невозможные задачи.",
      image: "https://image.tmdb.org/t/p/w500/3ndAx3weG6KDkJIRMCi5vXX6Dyb.jpg",
      sources: [
        {
          title: "Карточка фильма · TMDB",
          url: "https://www.themoviedb.org/movie/286217-the-martian",
        },
      ],
    },
    {
      id: "dune",
      kind: "Фильм",
      title: "Dune: Part Two",
      subtitle: "2024 · Научная фантастика · 167 мин",
      description:
        "Пустыня, власть и цена предначертанного пути. Масштабная история с выразительным визуальным миром.",
      image: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
      sources: [
        {
          title: "Карточка фильма · TMDB",
          url: "https://www.themoviedb.org/movie/693134-dune-part-two",
        },
      ],
    },
  ],
  nodes: [
    {
      type: "text",
      content:
        "Четыре разных настроения: большое путешествие, контакт с неизвестным, инженерное выживание и космическая эпопея. Открой карточку — подробности останутся рядом с подборкой.",
    },
    {
      type: "entity-list",
      entityIds: ["interstellar", "arrival"],
    },
    {
      type: "carousel",
      children: ["interstellar", "arrival", "martian", "dune"].map(
        (entityId) => ({ type: "entity-ref", entityId }),
      ),
    },
    {
      type: "callout",
      content:
        "Демонстрационная подборка. Метаданные и постеры приведены для проверки интерфейса; доступность в стримингах не проверялась.",
      tone: "info",
    },
  ],
};
export const calculator: RichSpec = {
  version: 1,
  title: "Как меняется капитал со временем",
  initialState: { principal: 50000, rate: 12, years: 3 },
  nodes: [
    {
      type: "text",
      content:
        "Поменяй параметры. Результат пересчитывается локально — без запроса к модели.",
    },
    {
      type: "card",
      title: "Калькулятор роста капитала",
      children: [
        {
          type: "slider",
          stateKey: "principal",
          label: "Начальная сумма, ₽",
          min: 10000,
          max: 200000,
          step: 5000,
        },
        {
          type: "slider",
          stateKey: "rate",
          label: "Годовая доходность, %",
          min: 0,
          max: 25,
          step: 1,
        },
        {
          type: "slider",
          stateKey: "years",
          label: "Срок, лет",
          min: 1,
          max: 10,
          step: 1,
        },
        { type: "divider" },
        {
          type: "computed",
          label: "Итог при ежегодной капитализации, ₽",
          expr: op(
            "round",
            op(
              "mul",
              state("principal"),
              op(
                "pow",
                op("add", 1, op("div", state("rate"), 100)),
                state("years"),
              ),
            ),
          ),
        },
        {
          type: "callout",
          tone: "info",
          content:
            "Математическая модель, не прогноз доходности. Налоги, комиссии и инфляция не учтены.",
        },
        {
          type: "button",
          label: "Сбросить параметры",
          variant: "ghost",
          action: { type: "reset" },
        },
      ],
    },
  ],
};
const mini: RichNode[] = [
  {
    type: "grid",
    columns: 2,
    children: [
      { type: "computed", label: "Задач", expr: 24 },
      { type: "computed", label: "Готово", expr: 18 },
    ],
  },
];
export const configurator: RichSpec = {
  version: 1,
  title: "Интерфейс, который реагирует на тебя",
  initialState: {
    project: "My Dashboard",
    analytics: true,
    notifications: false,
    layout: "cards",
  },
  nodes: [
    {
      type: "card",
      title: "Конфигуратор интерфейса",
      children: [
        {
          type: "input",
          stateKey: "project",
          label: "Название проекта",
          placeholder: "Мой проект",
        },
        { type: "switch", stateKey: "analytics", label: "Включить аналитику" },
        {
          type: "switch",
          stateKey: "notifications",
          label: "Показывать уведомления",
        },
        { type: "divider" },
        {
          type: "text",
          variant: "caption",
          content: "Предварительный результат",
        },
        { type: "text", variant: "title", content: state("project") },
        {
          type: "tabs",
          stateKey: "layout",
          tabs: [
            { id: "cards", label: "Карточки", children: mini },
            {
              id: "table",
              label: "Таблица",
              children: [
                {
                  type: "table",
                  columns: [
                    { key: "task", label: "Задача" },
                    { key: "status", label: "Статус" },
                  ],
                  rows: [
                    { task: "Дизайн", status: "Готово" },
                    { task: "Разработка", status: "В работе" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "conditional",
          when: state("analytics"),
          children: [
            {
              type: "chart",
              kind: "line",
              data: [
                { label: "Янв", value: 42 },
                { label: "Фев", value: 55 },
                { label: "Мар", value: 49 },
                { label: "Апр", value: 73 },
                { label: "Май", value: 65 },
                { label: "Июн", value: 91 },
              ],
            },
          ],
        },
        {
          type: "conditional",
          when: state("notifications"),
          children: [
            {
              type: "callout",
              tone: "success",
              content: "Уведомления включены в предварительном просмотре.",
            },
          ],
        },
        {
          type: "button",
          label: "Скопировать название",
          action: { type: "copy", text: state("project") },
        },
      ],
    },
  ],
};

export const listing: RichSpec = {
  version: 1,
  title: "Электрические чайники",
  nodes: [
    {
      type: "text",
      content:
        "Подборка из 3 электрических чайников — от простого стеклянного до моделей с сенсорным управлением.",
    },
    {
      type: "meta",
      items: [
        { icon: "package", text: "3 модели" },
        { icon: "wallet", text: "От 1 382 ₽" },
        { icon: "truck", text: "Доставка 7–18 ноября" },
      ],
    },
    { type: "entity-list", entityIds: ["wk1760", "wk1500", "tuvio"] },
    {
      type: "callout",
      tone: "info",
      title: "Демонстрация",
      content:
        "Цены условные. Фотографии — Wikimedia Commons, свободная лицензия; это не снимки конкретных лотов.",
    },
  ],
  entities: [
    {
      id: "wk1760",
      kind: "Чайник",
      title: "Bosch TWK 3A011",
      subtitle: "1 382 ₽ · 1,7 л · стекло",
      description: "LED-подсветка, 1850–2200 Вт",
      badge: { label: "Самый доступный", tone: "success" },
      image:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/2023_Czajnik_elektryczny_Bosch_%281%29.jpg/500px-2023_Czajnik_elektryczny_Bosch_%281%29.jpg",
      facts: [{ label: "Объём", value: "1,7 л" }],
      sources: [
        {
          title: "Фото · Wikimedia Commons",
          url: "https://commons.wikimedia.org/wiki/File:2023_Czajnik_elektryczny_Bosch_%281%29.jpg",
        },
      ],
    },
    {
      id: "wk1500",
      kind: "Чайник",
      title: "N'OVEEN Kettle 1.7",
      subtitle: "2 459 ₽ · 1,5 л · сенсор",
      description: "Дисплей и регулировка нагрева",
      image:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/2023_Czajnik_elektryczny_N%27OVEEN.jpg/500px-2023_Czajnik_elektryczny_N%27OVEEN.jpg",
      facts: [{ label: "Объём", value: "1,5 л" }],
      sources: [{ title: "Ozon", url: "https://www.ozon.ru/" }],
    },
    {
      id: "tuvio",
      kind: "Чайник",
      title: "Чайник электрический, 1,7 л",
      subtitle: "4 336 ₽ · 1,7 л",
      description: "Поддержка Алисы",
      badge: { label: "Умный дом", tone: "info" },
      image:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Electric_kettle_-_%D0%AD%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D1%87%D0%B0%D0%B9%D0%BD%D0%B8%D0%BA.JPG/500px-Electric_kettle_-_%D0%AD%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D1%87%D0%B0%D0%B9%D0%BD%D0%B8%D0%BA.JPG",
      facts: [{ label: "Объём", value: "1,7 л" }],
      sources: [{ title: "Ozon", url: "https://www.ozon.ru/" }],
    },
  ],
};

export const dashboard: RichSpec = {
  version: 1,
  title: "Состояние запуска",
  nodes: [
    {
      type: "text",
      content:
        "Три метрики, динамика выручки и план работ. Часть данных меняется локально: переключатели и таблица не вызывают модель.",
    },
    {
      type: "grid",
      columns: 3,
      children: [
        {
          type: "stat",
          label: "Доступность",
          value: "98,7%",
          delta: 0.4,
          deltaLabel: "к прошлой неделе",
          icon: "shield-check",
        },
        {
          type: "stat",
          label: "Активные пользователи",
          value: 12480,
          delta: 12.5,
          deltaLabel: "за месяц",
          icon: "users",
        },
        {
          type: "stat",
          label: "Инциденты",
          value: 4,
          delta: -18.2,
          deltaLabel: "меньше, чем в сентябре",
          tone: "success",
          icon: "alert-triangle",
        },
      ],
    },
    {
      type: "chart",
      kind: "line",
      unit: "тыс. ₽",
      categories: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"],
      series: [
        { label: "Выручка", values: [62, 74, 68, 91, 86, 104] },
        { label: "Расходы", values: [41, 44, 47, 52, 50, 58] },
      ],
      caption: "Демонстрационные данные, не отчётность.",
    },
    {
      type: "card",
      title: "План запуска",
      children: [
        {
          type: "table",
          sortable: true,
          caption: "Нажми на заголовок, чтобы отсортировать.",
          columns: [
            { key: "task", label: "Задача" },
            { key: "owner", label: "Ответственный" },
            { key: "status", label: "Статус" },
            { key: "progress", label: "Прогресс", align: "right" },
          ],
          rows: [
            {
              task: "Дизайн",
              owner: "Аня",
              status: "Готово",
              progress: 100,
            },
            {
              task: "Разработка",
              owner: "Марк",
              status: "В работе",
              progress: 65,
            },
            {
              task: "Тестирование",
              owner: "Ира",
              status: "Ожидание",
              progress: 0,
            },
            {
              task: "Документация",
              owner: "Лев",
              status: "В работе",
              progress: 40,
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "status", label: "Сборка зелёная", tone: "success" },
            { type: "status", label: "Идёт ревью", tone: "warning" },
            { type: "status", label: "Без блокеров", tone: "muted" },
          ],
        },
      ],
    },
    {
      type: "diagram",
      direction: "vertical",
      caption: "Путь запроса до готового ответа.",
      steps: [
        {
          id: "ask",
          label: "Запрос",
          detail: "«Собери дашборд»",
        },
        {
          id: "model",
          label: "Модель",
          detail: "выбирает структуру и данные",
          connector: "описание интерфейса",
        },
        {
          id: "render",
          label: "Рендерер",
          detail: "проверяет контракт и рисует компоненты",
          connector: "RichSpec",
        },
        {
          id: "user",
          label: "Читатель",
          detail: "меняет значения, не отправляя запрос",
          tone: "success",
        },
      ],
    },
    {
      type: "callout",
      tone: "info",
      title: "Границы",
      content:
        "Это не произвольный HTML и не мини-приложение. Компоненты, состояние и вычисления ограничены схемой.",
    },
  ],
};

export const demos = {
  dashboard,
  technical,
  films,
  listing,
  calculator,
  configurator,
};
export type DemoName = keyof typeof demos;
