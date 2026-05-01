# Refactoring Plan — ui_new

Основан на анализе всех исходников в `ui_new/src/`. Шаги упорядочены по приоритету: сначала убираем дублирование, затем декомпозиция, затем архитектура.

---

## Шаг 1 — Вынести повторяющуюся логику плотности в хук `useDensity()`

**Проблема:** Код вычисления `gap`, `padding` и `height` из `tweaks.density` повторяется дословно в 6+ файлах: `DashboardScreen`, `CTODashboard`, `VPDashboard`, `TLDashboard`, `DevOpsDashboard`, `Topbar`.

**Решение:** Создать `hooks/useDensity.js`:
```js
export const useDensity = () => {
  const { tweaks } = useTweaks();
  return {
    gap: { compact: 12, comfortable: 16, spacious: 24 }[tweaks.density] ?? 16,
    padding: { compact: '16px 20px', comfortable: '24px 28px', spacious: '32px 36px' }[tweaks.density],
    density: tweaks.density,
  };
};
```

**Зачем:** Устраняет 6 копий одинакового объекта; при добавлении нового уровня плотности правка в одном месте.

---

## Шаг 2 — Создать компонент `DashboardGrid` для повторяющейся сетки

**Проблема:** `display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14` встречается в каждом dashboard-компоненте.

**Решение:** `components/layout/DashboardGrid.jsx`:
```jsx
export const DashboardGrid = ({ children }) => {
  const { gap } = useDensity();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap, padding: `${gap}px ${gap + 4}px`, overflow: 'auto', flex: 1 }}>
      {children}
    </div>
  );
};
```

**Зачем:** Все 5 role-дашбордов используют идентичную обёртку; изменение колонок или отступов сейчас требует правок в 5 файлах.

---

## Шаг 3 — Объединить `useDeployFrequency`, `useLeadTime`, `useChangeFailureRate`, `useMTTR` в один дженерик-хук

**Проблема:** Все 4 хука в `useMetricsData.js` — дословные копии одного паттерна `useState + useEffect + fetch`.

**Решение:**
```js
const useApiData = (fetchFn, ...args) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchFn(...args).then(v => { setData(v); setLoading(false); });
  }, args);
  return { data, loading };
};

export const useDeployFrequency = (range, team, repo) =>
  useApiData(fetchDeployFrequency, range, team, repo);
// и т.д.
```

**Зачем:** Убирает 30 строк дублирования; добавление `error`-состояния или кеширования — один раз.

---

## Шаг 4 — Исправить `DraggableTweaksPanel`: убрать дублирование стейта tweaks

**Проблема:** `DraggableTweaksPanel.jsx` содержит собственный `useState` + `localStorage` для `tweaks`, дублируя `TweaksContext`. Изменения могут рассинхронизироваться.

**Решение:** Заменить локальный стейт на `const { tweaks, setTweak } = useTweaks()`. Выделить drag-логику в `hooks/useDraggable.js`.

**Зачем:** Единственный источник истины для настроек; устраняет риск рассинхронизации при одновременном изменении из двух мест.

---

## Шаг 5 — Создать переиспользуемый компонент `Toggle`

**Проблема:** Кнопка-тоггл (круглая ручка, анимированный фон) написана 3 раза в `DraggableTweaksPanel` и 1 раз в `WizardScreen/ConfigureStep`.

**Решение:** `components/ui/Toggle.jsx`:
```jsx
export const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
    style={{ width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
      background: value ? 'var(--cyan)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 2, left: value ? 16 : 2, width: 14, height: 14,
      borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
  </button>
);
```

**Зачем:** 4 дублирования → 1; `aria-checked` решает accessibility.

---

## Шаг 6 — Унифицировать два `StepIndicator`

**Проблема:** `StepDot` в `DashboardWizardScreen` и `StepIndicator` в `WizardScreen` — почти идентичные компоненты, написанные дважды.

**Решение:** Выделить в `components/ui/StepIndicator.jsx` с пропами `steps: string[], currentStep: number`.

**Зачем:** Единый внешний вид шаговых форм; исправление визуального бага в одном месте.

---

## Шаг 7 — Переименовать `SH` → `SectionHeader` и устранить inline-дублирование

**Проблема:** Компонент `SH` (загадочное имя) не используется там, где нужен: `DashboardScreen` и `MetricsScreen` пишут тот же паттерн (заголовок + divider + правый текст) инлайново.

**Решение:** Переименовать в `SectionHeader`, заменить все inline-повторения на компонент.

**Зачем:** Читаемость; 5–6 строк JSX → 1.

---

## Шаг 8 — Декомпозировать `DashboardWizardScreen` (345 строк)

**Проблема:** Один файл управляет 3 шагами, библиотекой виджетов, шаблонами, логикой размеров и порядка. Нарушение SRP.

**Решение:**
```
features/dashboardWizard/
  DashboardWizardScreen.jsx   ← только оркестрация шагов + onSave
  components/
    TemplateStep.jsx           ← шаг 0
    WidgetStep.jsx             ← шаг 1
    SettingsStep.jsx           ← шаг 2
    StepFooter.jsx             ← кнопки Back/Continue
  constants.js                 ← TEMPLATES, WIDGET_LIBRARY, TEMPLATE_WIDGETS, CATS
  hooks/useWizardState.js      ← весь useState-стейт визарда
```

**Зачем:** `DashboardWizardScreen` станет ~50 строк; каждый шаг тестируется отдельно.

---

