# Visual parity: процесс проверки для DSH Rich UI

Дата проверки первичных источников: **2026-10-28**. Это практическая политика проекта, а не заявление о достигнутом сходстве. Рекомендации ниже не устанавливают новые зависимости, сервисы или CI автоматически.

## 1. Решение: две независимые проверки

**Reference parity** отвечает: «Насколько реализация соответствует наблюдаемому оригиналу при одинаковых условиях?» Источник здесь — shared ChatGPT pages, доступные состояния и сохранённые скриншоты, а не Figma и не рассказ AI о том, как устроен оригинал.

**Self-baseline regression** отвечает: «Изменилось ли наше ранее одобренное отображение?» Источник — принятый человеком снимок нашей реализации. Даже идеально зелёная регрессия может сохранять неверный дизайн.

Не смешивать эти проверки в одном статусе. Для каждой пары сценарий/состояние указывать отдельно:

- parity: `verified`, `deviation`, `unverified` или `not observable`;
- regression: `pass`, `changed`, `missing baseline` или `not run`;
- functional/accessibility: фактический результат и границы проверки.

Отсутствие доступного оригинала — `unverified`, а не успешная parity. Успешный screenshot-тест — не «pixel perfect». Не публиковать выдуманный процент сходства; `maxDiffPixelRatio` измеряет долю различающихся пикселей в конкретном сравнении, а не качество дизайна или процент реализованных возможностей.

## 2. Что уже есть и чего пока нет

Контракт принятия описан в [QUALITY.md](../docs/QUALITY.md), backlog — в [ROADMAP.md](../docs/ROADMAP.md). Текущая лаборатория работает отдельно от основного DSH; адрес `http://127.0.0.1:4173` не является доказательством интеграции в пользовательский Harness.

В [Playwright-конфигурации](../playwright.config.ts) уже есть desktop 1440 × 1000 и mobile на профиле iPhone 13 с Chromium, а в [браузерных сценариях](../tests/e2e/scenarios.spec.ts) — четыре demo, обе темы, проверки взаимодействий, overflow и screenshots `.lab-answer`. Mobile-профиль с Chromium — эмуляция, не проверка Safari/iOS.

В этих сценариях все TMDB-картинки заменяются одним SVG. Это полезная детерминизация для regression, но не evidence реальных постеров/галереи. Текущее `maxDiffPixelRatio: .01` — существующий технический допуск, **не** одобрение потери деталей и **не** «99% fidelity». Его следует обосновывать конкретными diffs; данный документ конфигурацию не меняет.

[Стили лаборатории](../src/demo/lab.css) задают стек с Inter, но имя в `font-family` не доказывает, что именно этот шрифт загружен. [Демонстрационные данные](../src/demo/fixtures.ts) и shell лаборатории не считаются утверждённой копией reference.

## 3. Источник без Figma: сначала собрать reference contract

Использовать ссылки из quality contract:

