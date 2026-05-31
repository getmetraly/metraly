export type FirstRunMode = 'undecided' | 'demo' | 'setup';

export const FIRST_RUN_MODE = {
  undecided: 'undecided',
  demo: 'demo',
  setup: 'setup',
} as const satisfies Record<string, FirstRunMode>;

export interface FirstRunChoice {
  id: FirstRunMode;
  title: string;
  description: string;
  icon: string;
}

export const FIRST_RUN_CHOICES: FirstRunChoice[] = [
  {
    id: FIRST_RUN_MODE.demo,
    title: 'Show demo',
    description:
      'Open Sandbox Inc. synthetic data and start on the Overview dashboard.',
    icon: 'sparkles',
  },
  {
    id: FIRST_RUN_MODE.setup,
    title: 'Skip demo',
    description:
      'Go straight to source setup and configure your initial connections.',
    icon: 'settings',
  },
];

export function getInitialScreen(firstRunMode: FirstRunMode): string {
  if (firstRunMode === FIRST_RUN_MODE.demo) return 'overview';
  if (firstRunMode === FIRST_RUN_MODE.setup) return 'wizard';
  return 'first-run';
}

export function getChoiceByMode(mode: FirstRunMode): FirstRunChoice | null {
  return FIRST_RUN_CHOICES.find((c) => c.id === mode) ?? null;
}