## Шаг 9 — Декомпозировать `MetricsScreen` (570 строк)

**Проблема:** Metric tree sidebar, toolbar с фильтрами, chart card с логикой срезов, breakdown table/leaderboard, custom formula — всё в одном файле.

**Решение:**
```
features/metricsExplorer/
  MetricsScreen.jsx            ← layout + state routing (~60 строк)
  hooks/useMetricSelection.js  ← selected, timeRange, team, repo, compareMode, expandedGroups
  hooks/useSlicedData.js       ← логика slicedData/slicedCompare по timeRange
  components/
    MetricSidebar.jsx          ← дерево метрик (уже есть TreeItem)
    MetricToolbar.jsx           ← time range + FilterPill + Export + Compare
    MetricChartCard.jsx         ← chart + current value + delta
    MetricBreakdown.jsx         ← Breakdown table/leaderboard + переключатель
    CustomFormulaCard.jsx       ← блок формулы
```

**Зачем:** Каждый подкомпонент независимо разрабатывается и тестируется; гигантский файл исчезает.

---

## Шаг 10 — Вынести `TabBar` из `RoleDashboardScreen` в отдельный компонент

**Проблема:** `TabBar` определён как вложенная функция внутри `RoleDashboardScreen` → пересоздаётся на каждый рендер, нельзя переиспользовать.

**Решение:**
```jsx
// features/roleDashboards/components/RoleTabBar.jsx
export const RoleTabBar = ({ roles, activeRole, onRoleChange, onNewDashboard }) => { ... };
```

**Зачем:** Стабильная ссылка на компонент; возможность переиспользовать в будущих навигационных паттернах.

---

## Шаг 11 — Вынести цвета в CSS-переменные или `theme.js`

**Проблема:** Значения `#00C853`, `#FF1744`, `#FF9100`, `#B44CFF`, `#00E5FF` хардкожены в 20+ файлах. Изменение цветовой схемы требует правок везде.

**Решение:** Добавить в `index.css`:
```css
:root {
  --success: #00C853;
  --error: #FF1744;
  --warning: #FF9100;
  --purple: #B44CFF;
  --cyan: #00E5FF; /* уже частично есть */
}
```
Заменить все hex-хардкод на `var(--success)` и т.д.

**Зачем:** Тема меняется в одном месте; `TweaksContext` уже управляет `--cyan`, остальное должно следовать тому же паттерну.

---

## Шаг 12 — Заменить `onMouseEnter/Leave` с imperative style на CSS-классы или state

**Проблема:** Паттерн `e.currentTarget.style.background = '...'` в hover-хендлерах: `Sidebar.jsx`, `MetricsScreen.jsx`, `AIScreen.jsx`, `PluginScreen.jsx` и др. Это императивное управление DOM — хрупко и нарушает React-модель.

**Решение:** Добавить CSS-классы с `:hover` в `index.css` или использовать `useState(hovered)` как уже сделано в `StatCard`/`AIInsightCard`. Для простых случаев — CSS `.nav-item:hover { background: ... }`.

**Зачем:** Предсказуемость; hover-состояние не теряется при быстром движении курсора.

---

## Шаг 13 — Добавить TypeScript

**Проблема:** Весь проект на plain JSX. Нет type safety для пропсов, хуков, API-ответов.

**Решение:**
1. Добавить `tsconfig.json`, переименовать файлы `.jsx` → `.tsx` поэтапно.
2. Начать с `components/ui/` и `hooks/` как самых переиспользуемых.
3. Использовать API-модели из `API_MODEL.ts` (см. отдельный файл) как входные типы для компонентов.

**Зачем:** Ловит ошибки пропсов (например, `trendDir: 'ups'` вместо `'up'`), документирует контракт компонентов, облегчает рефакторинг.

---

## Шаг 14 — Добавить `aria`-атрибуты для accessibility

**Проблема:** Кнопки навигации (`Sidebar`), кнопки-тоггл (`DraggableTweaksPanel`), таблицы (`DataTable`) не имеют `aria`-атрибутов. `DataTable` использует `<table>` без `<caption>`.

**Решение:**
- `<button aria-label="..." aria-pressed={...}>` для тогглов
- `<nav aria-label="Main navigation">` для sidebar
- `<table aria-label={title}>` для DataTable
- `role="tablist"` + `role="tab"` для `RoleTabBar`

**Зачем:** Screen-reader-совместимость; соответствие WCAG 2.1 AA.

---

## Шаг 15 — Роутинг: заменить `active` string на нормальный роутер

**Проблема:** `App.jsx` использует `useState('dashboard')` + `switch` для «навигации». Нет возможности deep-link, back/forward не работает, title страницы не обновляется.

**Решение:** Добавить `react-router-dom v6`. Маршруты: `/`, `/dashboards/:role`, `/metrics`, `/ai`, `/plugins`, `/onboarding`, `/dashboards/new`.

**Зачем:** Нативная навигация браузера; возможность открыть конкретный дашборд по ссылке.

---

## Итоговая приоритизация

| Приоритет | Шаг | Влияние | Сложность |
|-----------|-----|---------|-----------|
| P0 | 1, 3, 4 | Убирает критическое дублирование | Низкая |
| P1 | 5, 6, 7 | Переиспользуемые примитивы | Низкая |
| P1 | 8, 9 | Декомпозиция гигантских файлов | Средняя |
| P2 | 2, 10, 11, 12 | Консистентность и надёжность | Средняя |
| P3 | 13, 14, 15 | TypeScript, a11y, роутинг | Высокая |
