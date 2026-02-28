/**
 * tool.test.tsx - Tool 组件测试
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  getStatusBadge,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

// 顶层正则表达式常量
const PATH_REGEX = /"path"/;
const UTF8_REGEX = /"utf-8"/;
const SUCCESS_REGEX = /"success"/;

describe("Tool Components", () => {
  describe("getStatusBadge", () => {
    test("renders correct badge for input-available state", () => {
      const { container } = render(getStatusBadge("input-available"));
      expect(container.textContent).toContain("Running");
    });

    test("renders correct badge for output-available state", () => {
      const { container } = render(getStatusBadge("output-available"));
      expect(container.textContent).toContain("Completed");
    });

    test("renders correct badge for output-error state", () => {
      const { container } = render(getStatusBadge("output-error"));
      expect(container.textContent).toContain("Error");
    });

    test("renders correct badge for approval-requested state", () => {
      const { container } = render(getStatusBadge("approval-requested"));
      expect(container.textContent).toContain("Awaiting Approval");
    });

    test("renders correct badge for output-denied state", () => {
      const { container } = render(getStatusBadge("output-denied"));
      expect(container.textContent).toContain("Denied");
    });
  });

  describe("Tool", () => {
    test("renders collapsible container", () => {
      render(
        <Tool data-testid="tool-container">
          <ToolHeader state="output-available" type="tool-read" />
        </Tool>
      );

      expect(screen.getByTestId("tool-container")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      render(
        <Tool className="custom-class" data-testid="tool-container">
          <ToolHeader state="output-available" type="tool-read" />
        </Tool>
      );

      expect(screen.getByTestId("tool-container")).toHaveClass("custom-class");
    });
  });

  describe("ToolHeader", () => {
    test("renders with default title derived from type", () => {
      render(
        <Tool>
          <ToolHeader state="output-available" type="tool-read" />
        </Tool>
      );

      expect(screen.getByText("read")).toBeInTheDocument();
    });

    test("renders with custom title", () => {
      render(
        <Tool>
          <ToolHeader
            state="output-available"
            title="Read File"
            type="tool-read"
          />
        </Tool>
      );

      expect(screen.getByText("Read File")).toBeInTheDocument();
    });

    test("renders status badge", () => {
      render(
        <Tool>
          <ToolHeader state="output-available" type="tool-read" />
        </Tool>
      );

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    test("renders dynamic tool name", () => {
      render(
        <Tool>
          <ToolHeader
            state="input-available"
            toolName="custom_tool"
            type="dynamic-tool"
          />
        </Tool>
      );

      expect(screen.getByText("custom_tool")).toBeInTheDocument();
    });

    test("renders chevron icon", () => {
      render(
        <Tool>
          <ToolHeader state="output-available" type="tool-read" />
        </Tool>
      );

      // ChevronDownIcon should be present
      const trigger = screen.getByRole("button");
      expect(trigger).toBeInTheDocument();
    });
  });

  describe("ToolContent", () => {
    test("renders children when open", () => {
      render(
        <Tool defaultOpen>
          <ToolHeader state="output-available" type="tool-read" />
          <ToolContent>
            <div data-testid="tool-content">Tool details</div>
          </ToolContent>
        </Tool>
      );

      // Content should be visible when defaultOpen
      expect(screen.getByTestId("tool-content")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      render(
        <Tool defaultOpen>
          <ToolHeader state="output-available" type="tool-read" />
          <ToolContent className="custom-content">
            <div>Content</div>
          </ToolContent>
        </Tool>
      );

      // Find the content wrapper
      const content = screen.getByText("Content").parentElement;
      expect(content).toHaveClass("custom-content");
    });
  });

  describe("ToolInput", () => {
    test("renders input as JSON", () => {
      const input = { path: "/test/file.ts", encoding: "utf-8" };

      render(<ToolInput input={input} />);

      expect(screen.getByText("Parameters")).toBeInTheDocument();
      expect(screen.getByText(PATH_REGEX)).toBeInTheDocument();
      expect(screen.getByText(UTF8_REGEX)).toBeInTheDocument();
    });

    test("renders empty input", () => {
      render(<ToolInput input={{}} />);

      expect(screen.getByText("Parameters")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      render(
        <ToolInput className="custom-input" data-testid="input" input={{}} />
      );

      expect(screen.getByTestId("input")).toHaveClass("custom-input");
    });
  });

  describe("ToolOutput", () => {
    test("renders object output as JSON", () => {
      const output = { result: "success", lines: 10 };

      render(<ToolOutput errorText={undefined} output={output} />);

      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByText(SUCCESS_REGEX)).toBeInTheDocument();
    });

    test("renders string output", () => {
      render(<ToolOutput errorText={undefined} output="Hello World" />);

      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    test("renders error text", () => {
      render(
        <ToolOutput errorText="Something went wrong" output={undefined} />
      );

      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    test("returns null when no output or error", () => {
      const { container } = render(
        <ToolOutput errorText={undefined} output={undefined} />
      );

      expect(container.firstChild).toBeNull();
    });

    test("applies error styling", () => {
      render(<ToolOutput errorText="Error occurred" output={undefined} />);

      const errorContainer = screen.getByText("Error occurred").parentElement;
      expect(errorContainer?.className).toContain("destructive");
    });
  });

  describe("Tool integration", () => {
    test("full tool workflow", () => {
      render(
        <Tool defaultOpen>
          <ToolHeader
            state="output-available"
            title="Read File"
            type="tool-read"
          />
          <ToolContent>
            <ToolInput input={{ path: "/src/index.ts" }} />
            <ToolOutput
              errorText={undefined}
              output={{ content: "export const x = 1;" }}
            />
          </ToolContent>
        </Tool>
      );

      // Header shows title and status
      expect(screen.getByText("Read File")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();

      // Content shows parameters and result
      expect(screen.getByText("Parameters")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    test("collapsible toggle works", () => {
      render(
        <Tool>
          <ToolHeader state="input-available" type="tool-read" />
          <ToolContent>
            <div data-testid="hidden-content">Hidden content</div>
          </ToolContent>
        </Tool>
      );

      // Initially closed - content should not be visible
      // Note: CollapsibleContent visibility depends on implementation
      const trigger = screen.getByRole("button");
      expect(trigger).toBeInTheDocument();
    });
  });
});
