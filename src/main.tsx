import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Moon,
  Sun,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  FlaskConical,
  RotateCcw,
} from "lucide-react";
import { RichResponse } from "./ui/RichResponse";
import { demos, type DemoName } from "./demo/fixtures";
import "./demo/lab.css";
import { PrimitiveDemo } from "./demo/PrimitiveDemo";
type LabDemo = DemoName | "primitives";
const labels: Record<LabDemo, string> = {
  technical: "Технический разбор",
  films: "Подборка фильмов",
  calculator: "Локальные вычисления",
  configurator: "Реактивная форма",
  primitives: "Подсказки и галерея",
};
function App() {
  const initial = new URLSearchParams(location.search);
  const [demo, setDemo] = useState<LabDemo>(
    (initial.get("demo") as LabDemo) in labels
      ? (initial.get("demo") as LabDemo)
      : "films",
  );
  const [theme, setTheme] = useState(initial.get("theme") ?? "light");
  const [sidebar, setSidebar] = useState(true);
  const [revision, setRevision] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  return (
    <div className="lab" data-theme={theme}>
      <aside className={`lab-sidebar ${sidebar ? "" : "is-hidden"}`}>
        <a className="lab-brand" href="/">
          Rich UI <span>LAB</span>
        </a>
        <p className="lab-section-label">СЦЕНАРИИ</p>
        <nav>
          {(Object.keys(labels) as LabDemo[]).map((k) => (
            <button
              key={k}
              aria-current={demo === k ? "page" : undefined}
              onClick={() => {
                setDemo(k);
                history.replaceState(null, "", `?demo=${k}&theme=${theme}`);
              }}
            >
              <MessageSquare size={15} />
              {labels[k]}
            </button>
          ))}
        </nav>
        <div className="lab-sidebar-bottom">
          <FlaskConical size={16} />
          <span>
            Изолированная лаборатория
            <br />
            <small>Основной Harness не изменён</small>
          </span>
        </div>
      </aside>
      <div className="lab-workspace">
        <header className="lab-header">
          <button
            aria-label="Переключить меню"
            onClick={() => setSidebar(!sidebar)}
          >
            {sidebar ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
          </button>
          <span>
            Rich responses{" "}
            <span className="lab-version">0.1 · development</span>
          </span>
          <div className="lab-header-actions">
            <button
              aria-label="Сбросить демонстрацию"
              onClick={() => setRevision((x) => x + 1)}
            >
              <RotateCcw size={16} />
            </button>
            <button
              aria-label="Переключить тему"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a
              href="https://github.com/kyoukisu/dsh-rich-ui"
              target="_blank"
              rel="noopener noreferrer"
            >
              Репозиторий <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main>
          <div className="lab-context">
            <span className="lab-dot" />
            Реальный рендерер · локальная интерактивность
          </div>
          <div className="lab-user">
            {demo === "films"
              ? "Подбери научную фантастику на вечер. Хочу видеть постеры и открывать подробности прямо здесь."
              : demo === "technical"
                ? "Почему после отмены контекста программа всё равно зависает?"
                : demo === "calculator"
                  ? "Покажи, как изменяется капитал при разных сумме, ставке и сроке."
                  : "Собери небольшой конфигуратор с живым предпросмотром."}
          </div>
          <article className="lab-answer">
            {demo === "primitives" ? (
              <PrimitiveDemo key={revision} />
            ) : (
              <RichResponse
                key={`${demo}-${revision}`}
                spec={demos[demo]}
                onAction={(action, payload) =>
                  setEvents((e) => [...e, JSON.stringify({ action, payload })])
                }
              />
            )}
          </article>
          {events.length > 0 && (
            <details className="lab-events">
              <summary>События интеграции</summary>
              <pre>{events.join("\n")}</pre>
            </details>
          )}
          <footer className="lab-footer">
            Это рабочий стенд плагина, не скриншот и не сгенерированная
            картинка.
            <br />
            Данные демонстрационные. Изменения кода обновляются через Vite HMR.
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
