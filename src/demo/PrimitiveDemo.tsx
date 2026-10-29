import React from "react";
import { ImageLightbox, Popover, Tooltip } from "../ui/primitives";

const image = (background: string, title: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="${background}"/><circle cx="400" cy="220" r="110" fill="#ffffff" opacity=".25"/><text x="400" y="410" text-anchor="middle" font-family="sans-serif" font-size="36" fill="white">${title}</text></svg>`)}`;
const images = [
  image("#27495c", "Первый кадр"),
  image("#634f73", "Второй кадр"),
  image("#46614d", "Третий кадр"),
];

/** Deterministic browser QA fixture: no external media requests or model actions. */
export function PrimitiveDemo() {
  return (
    <section
      className="rich-ui ru-primitive-demo"
      aria-label="Интерактивные примитивы"
    >
      <h2>Локальные интерактивные элементы</h2>
      <p>
        Открывайте элементы мышью или клавиатурой. Escape закрывает активную
        поверхность.
      </p>
      <div className="ru-primitive-demo-controls">
        <Popover label="Открыть настройки">
          <label>
            Название заметки{" "}
            <input aria-label="Название заметки" defaultValue="Наблюдения" />
          </label>
          <button type="button">Сохранить локально</button>
        </Popover>
        <Tooltip text="Подсказка доступна при наведении и фокусе">
          <button type="button">Справка о примитивах</button>
        </Tooltip>
        <ImageLightbox
          src={images}
          alt="Учебная галерея"
          label="Открыть учебную галерею"
        />
        <button type="button">Внешняя кнопка</button>
      </div>
    </section>
  );
}
