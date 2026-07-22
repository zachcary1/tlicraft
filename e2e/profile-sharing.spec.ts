import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Mirrors the localStorage key BuildContext.tsx uses for persisting profiles
// (PROFILES_STORAGE_KEY). Kept as a literal here since this suite drives the
// app as a black box rather than importing app internals.
const STORAGE_KEY = "tlicraft-profiles-v1";

interface SeedProfile {
  id: string;
  name: string;
  updatedAt: number;
  state: { skills: { activeSkillSelections: (string | null)[] } };
}

async function seedProfiles(target: Page | BrowserContext, profiles: SeedProfile[], activeId: string) {
  await target.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: JSON.stringify({ profiles, activeId }) },
  );
}

async function readStoredProfiles(page: Page): Promise<{ profiles: SeedProfile[]; activeId: string }> {
  // The debounced localStorage write (WRITE_DEBOUNCE_MS in BuildContext) may not
  // have flushed yet right after a navigation or state change — poll for it.
  await page.waitForFunction((key) => window.localStorage.getItem(key) !== null, STORAGE_KEY, { timeout: 5000 });
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  return JSON.parse(raw as string);
}

async function generateExportCode(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Generate Export Code" }).click();
  const input = page.getByPlaceholder("Click Generate to create a code");
  // compressToCode is async (CompressionStream), so the input fills in after the click resolves.
  await expect(input).toHaveValue(/.+/, { timeout: 5000 });
  return input.inputValue();
}

async function importCode(page: Page, code: string) {
  await page.getByPlaceholder("e.g. NX7C-9Q2L-RM4P-T8ZV").fill(code);
  await page.getByRole("button", { name: "Import Profile", exact: true }).click();
}

test.describe("profile export/import sharing semantics", () => {
  test("recipient gets an independent, faithful copy — unaffected by later edits or deletion of the source", async ({ browser }) => {
    const userA = await browser.newContext();
    const userB = await browser.newContext();

    await seedProfiles(
      userA,
      [{ id: "seed-a", name: "QA-Source", updatedAt: Date.now(), state: { skills: { activeSkillSelections: ["v1", null, null, null, null] } } }],
      "seed-a",
    );

    const pageA = await userA.newPage();
    const pageB = await userB.newPage();

    let code = "";
    await test.step("User A exports their profile", async () => {
      await pageA.goto("/profiles");
      code = await generateExportCode(pageA);
    });

    await test.step("User B imports the code and gets a faithful copy", async () => {
      await pageB.goto("/profiles");
      await importCode(pageB, code);
      await expect(pageB.getByText('Imported as "QA-Source".')).toBeVisible();
      await expect(pageB.getByRole("button", { name: "Options for QA-Source" })).toHaveCount(1);

      const { profiles } = await readStoredProfiles(pageB);
      const imported = profiles.find((p) => p.name === "QA-Source");
      expect(imported?.state.skills.activeSkillSelections[0]).toBe("v1");
      expect(imported?.id).not.toBe("seed-a"); // fresh id, not a reference to the source profile
    });

    await test.step("User A edits their source profile afterwards — User B's copy does not change", async () => {
      await pageA.evaluate((key) => {
        const data = JSON.parse(window.localStorage.getItem(key) as string);
        data.profiles[0].state.skills.activeSkillSelections[0] = "v2-edited-after-share";
        window.localStorage.setItem(key, JSON.stringify(data));
      }, STORAGE_KEY);
      await pageA.reload();

      await pageB.reload();
      const { profiles } = await readStoredProfiles(pageB);
      const imported = profiles.find((p) => p.name === "QA-Source");
      expect(imported?.state.skills.activeSkillSelections[0]).toBe("v1");
    });

    await test.step("User A deletes their source profile — User B's copy survives untouched", async () => {
      pageA.once("dialog", (d) => d.accept());
      await pageA.getByRole("button", { name: "Options for QA-Source" }).click();
      await pageA.getByRole("button", { name: "Delete" }).click();
      await expect(pageA.getByRole("button", { name: "Options for QA-Source" })).toHaveCount(0);

      await pageB.reload();
      await expect(pageB.getByRole("button", { name: "Options for QA-Source" })).toHaveCount(1);
      const { profiles } = await readStoredProfiles(pageB);
      const imported = profiles.find((p) => p.name === "QA-Source");
      expect(imported?.state.skills.activeSkillSelections[0]).toBe("v1");
    });

    await userA.close();
    await userB.close();
  });

  test("importing the same code twice creates two independent profiles, not one shared/updated profile", async ({ browser }) => {
    const userA = await browser.newContext();
    await seedProfiles(
      userA,
      [{ id: "seed-a", name: "QA-Dupe", updatedAt: Date.now(), state: { skills: { activeSkillSelections: ["dupe", null, null, null, null] } } }],
      "seed-a",
    );
    const pageA = await userA.newPage();
    await pageA.goto("/profiles");
    const code = await generateExportCode(pageA);

    const userB = await browser.newContext();
    const pageB = await userB.newPage();
    await pageB.goto("/profiles");

    await importCode(pageB, code);
    await expect(pageB.getByText('Imported as "QA-Dupe".')).toBeVisible();
    await importCode(pageB, code);
    await expect(pageB.getByText('Imported as "QA-Dupe".')).toBeVisible();

    await expect(pageB.getByRole("button", { name: "Options for QA-Dupe" })).toHaveCount(2);
    const { profiles } = await readStoredProfiles(pageB);
    const dupes = profiles.filter((p) => p.name === "QA-Dupe");
    expect(dupes).toHaveLength(2);
    expect(dupes[0].id).not.toBe(dupes[1].id);

    await userA.close();
    await userB.close();
  });

  test("a malformed/tampered export code is rejected without creating a profile or crashing", async ({ page }) => {
    await page.goto("/profiles");
    const before = await readStoredProfiles(page);

    await importCode(page, "not-a-real-export-code-at-all");
    await expect(page.getByText("That export code doesn't look valid.")).toBeVisible();

    const after = await readStoredProfiles(page);
    expect(after.profiles.length).toBe(before.profiles.length);
  });

  test("legacy export codes without the {name, state} wrapper still import as a raw build state", async ({ page }) => {
    // Older/alternate producers of an export code might not wrap the build in
    // { name, state } — ImportProfileCard falls back to treating the whole
    // decoded payload as the state itself in that case.
    const raw = JSON.stringify({
      gear: { loadout: {}, slots: {} },
      skills: { activeSkillSelections: ["legacy", null, null, null, null], passiveSkillSelections: [null, null, null, null], supportSelections: {} },
      pactspirits: { slotSelections: {}, fates: { left: { nodes: [] }, right: { nodes: [] }, bottom: { nodes: [] } }, fateSelections: {} },
      heroTrait: { selectedHero: null, memoryFilled: [false, false, false], memoryQuality: [null, null, null], memorySelections: [{}, {}, {}], traitSelections: [null, null, null] },
      talents: { slots: [null, null, null, null], progress: {} },
      divinitySlates: { placedInstances: [] },
    });
    const code = await page.evaluate(async (data) => {
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"));
      const buf = await new Response(stream).arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }, raw);

    await page.goto("/profiles");
    await importCode(page, code);
    await expect(page.getByText('Imported as "Imported Profile".')).toBeVisible();

    const { profiles } = await readStoredProfiles(page);
    const imported = profiles.find((p) => p.name === "Imported Profile");
    expect(imported?.state.skills.activeSkillSelections[0]).toBe("legacy");
  });
});