- [Shared conversation A](https://chatgpt.com/share/6ae18b9d-0c24-83eb-941a-3c477ae80fe7).
- [Shared conversation B](https://chatgpt.com/share/6ae19175-cc80-83ed-8f84-befd5376ec83).

Это входные reference URLs проекта, а не подтверждение, что их live-содержимое исследовано при подготовке этого документа. При работе открыть оригинал в функционирующем браузере. Shared page может не предоставлять исходный интерактивный UI, часть состояний или доступ к данным. Не реконструировать недоступное поведение как достоверное и не считать отказ загрузки доказательством отсутствия функции.

Для каждого observable блока завести краткую спецификацию: URL, время захвата, имя сценария и текста, видимый state, viewport, theme, crop, scroll, assets, доступные действия, ограничения наблюдения. Сохранять исходный неизменённый screenshot и отдельную вырезку response, не перерисованный AI «reference». Не подменять разные тексты или наборы карточек одинаковыми названиями сценариев.

Если DOM оригинала доступен, измерять его только read-only средствами разрешённого браузера. Не копировать приватные API, токены или весь authenticated page dump. Если DOM недоступен, хранить оценки размеров по изображению как **estimates**, а не `getBoundingClientRect` measurements. Нельзя выдавать предполагаемый CSS по скриншоту за исходные design tokens.

Материалы сравнения складывать вне checkout, например `~/.cache/dsh-scratch/dsh-rich-ui-parity/<run-id>/`: `reference/`, `actual/`, `diff/`, `geometry/`, `manifest.json`, `review.md`. Публичные shared URLs не гарантируют отсутствия персональных данных: минимизировать захват и не загружать его в сторонние сервисы без разрешения. Одобренные regression goldens могут жить рядом с тестами в Git; scratch-артефакты туда не включать.

## 4. Контракт воспроизводимости

Перед сравнением фиксировать в manifest фактические, а не подразумеваемые значения:

- commit/dirty state реализации, fixture/content version, capture timestamp и reference URL;
- OS/container image digest, Playwright package и browser revision, browser engine, headless/headed mode;
- viewport в CSS px, screenshot dimensions в физических px, `deviceScaleFactor`/DPR, screenshot `scale`, browser zoom, scrollbar behaviour;
- theme, `colorScheme`, locale, timezone, reduced motion, touch/mobile flags, scroll position;
- источник и контрольные суммы assets/fonts, фактически использованные font face/weight, готовность изображений и состояние данных;
- crop/clip, selectors или semantic anchors, screenshot options, thresholds и список замаскированных областей с причиной.

Reference и actual должны иметь одинаковые текст, постеры, crop/fit, иконки, веса и метрики шрифта, ширину контейнера и state. Если исходный asset недоступен или нельзя легально переиспользовать шрифт, отметить deviation и его влияние на перенос строк/геометрию. Не выдавать заменённый asset за совпадающий. Для отдельного детерминированного regression допустимы mock assets, но результат помечать как mocked и не применять его к reference parity.

Для повторяемых runs использовать один pinned browser/container и lockfile. На NixOS следовать контейнерному пути из [README](../README.md), предварительно сверив фактически установленную версию `@playwright/test` из lockfile с образом: диапазон в package manifest и пример команды в README сами по себе не pin. Не обновлять toolchain одновременно с визуальной коррекцией; миграция browser/font environment — отдельный review, не автоматическое принятие новых goldens.

Перед screenshot ждать выбранного UI-state, `document.fonts.ready`, успешного `decode()` нужных изображений и стабильной геометрии. Проверять failed loads, а не просто ждать таймер. `networkidle` или два одинаковых снимка не доказывают правильности контента: они могут стабилизировать fallback font или broken image. Отключать анимации/переходы и caret для статического сравнения; зафиксировать курсор, hover и focus. Для анимации проверять отдельный договорённый момент/конечное состояние и reduced motion, а не скрывать весь компонент.

Не масштабировать reference до «похожего» размера ради меньшего diff. Если условия reference неизвестны, сделать явно маркированное качественное сравнение и ограничить выводы. Разные browser engines или DPR требуют отдельных baselines, а не общего широкого допуска.

## 5. Матрица: content × environment × state

Минимальный regression smoke — все четыре demo (`technical`, `films`, `calculator`, `configurator`), desktop/mobile, light/dark. Reference parity заполнять только там, где есть matching observation; остальная матрица остаётся unverified. Начать с существующих размеров тестов; добавить узкую ширину 320 CSS px и промежуточный breakpoint как отдельные checks reflow, не заменяя matching reference viewport.

Проверять не только первый экран:

- technical: длинный заголовок, переносы inline code, списки, ссылки, отсутствие horizontal overflow;
- films: collection начало/конец, detail открыт, gallery image переключена, related item, close, focus restoration, длинные metadata;
- calculator: initial, edited, reset, invalid/out-of-range input, понятное восстановление и локальное обновление без model/network callback;
- configurator: изменённый текст, условный блок выключен/включён, все tabs, copy/notification и длинные значения;
- общие состояния: keyboard focus, hover там, где он есть, loading, empty, error, missing image, overflow, reduced motion и zoom/reflow.

Последняя группа — план покрытия, не заявление о наличии каждого state в текущем renderer. Если состояние не поддерживается или не наблюдается в reference, это явно записывается. Не добавлять feature только ради screenshot без отдельного scope. Изолированные component crops ускоряют диагностику, но не заменяют полный response и host-context: наследуемые стили, ширина, stacking, portal/dialog и focus могут отличаться в DSH. Проверка live host выполняется отдельно после разрешённой интеграции; не перезапускать основной сервис ради visual research.

## 6. Три слоя evidence вместо одного «оценщика»

### A. Измеренные DOM geometry и computed styles

В actual снимать JSON для устойчивых semantic anchors: response container, heading, paragraph, card, poster, metadata, control, dialog, gallery. Для каждого записывать `getBoundingClientRect()` (`x`, `y`, `width`, `height` в CSS px), положение относительно response, gap/padding/margin, border widths/radius, box shadow, overflow и размеры scroll/client.

Через `getComputedStyle()` записывать font family/size/weight/line-height/letter-spacing, text/background/border color, display/grid/flex rules, alignment, object-fit/position. Для текста проверять фактические переносы и высоту, а не только совпадающий `font-size`. Учитывать viewport-relative координаты `getBoundingClientRect()` и scroll; не сравнивать их напрямую с crop-local физическими пикселями без преобразования DPR/origin.

При наличии reference DOM собирать тот же набор. Иначе сравнивать actual measurement с аннотированными screenshot bounds, указав погрешность. Задавать допуски по измеряемой характеристике и цели: например, exact container width при одинаковом viewport, отдельно документированный subpixel tolerance для anchors. Не вводить универсальное «всё ±N px» без основания.

### B. Pixel/perceptual evidence

Сохранять reference, actual, side-by-side, полупрозрачный overlay и pixel diff одинаковых размеров. Playwright `toHaveScreenshot()` — базовый local regression инструмент; он стабилизирует последовательные снимки и использует pixelmatch. `threshold` задаёт допустимую воспринимаемую разницу цвета одного пикселя, а `maxDiffPixels`/`maxDiffPixelRatio` — допустимое количество/долю отличающихся пикселей. Это разные настройки, не semantic similarity.

Начинать со строгого сравнения, изучать источник шума, затем явно обосновывать узкий допуск. Не расширять его, пока тест не станет зелёным. Не маскировать текст, controls, layout или assets, которые и являются предметом parity. Для действительно volatile области указывать координаты/selector и объяснение; рядом сохранять немаскированный снимок.

Если добавлен local perceptual metric (например, SSIM), сохранять название, версию, preprocessing, region и сырые значения. Это вспомогательный сигнал: высокая similarity может скрыть неверную подпись, отсутствующий focus или недоступную кнопку; низкая может происходить от font rasterization. Никакой преобразованной «общей fidelity %».

### C. Human review + AI critic

Человек просматривает исходные side-by-side/overlay, затем проблемы по областям: иерархия, typography/line wraps, spacing, geometry, assets, borders/contrast, responsive behaviour, transitions и интерактивные состояния. Финальное принятие reference parity и goldens принадлежит человеку.

AI получает ограниченный evidence pack: обе картинки с именованной provenance, geometry/style JSON, сценарий/state, известные ограничения и diff. Его задача — критик: назвать область, наблюдаемую разницу, evidence, вероятную причину, severity и предложить проверяемую узкую правку. Просить разделять факт и гипотезу; не принимать «выглядит на 95%» или уверенность модели как измерение. Можно разделить implementer и critic по агентам, но второй AI не заменяет independent human approval. Если AI не видит исходные images или они несовместимы по условиям, вывод — insufficient evidence, не pass.

## 7. Accessibility — отдельный обязательный gate

После перехода в каждый важный state запускать axe в реальном браузере, предпочтительно через open-source `@axe-core/playwright`; зависимость уже добавлена в [package.json](../package.json), а browser scan основных сценариев включён в [E2E](../tests/e2e/scenarios.spec.ts). Проверку раскрытых состояний и обеих тем следует расширять отдельно. Сохранять rule IDs, targets, impact, violations и `incomplete`; последние требуют ручного решения. Проверки только в JSDOM не заменяют browser scan, в частности для color contrast.

Ручная проверка обязательна: Tab/Shift+Tab, видимый focus в обеих темах, focus trap и restoration, Escape, accessible names, порядок чтения, keyboard/touch parity, zoom/reflow и screen-reader smoke. Нулевые violations axe означают только «не найдено автоматически обнаруживаемых проблем в просканированном состоянии», не WCAG compliance. Не переносить опубликованный vendor coverage percentage на наш проект.

Если original имеет недоступный contrast или неясный control, не воспроизводить дефект вслепую: сохранить семантику и доступность, а отклонение по виду оформить как согласуемый accessibility compromise. Не отключать целое правило/поддерево ради зелёного gate; любое узкое исключение получает owner, обоснование и revisit date.

## 8. Severity и compromise ledger

Классификация — локальная политика, не автоматическая оценка pixel count:

- **S0 / blocking:** потеря данных/небезопасное действие, невозможность основного сценария, keyboard trap без выхода; исправить, не принимать как визуальный компромисс.
- **S1 / major:** отсутствующий ключевой state или control, неверное поведение, нечитаемый текст, значительный reflow/overflow, недоступный основной путь; блокирует acceptance затронутого сценария.
- **S2 / material:** заметные неверные typography, wraps, poster crop, card/panel geometry или spacing без блокировки основного пути; исправить либо получить явное человеческое принятие ограниченного deviation.
- **S3 / minor:** локальная косметика с низким влиянием, например подтверждённый rendering noise; допускается только с evidence и записью, не молча.

Ledger хранить вместе с review evidence; approved persistent decisions можно позже перенести в отдельный проектный документ только в разрешённом scope. Запись содержит: ID; scenario/viewport/theme/state; reference и actual artifacts; observation/measurement; severity; root-cause hypothesis; предложенный compromise; влияние на parity/accessibility/maintenance; owner; approver/date; статус (`open`, `accepted deviation`, `fixed`, `unverified`); revisit date/trigger.

Пример шаблона, не существующий одобренный compromise: `VP-___ | films/mobile/dark/detail | ref/actual links | source image unavailable | S2 | legal/source constraint | alternative asset, no asset-parity claim | owner ___ | approver pending | open | revisit when original asset available`.

Не снижать severity из-за исчерпания бюджета. Не превращать accepted deviation в незаметный «pass»; отчёт должен сохранять границу сходства. Несогласованный compromise остаётся open.

## 9. Ограниченный цикл реализации

1. Выбрать один сценарий или небольшой компонентный slice и конкретные states. Зафиксировать reference contract, environment и неизменяемый reference.
2. Выполнить initial capture, geometry/style measurements и функциональную проверку. Отделить mismatch дизайна от failed assets и environment drift.
3. Выдать список приоритетных расхождений с evidence. Взять максимум три самых важных за одну итерацию; не переписывать архитектуру ради косметики.
4. Сделать узкую правку, повторить matching captures и затронутые functional/a11y checks. Затем прогнать существующую desktop/mobile light/dark regression матрицу.
5. По умолчанию максимум **два corrective passes** на выбранный slice. Если расхождение не сходится, остановиться с evidence и ledger: нужна недостающая reference информация, human design decision или отдельный бюджет. Не запускать бесконечный self-improvement loop и не снижать пороги ради завершения.
6. Передать человеку side-by-side/overlay/diff, measurement summary, список residuals и точный scope. Принятие означает согласие с наблюдаемым состоянием и известными ограничениями, а не с невидимыми states.

Это локальный time-box policy, а не рекомендация перечисленных vendors. Платные tool calls/сервисы и отправка материалов наружу требуют предварительного одобрения пользователя. Если scope расширяется, сначала вернуть решение владельцу.

## 10. Golden approval и минимальный путь внедрения

Первый baseline — **candidate**, не approved truth. Обычный verification run не должен создавать/обновлять approved snapshots: при добавлении CI явно использовать `--update-snapshots=none` и проверять отсутствие неожиданных golden changes. Для новых goldens отделить capture от approval. Агент может подготовить candidate snapshots только в явно назначенном шаге; нельзя автоматически approve changed goldens, использовать blanket update как исправление failing tests или принимать baseline самим фактом успешного rerun.

Человек проверяет каждый изменённый golden и связанную причину/ledger. В review показывать old/new/diff, state/environment manifest и функциональный результат. Обновление baseline после одобрения — отдельное заметное изменение с идентифицируемым approver; оно не удаляет reference deviation. Функциональные/a11y failures не «исправляются» screenshot update.

Применимо сейчас без Figma и cloud:

1. Использовать существующие fixtures/lab и Playwright; собрать один проверяемый reference slice из shared page в сопоставимых условиях.
2. Дополнить evidence geometry/style JSON и ручным overlay-review; для текущих mocked screenshots сохранять только regression claim.
3. После отдельного implementation scope закрепить environment manifest, явный no-update verification mode, missing states и browser axe. Сначала локально, затем тем же pinned environment в CI.
4. Storybook добавлять только при реальной потребности в каталоге component states/reuse. Детерминированные fixtures уже дают начальную пользу stories; миграция всего проекта не prerequisite для parity.

**Storybook / Chromatic.** Storybook stories моделируют состояния компонентов; документация Visual Tests предлагает Chromatic и cloud capture с baseline review. Полезны explicit states и human review, но service не доказывает совпадение с внешним оригиналом. Сейчас не подключать Chromatic, account/token, upload или подписку. При будущем одобрении сохранить запрет auto-approval новых changed goldens; синхронизация уже одобренного человеком baseline не равна первичному одобрению AI.

**Figma Code Connect / MCP.** В современных primary docs MCP передаёт агентам design context, а Code Connect сопоставляет Figma components с существующим code для повторного использования. Это уменьшает угадывание, но не заменяет runtime measurements/review. Без Figma source у shared ChatGPT pages эти инструменты не извлекут настоящие design tokens и не докажут fidelity. Не создавать искусственный Figma из нашей реализации и не объявлять его независимым reference — это круговая проверка. Подключать позже только если появится авторитетный design source и будет одобрена стоимость/передача данных. Условия планов меняются: проверенные сейчас docs указывают Dev/Full seat и Professional/Organization/Enterprise для Code Connect, с ограничениями Professional; старое общее утверждение «только Enterprise/Organization» уже недостаточно точно.

## 11. Что должно быть в итоговом отчёте

Отчёт фиксирует проверенный scope (reference URL, сценарий, content, states, viewport/theme, environment), evidence links, раздельные результаты parity/regression/functionality/accessibility, remaining deviations с severity и фактическое human approval. Если baseline впервые создан, оригинал недоступен, assets подменены или host не проверялся — написать это явно. Указывать выполненные команды и реальные результаты, а не подразумевать запуск тестов из наличия документа.

Критерий окончания: выбранные states воспроизводимы; нет открытых S0/S1 в принимаемом scope; material deviations исправлены или явно приняты владельцем; candidate goldens прошли human review; функциональные и a11y gates проверены с указанными границами. До этого статус — partial/unverified, без invented fidelity score.

## 12. Первичные источники и границы выводов

Все следующие источники непосредственно прочитаны **2026-10-28**. Дата проверки — не дата публикации и не гарантия неизменности будущего API. Политики «два corrective passes», severity и запрет auto-approval — решения данного процесса, а не цитаты vendors.

- [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) — `toHaveScreenshot`, стабилизация, влияние OS/browser/fonts/environment, pixelmatch, thresholds, обновление и review snapshots.
- [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) — `@axe-core/playwright`, сканирование текущего state, limitations automation, точечные исключения и attachment результатов.
- [Storybook: Visual tests](https://storybook.js.org/docs/writing-tests/visual-testing) — stories как baseline tests, Chromatic cloud capture, ручное принятие изменений, отличие screenshot от markup snapshot. Текст прочитан; изображения интерфейса сервиса отдельно не исследовались, сервис не запускался.
- [Figma: Code Connect introduction](https://developers.figma.com/docs/code-connect/) — связь design components и настоящих code examples, усиление MCP context, текущие seats/plans и ограничения Professional.
- [Figma: MCP server introduction](https://developers.figma.com/docs/figma-mcp-server/) — design context, компоненты/variables, reuse через Code Connect; runtime verification остаётся отдельной задачей. Некоторые write features описаны как beta и потенциально usage-based paid; это не основание подключать их без одобрения.
- [Deque: axe-core README](https://raw.githubusercontent.com/dequelabs/axe-core/develop/README.md) — open-source engine, `incomplete` и необходимость manual review, ограничения JSDOM/contrast. Приведённая vendor aggregate coverage statistic не используется как метрика этого проекта.

Документ создан как исследование и процесс. Он не изменяет тесты, не устанавливает Storybook/axe/Figma/Chromatic, не обновляет snapshots, не утверждает parity и не выполняет commit/deploy.
