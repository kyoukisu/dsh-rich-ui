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
            { type: "icon", name: "clock" },
            {
              type: "text",
              content: "0 мс — worker получает `7` и начинает `Sleep(100ms)`",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "error" },
            {
              type: "text",
              content: "~10 мс — контекст отменяется, consumer выходит",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "clock" },
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
            { type: "icon", name: "lock" },
            {
              type: "text",
              content: "**Worker:** заблокирован на `results <- value`",
            },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "lock" },
            { type: "text", content: "**Coordinator:** ждёт `wg.Wait()`" },
          ],
        },
        {
          type: "row",
          children: [
            { type: "icon", name: "x" },
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
      type: "code",
      language: "go",
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
export const demos = { technical, films, calculator, configurator };
export type DemoName = keyof typeof demos;
