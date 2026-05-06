export const FIRST_RUN_MODE = {
  undecided: "undecided",
  demo: "demo",
  setup: "setup",
};

export const FIRST_RUN_CHOICES = [
  {
    id: FIRST_RUN_MODE.demo,
    title: "Show demo",
    description:
      "Open Sandbox Inc. synthetic data and start on the Overview dashboard.",
    icon: "sparkles",
    accent: "#a855f7",
  },
  {
    id: FIRST_RUN_MODE.setup,
    title: "Skip demo",
    description:
      "Go straight to source setup and configure your initial connections.",
    icon: "settings",
    accent: "#00e5cc",
  },
];

export function getInitialScreen(firstRunMode) {
  if (firstRunMode === FIRST_RUN_MODE.demo) {
    return "overview";
  }
  if (firstRunMode === FIRST_RUN_MODE.setup) {
    return "wizard";
  }
  return "first-run";
}

export function getChoiceByMode(mode) {
  return FIRST_RUN_CHOICES.find((choice) => choice.id === mode) || null;
}
