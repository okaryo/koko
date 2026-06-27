import { describe, expect, it } from "vitest";
import {
  checkedFromMarkdownTaskInputMatch,
  markdownTaskInputRegex,
} from "./markdownTaskInput";

function matchTaskInput(input: string) {
  return input.match(markdownTaskInputRegex);
}

describe("Markdown task input", () => {
  it("matches unchecked task markers", () => {
    const match = matchTaskInput("- [ ] ");

    expect(match).not.toBeNull();
    expect(checkedFromMarkdownTaskInputMatch(match as RegExpMatchArray)).toBe(
      false,
    );
  });

  it("matches checked task markers", () => {
    const lowerCaseMatch = matchTaskInput("- [x] ");
    const upperCaseMatch = matchTaskInput("- [X] ");

    expect(lowerCaseMatch).not.toBeNull();
    expect(upperCaseMatch).not.toBeNull();
    expect(
      checkedFromMarkdownTaskInputMatch(lowerCaseMatch as RegExpMatchArray),
    ).toBe(true);
    expect(
      checkedFromMarkdownTaskInputMatch(upperCaseMatch as RegExpMatchArray),
    ).toBe(true);
  });

  it("supports common unordered list bullets", () => {
    expect(matchTaskInput("- [ ] ")).not.toBeNull();
    expect(matchTaskInput("+ [ ] ")).not.toBeNull();
    expect(matchTaskInput("* [ ] ")).not.toBeNull();
  });

  it("rejects non-task input", () => {
    expect(matchTaskInput("- [] ")).toBeNull();
    expect(matchTaskInput("- [todo] ")).toBeNull();
    expect(matchTaskInput("plain text")).toBeNull();
  });
});
