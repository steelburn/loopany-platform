/**
 * The assembled run prompts must keep every run-essential directive after the
 * evolve guidance was unified into the single source skill/references/evolve.md
 * (run-dispatch and the installable skill now read the SAME file). These assertions
 * lock the run behavior for each role — losing a lever here is a regression, not a
 * doc tweak. evolve/edit carry no `{{token}}`; exec-loop fills name/taskFile/
 * stateLine/controlSection, so it also guards that placeholder filling still works
 * against the (now skill-sourced) evolve import sitting alongside it.
 */
import { expect, test } from "vitest";

import { buildEditPrompt, buildEvolvePrompt, buildExecTask, buildLoopSystemPrompt } from "./prompt.js";
import type { Loop } from "../db/schema.js";

const loop = (over: Partial<Loop> = {}): Loop =>
  ({
    id: "loop-test",
    name: "Test Loop",
    cron: "0 8 * * *",
    timezone: "America/New_York",
    task: "Check the thing and report.",
    taskFile: "/work/loopany/test/README.md",
    stateSchema: null,
    allowControl: false,
    ui: null,
    workflow: null,
    ...over,
  }) as unknown as Loop;

test("evolve run prompt keeps every lever + smoke-test discipline", () => {
  const p = buildEvolvePrompt();
  // The three structural levers run-dispatch live-supports for an evolve token.
  expect(p).toContain("loopany set-ui --file");
  expect(p).toContain("loopany set-schema --file");
  expect(p).toContain("loopany set-workflow --file");
  // Binding syntax + chart primitives the UI lever depends on.
  expect(p).toContain("{{latest.");
  expect(p).toContain("<loop-chart");
  // Run-only framing + the smoke-test gate before set-workflow.
  expect(p).toMatch(/never contact the user/i);
  expect(p).toMatch(/smoke-test/i);
  // No unfilled placeholders leak into the evolve prompt (it takes no vars).
  expect(p).not.toMatch(/\{\{(?!latest\.)\w+\}\}/);
});

test("edit run prompt keeps the schedule/envelope verbs (run-token surface)", () => {
  const p = buildEditPrompt();
  for (const verb of ["set-cron", "set-tz", "set-name", "notify", "set-model", "pause", "reschedule"]) {
    expect(p).toContain(verb);
  }
  // Edit may also touch the dashboard/gate, and must finalize with a resolved report.
  expect(p).toContain("set-ui --file");
  expect(p).toContain("loopany report --status resolved");
});

test("exec system prompt fills every placeholder for an allowControl loop", () => {
  const p = buildLoopSystemPrompt(loop({ allowControl: true }));
  expect(p).toContain("This run: Test Loop");
  expect(p).toContain("/work/loopany/test/README.md");
  // allowControl ON → the control-on section with the self-schedule verbs.
  expect(p).toContain("loopany set-cron");
  expect(p).toContain("loopany report");
  // Nothing left unfilled.
  expect(p).not.toMatch(/\{\{\w+\}\}/);
});

test("exec system prompt swaps in the locked control section when allowControl is off", () => {
  const p = buildLoopSystemPrompt(loop({ allowControl: false }));
  expect(p).toMatch(/may not change its own schedule/i);
  expect(p).not.toContain("loopany set-cron");
  expect(p).not.toMatch(/\{\{\w+\}\}/);
});

test("exec system prompt lists declared metrics in the report line", () => {
  const p = buildLoopSystemPrompt(loop({ stateSchema: [{ key: "mrr", label: "MRR", unit: "$" }] as Loop["stateSchema"] }));
  expect(p).toContain('loopany report --status <s> --state');
  expect(p).toContain("mrr");
});

test("exec task points the agent at its standing instructions + report", () => {
  const t = buildExecTask(loop());
  expect(t).toContain("[loop run · Test Loop]");
  expect(t).toContain("Check the thing and report.");
  expect(t).toContain("loopany report");
});
