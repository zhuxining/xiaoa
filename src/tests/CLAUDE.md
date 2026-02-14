---
title: Testing
description: How to test your electron-shadcn application with Vitest, Playwright, and React Testing Library
---

import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";

electron-shadcn comes with a comprehensive testing setup including [Vitest](https://vitest.dev) for unit tests, [Playwright](https://playwright.dev) for end-to-end tests, and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component testing.

## Test Commands

| Command | Description |
| --- | --- |
| `npm run test` | Run unit tests with Vitest (default) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:e2e` | Run end-to-end tests with Playwright |
| `npm run test:all` | Run all tests (Vitest and Playwright) |

## Unit Testing with Vitest

Vitest is a fast unit testing framework powered by Vite. It's configured and ready to use in electron-shadcn.

### Writing Unit Tests

Create test files in the `src/tests` directory with the `.test.ts` or `.test.tsx` extension:

```ts
// src/tests/utils.test.ts
import { describe, it, expect } from "vitest";

describe("utility functions", () => {
  it("should add two numbers", () => {
    const result = 1 + 2;
    expect(result).toBe(3);
  });

  it("should handle string concatenation", () => {
    const result = "Hello" + " " + "World";
    expect(result).toBe("Hello World");
  });
});
```

### Running Unit Tests

```bash
# Run once
npm run test

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

### Testing Utilities and Hooks

```ts
// src/tests/hooks.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useState } from "react";

describe("custom hooks", () => {
  it("should update state", () => {
    const { result } = renderHook(() => useState(0));

    act(() => {
      result.current[1](5);
    });

    expect(result.current[0]).toBe(5);
  });
});
```

## Component Testing with React Testing Library

React Testing Library helps you test components the way users interact with them.

### Writing Component Tests

```tsx
// src/tests/button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button component", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText("Click me")).toBeDisabled();
  });
});
```

### Testing with User Events

For more realistic user interaction testing:

```tsx
// src/tests/form.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/input";

describe("Input component", () => {
  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText("Enter text");
    await user.type(input, "Hello World");
    
    expect(input).toHaveValue("Hello World");
  });
});
```

## End-to-End Testing with Playwright

Playwright tests the full application including the Electron main process and renderer.

<Callout type="warn">
Playwright tests require the application to be built first. Run `npm run package` or `npm run make` before running e2e tests.
</Callout>

### Running E2E Tests

<Steps>
<Step>
### Build the Application

```bash
npm run package
```

</Step>

<Step>
### Run Playwright Tests

```bash
npm run test:e2e
```

</Step>
</Steps>

### Writing E2E Tests

Create test files in `src/tests` with the `.e2e.ts` extension:

```ts
// src/tests/app.e2e.ts
import { test, expect, _electron as electron } from "@playwright/test";

test("app launches and displays main window", async () => {
  const electronApp = await electron.launch({
    args: ["out/main/index.js"],
  });

  const window = await electronApp.firstWindow();
  
  // Wait for the window to load
  await window.waitForLoadState("domcontentloaded");
  
  // Check that the window is visible
  expect(await window.isVisible("body")).toBe(true);
  
  await electronApp.close();
});

test("window title is correct", async () => {
  const electronApp = await electron.launch({
    args: ["out/main/index.js"],
  });

  const window = await electronApp.firstWindow();
  const title = await window.title();
  
  expect(title).toBeDefined();
  
  await electronApp.close();
});
```

### Testing User Interactions

```ts
// src/tests/navigation.e2e.ts
import { test, expect, _electron as electron } from "@playwright/test";

test("can navigate between pages", async () => {
  const electronApp = await electron.launch({
    args: ["out/main/index.js"],
  });

  const window = await electronApp.firstWindow();
  
  // Click a navigation link
  await window.click('a[href="/second"]');
  
  // Wait for navigation
  await window.waitForURL("**/second");
  
  // Verify we're on the new page
  expect(await window.locator("h1").textContent()).toBeDefined();
  
  await electronApp.close();
});
```

## CI/CD Integration

electron-shadcn includes a pre-configured GitHub Actions workflow for running Playwright tests.

### GitHub Actions Workflow

The workflow is located at `.github/workflows/test.yml` and runs automatically on pull requests.

### Running Tests in CI

The workflow:

1. Installs dependencies
2. Builds the application
3. Runs Playwright tests
4. Reports results

<Callout type="info">
The GitHub Actions workflow runs tests on multiple platforms (Windows, macOS, Linux) to ensure cross-platform compatibility.
</Callout>

## Test Configuration

### Vitest Configuration

The Vitest configuration is in `vitest.config.ts`:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
  },
});
```

### Playwright Configuration

The Playwright configuration is in `playwright.config.ts`:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests",
  testMatch: "**/*.e2e.ts",
  timeout: 30000,
  retries: 2,
});
```

## Test File Organization

Keep your tests organized in the `src/tests` directory:

```
src/tests/
├── setup.ts          # Test setup and global mocks
├── utils.test.ts     # Utility function tests
├── hooks.test.ts     # Custom hook tests
├── button.test.tsx   # Component tests
├── app.e2e.ts        # E2E tests
└── ...
```
