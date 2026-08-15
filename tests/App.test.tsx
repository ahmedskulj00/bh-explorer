import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { feedback, field, guess, KANTON_SARAJEVO, mount, shapes, summary } from "./helpers.tsx";

/**
 * Queries go through roles and labels wherever possible. The map is the one
 * exception: shapes carry `data-status`, so counting what is on the board does
 * not depend on class names or styling.
 */

const tabs = () => screen.getAllByRole("tab");

beforeEach(() => mount());

describe("board", () => {
  it("starts empty with every municipality drawn", () => {
    expect(summary()).toEqual({ scope: "Bosnia and Herzegovina", done: 0, total: 142 });
    expect(document.querySelectorAll("path[data-status]")).toHaveLength(142);
  });

  it("never offers an autocomplete", () => {
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps unfound shapes anonymous and inert", () => {
    const unfound = shapes("todo");
    expect(unfound.length).toBeGreaterThan(0);
    expect(unfound[0]).not.toHaveAttribute("aria-label");
    expect((unfound[0] as SVGPathElement).onclick).toBeNull();
  });
});

describe("guessing", () => {
  it("scores a correct name and paints it", () => {
    guess("tuzla");
    expect(summary().done).toBe(1);
    expect(shapes("found")).toHaveLength(1);
  });

  it("accepts diacritic-free and Cyrillic spellings", () => {
    guess("zepce");
    guess("Бања Лука");
    expect(summary().done).toBe(2);
  });

  it("accepts historical names", () => {
    guess("Duvno");
    expect(feedback()).toContain("Tomislavgrad");
  });

  it("does not score a repeat", () => {
    guess("tuzla");
    guess("Tuzla");
    expect(summary().done).toBe(1);
    expect(feedback()).toContain("already found");
  });

  it("holds a guess that another answer continues", () => {
    fireEvent.change(field(), { target: { value: "novi grad" } });
    expect(field()).toHaveValue("novi grad");
    expect(summary().done).toBe(0);

    fireEvent.change(field(), { target: { value: "novi grad sarajevo" } });
    expect(feedback()).toContain("Novi Grad Sarajevo");
    expect(summary().done).toBe(1);
  });

  it("gives no points for an over-broad name", () => {
    guess("sarajevo");
    guess("sarajevo");
    expect(summary().done).toBe(0);
    expect(feedback()).toContain("covers several");
  });

  it("rejects a name that does not exist", () => {
    guess("qqqq");
    expect(feedback()).toContain("No municipality called");
  });
});

describe("rounds", () => {
  it("breaks the country round down by region", () => {
    expect(screen.getByText("By region")).toBeInTheDocument();
    expect(screen.getByText("Una-Sana Canton")).toBeInTheDocument();
    expect(screen.getByText("Brčko District")).toBeInTheDocument();
  });

  it("asks before discarding progress", () => {
    guess("tuzla");
    fireEvent.click(tabs()[2]!);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Start a new round?");
    expect(summary().scope).toBe("Bosnia and Herzegovina");

    fireEvent.click(within(dialog).getByRole("button", { name: "Keep playing" }));
    expect(summary().done).toBe(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("restarts when the change is confirmed", () => {
    guess("tuzla");
    fireEvent.click(tabs()[2]!);
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "New round" })
    );
    expect(summary()).toEqual({ scope: "Sarajevo Canton", done: 0, total: 9 });
  });

  it("explains a real name that is out of scope", () => {
    fireEvent.click(tabs()[2]!);
    guess("tuzla");
    expect(feedback()).toContain("not in this round");
    expect(summary().done).toBe(0);
  });

  it("closes out a completed round", () => {
    fireEvent.click(tabs()[2]!);
    KANTON_SARAJEVO.forEach(guess);

    expect(summary().done).toBe(9);
    expect(screen.getByText("Perfect round")).toBeInTheDocument();
    expect(field()).toBeDisabled();
  });

  it("reveals everything missed on give up", () => {
    fireEvent.click(tabs()[1]!);
    fireEvent.click(screen.getByRole("button", { name: /Republika Srpska/ }));
    expect(summary().total).toBe(62);

    guess("banja luka");
    fireEvent.click(screen.getByRole("button", { name: /Give up/ }));

    expect(shapes("found")).toHaveLength(1);
    expect(shapes("missed")).toHaveLength(61);
    expect(screen.getByText("Missed (61)")).toBeInTheDocument();
  });
});
