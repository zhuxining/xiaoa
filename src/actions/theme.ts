import { LOCAL_STORAGE_KEYS } from "@/constants";
import { ipc } from "@/ipc/manager";
import type { ThemeMode } from "@/types/theme-mode";

export interface ThemePreferences {
  local: ThemeMode | null;
  system: ThemeMode;
}

export async function getCurrentTheme(): Promise<ThemePreferences> {
  const currentTheme = await ipc.client.theme.getCurrentThemeMode();
  const localTheme = localStorage.getItem(
    LOCAL_STORAGE_KEYS.THEME
  ) as ThemeMode | null;

  return {
    system: currentTheme,
    local: localTheme,
  };
}

let _systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

export async function setTheme(newTheme: ThemeMode) {
  await ipc.client.theme.setThemeMode(newTheme);
  localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, newTheme);
  applyDocumentTheme(newTheme);
}

export async function toggleTheme() {
  const isDarkMode = await ipc.client.theme.toggleThemeMode();
  const newTheme = isDarkMode ? "dark" : "light";
  localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, newTheme);
  applyDocumentTheme(newTheme);
}

export async function syncWithLocalTheme() {
  const { local } = await getCurrentTheme();
  await setTheme(local ?? "system");
}

function applyDocumentTheme(theme: ThemeMode) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  if (_systemThemeListener) {
    mq.removeEventListener("change", _systemThemeListener);
    _systemThemeListener = null;
  }

  if (theme === "system") {
    updateDocumentTheme(mq.matches);
    _systemThemeListener = (e) => updateDocumentTheme(e.matches);
    mq.addEventListener("change", _systemThemeListener);
  } else {
    updateDocumentTheme(theme === "dark");
  }
}

function updateDocumentTheme(isDarkMode: boolean) {
  document.documentElement.classList.toggle("dark", isDarkMode);
}
