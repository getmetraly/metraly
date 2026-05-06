import test from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_RUN_CHOICES,
  FIRST_RUN_MODE,
  getChoiceByMode,
  getInitialScreen,
} from "./firstRun.js";

test("first run defaults to explicit choice screen", () => {
  assert.equal(getInitialScreen(FIRST_RUN_MODE.undecided), "first-run");
});

test("demo choice lands on overview", () => {
  assert.equal(getInitialScreen(FIRST_RUN_MODE.demo), "overview");
});

test("setup choice lands on wizard", () => {
  assert.equal(getInitialScreen(FIRST_RUN_MODE.setup), "wizard");
});

test("first run choices include demo and setup", () => {
  assert.equal(FIRST_RUN_CHOICES.length, 2);
  assert.equal(getChoiceByMode(FIRST_RUN_MODE.demo)?.title, "Show demo");
  assert.equal(getChoiceByMode(FIRST_RUN_MODE.setup)?.title, "Skip demo");
});
