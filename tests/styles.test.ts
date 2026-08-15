import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * CSS Modules give component-scoped classes but no type safety: `styles.typo`
 * is `undefined` at runtime and silently renders an unstyled element. These
 * checks stand in for the types the bundler cannot give us.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "../src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e): string[] =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
}

const files = walk(SRC);
const components = files.filter((f) => f.endsWith(".tsx"));
const classesIn = (css: string) => new Set(css.match(/\.([A-Za-z][\w-]*)/g)?.map((c: string) => c.slice(1)) ?? []);

describe("CSS modules", () => {
  it("define every class the components reference", () => {
    for (const file of components) {
      const src = readFileSync(file, "utf8");
      const used = new Set(src.match(/\bstyles\.(\w+)/g)?.map((m: string) => m.slice(7)) ?? []);
      if (used.size === 0) continue;

      const importPath = src.match(/import\s+styles\s+from\s+"(\.[\w./-]+\.module\.css)"/)?.[1];
      expect(importPath, `${file} uses styles.* but imports no module`).toBeTruthy();

      const defined = classesIn(readFileSync(resolve(dirname(file), importPath!), "utf8"));
      const missing = [...used].filter((c) => !defined.has(c));
      expect(missing, `${file} references undefined classes`).toEqual([]);
    }
  });

  it("define every global utility class the components use", () => {
    const global = classesIn(readFileSync(join(SRC, "styles/global.css"), "utf8"));
    const used = new Set<string>();
    for (const file of components) {
      const src = readFileSync(file, "utf8");
      for (const m of src.match(/className="([^"{]+)"/g) ?? []) {
        m.slice(11, -1).split(/\s+/).forEach((c: string) => c && used.add(c));
      }
      for (const m of src.match(/className=\{`([^`]*)`\}/g) ?? []) {
        m.replace(/\$\{[^}]*\}/g, " ").split(/\s+/).forEach((c: string) => {
          const clean = c.replace(/[`{}]|className=/g, "");
          if (clean) used.add(clean);
        });
      }
    }
    expect([...used].filter((c) => !global.has(c))).toEqual([]);
  });

  it("define every custom property the stylesheets read", () => {
    const tokens = new Set(
      readFileSync(join(SRC, "styles/tokens.css"), "utf8").match(/(--[\w-]+):/g)?.map((t: string) => t.slice(0, -1)) ?? []
    );
    const used = new Set<string>();
    for (const file of files.filter((f) => f.endsWith(".css") && !f.endsWith("tokens.css"))) {
      for (const m of readFileSync(file, "utf8").match(/var\((--[\w-]+)\)/g) ?? []) {
        used.add(m.slice(4, -1));
      }
    }
    expect([...used].filter((t) => !tokens.has(t))).toEqual([]);
  });
});

describe("layout", () => {
  /**
   * jsdom has no layout engine, so this bug cannot be caught by rendering.
   * Grid items default to `min-height: auto` and refuse to shrink below their
   * content, so `overflow-y` never engages. When a round ended, the rail's
   * result card plus up to 141 "missed" chips stretched the whole row, the map
   * stretched with it, and its aspect collapsed — which read as the map zooming
   * out and refusing to pan or zoom back.
   */
  const scrollable = (file: string) => readFileSync(join(SRC, file), "utf8");

  it("lets the scrolling rail actually shrink", () => {
    const rail = scrollable("components/ControlRail.module.css");
    expect(rail).toMatch(/overflow-y:\s*auto/);
    expect(rail, "a scrolling grid item needs min-height: 0").toMatch(/min-height:\s*0/);
  });

  it("caps the app height instead of only setting a minimum", () => {
    const app = scrollable("App.module.css");
    expect(app, "min-height alone lets the rail stretch the page").toMatch(/\n\s*height:\s*100dvh/);
    expect(app).toMatch(/overflow:\s*hidden/);
  });

  it("does not let the filling rail section collapse under its content", () => {
    const rail = scrollable("components/ControlRail.module.css");
    const grow = rail.slice(rail.indexOf(".grow"), rail.indexOf("}", rail.indexOf(".grow")));
    // a zero flex-basis plus an explicit min-height lets the section shrink
    // below its own content, which then overflows onto the buttons beneath
    expect(grow).not.toMatch(/flex:\s*1\s*;/);
    expect(grow).not.toMatch(/min-height:\s*\d/);
    expect(grow).toMatch(/flex:\s*1\s+0\s+auto/);
  });

  it("does not force a tall stage that fights the row height", () => {
    const stage = scrollable("components/MapStage.module.css");
    const base = stage.slice(0, stage.indexOf("@media"));
    expect(base).toMatch(/min-height:\s*0/);
  });
});
