import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_CHOICES,
  FIRST_RUN_MODE,
  getChoiceByMode,
  getInitialScreen,
} from "./firstRun";

describe("first run", () => {
  it("defaults to explicit choice screen", () => {
    expect(getInitialScreen(FIRST_RUN_MODE.undecided)).toBe("first-run");
  });

  it("demo choice lands on overview", () => {
    expect(getInitialScreen(FIRST_RUN_MODE.demo)).toBe("overview");
  });

  it("setup choice lands on wizard", () => {
    expect(getInitialScreen(FIRST_RUN_MODE.setup)).toBe("wizard");
  });

  it("first run choices include demo and setup", () => {
    expect(FIRST_RUN_CHOICES).toHaveLength(2);
    expect(getChoiceByMode(FIRST_RUN_MODE.demo)?.title).toBe("Show demo");
    expect(getChoiceByMode(FIRST_RUN_MODE.setup)?.title).toBe("Skip demo");
  });
});
