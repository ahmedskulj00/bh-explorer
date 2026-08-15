import { fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App.tsx";
import { LanguageProvider } from "../src/i18n/LanguageProvider.tsx";

/** A stage box, since jsdom reports every element as 0×0. */
export const STAGE_RECT = {
  left: 0, top: 0, width: 800, height: 600,
  right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}),
} as DOMRect;

export function mount({ sizedStage = false } = {}) {
  const result = render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
  if (sizedStage) {
    const stage = board().closest("section");
    if (stage) stage.getBoundingClientRect = () => STAGE_RECT;
    board().getBoundingClientRect = () => STAGE_RECT;
  }
  return result;
}

export const board = () => screen.getByRole("img");
export const viewBox = (): number[] =>
  (board().getAttribute("viewBox") ?? "").split(" ").map(Number);
export const shapes = (status: string) =>
  document.querySelectorAll(`path[data-status="${status}"]`);
export const field = () => screen.getByLabelText("Your guess") as HTMLInputElement;
export const feedback = () => document.querySelector("[aria-live=polite]")?.textContent ?? "";

/** The map's accessible name is the round's own summary of itself. */
export function summary() {
  const match = (board().getAttribute("aria-label") ?? "").match(/^Map of (.+): (\d+) of (\d+)/);
  if (!match) throw new Error("map is missing its aria-label");
  return { scope: match[1] as string, done: Number(match[2]), total: Number(match[3]) };
}

export function guess(value: string) {
  fireEvent.change(field(), { target: { value } });
  if (field().value !== "") fireEvent.keyDown(field(), { key: "Enter" });
}

export function drag(fromX: number, toX: number, y = 300) {
  const map = board();
  fireEvent.pointerDown(map, { pointerId: 1, clientX: fromX, clientY: y, button: 0 });
  fireEvent.pointerMove(map, { pointerId: 1, clientX: toX, clientY: y });
  fireEvent.pointerUp(map, { pointerId: 1 });
}

export const KANTON_SARAJEVO = [
  "Centar Sarajevo", "Hadzici", "Ilidza", "Ilijas", "Novi Grad Sarajevo",
  "Novo Sarajevo", "Stari Grad Sarajevo", "Trnovo (FBiH)", "Vogosca",
];
