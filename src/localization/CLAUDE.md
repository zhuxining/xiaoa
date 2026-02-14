---
title: Internationalization (i18n)
description: How to implement and manage multiple languages in your electron-shadcn application using i18next
---

import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";

electron-shadcn comes with built-in internationalization support using [i18next](https://www.i18next.com/) and [react-i18next](https://react.i18next.com/). This allows you to easily translate your application into multiple languages.

## Directory Structure

Internationalization files are organized as follows:

```
src/
├── localization/
│   ├── i18n.ts           # i18next configuration and translations
│   ├── langs.ts          # Available languages list
│   └── language.ts       # Language type definition
├── actions/
│   └── language.ts       # Language actions (set/update)
├── components/
│   └── lang-toggle.tsx   # Language switcher component
└── constants/
    └── index.ts          # Contains localStorage keys
```

## Using Translations

### Basic Usage

Use the `useTranslation` hook to access translations in your components:

```tsx
import { useTranslation } from "react-i18next";

export default function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("appName")}</h1>
      <p>{t("titleHomePage")}</p>
    </div>
  );
}
```

### Available Translation Keys

The template comes with these default translation keys:

| Key | English | Portuguese (Brazil) |
| --- | --- | --- |
| `appName` | electron-shadcn | electron-shadcn |
| `titleHomePage` | Home Page | Página Inicial |
| `titleSecondPage` | Second Page | Segunda Página |
| `documentation` | Documentation | Documentação |
| `version` | Version | Versão |
| `madeBy` | Made by LuanRoger | Feito por LuanRoger |

<Callout type="info">
  These keys can be deleted or modified as needed, since they are just examples.
</Callout>

## Adding a New Language

<Steps>
<Step>
### Add Translations to i18n.ts

Open `src/localization/i18n.ts` and add a new language resource:

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        appName: "electron-shadcn",
        titleHomePage: "Home Page",
        titleSecondPage: "Second Page",
        documentation: "Documentation",
        version: "Version",
        madeBy: "Made by LuanRoger",
      },
    },
    "pt-BR": {
      translation: {
        appName: "electron-shadcn",
        titleHomePage: "Página Inicial",
        titleSecondPage: "Segunda Página",
        documentation: "Documentação",
        version: "Versão",
        madeBy: "Feito por LuanRoger",
      },
    },
    // Add your new language here
    es: {
      translation: {
        appName: "electron-shadcn",
        titleHomePage: "Página de Inicio",
        titleSecondPage: "Segunda Página",
        documentation: "Documentación",
        version: "Versión",
        madeBy: "Hecho por LuanRoger",
      },
    },
  },
});
```

</Step>

<Step>
### Register the Language in langs.ts

Add the new language to the `src/localization/langs.ts` file:

```ts
import { Language } from "./language";

export default [
  {
    key: "en",
    nativeName: "English",
    prefix: "EN-US",
  },
  {
    key: "pt-BR",
    nativeName: "Português (Brasil)",
    prefix: "PT-BR",
  },
  // Add your new language
  {
    key: "es",
    nativeName: "Español",
    prefix: "ES",
  },
] as const satisfies Language[];
```

</Step>

<Step>
### Test the New Language

Run your application and use the language toggle to switch to the new language:

```bash
npm run start
```

The language toggle component will automatically display the new language option.
</Step>
</Steps>

## Adding New Translation Keys

When you need new translatable text in your application:

<Steps>
<Step>
### Add Keys to All Languages

Update `src/localization/i18n.ts` to include the new key in all language resources:

```ts
i18n.use(initReactI18next).init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: {
        // ... existing keys
        welcomeMessage: "Welcome to the app!",
        settings: "Settings",
        save: "Save",
        cancel: "Cancel",
      },
    },
    "pt-BR": {
      translation: {
        // ... existing keys
        welcomeMessage: "Bem-vindo ao aplicativo!",
        settings: "Configurações",
        save: "Salvar",
        cancel: "Cancelar",
      },
    },
  },
});
```

</Step>

<Step>
### Use the New Keys

Access the new translations in your components:

```tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("settings")}</h1>
      <p>{t("welcomeMessage")}</p>
      <div className="flex gap-2">
        <Button variant="outline">{t("cancel")}</Button>
        <Button>{t("save")}</Button>
      </div>
    </div>
  );
}
```

</Step>
</Steps>

<Callout type="warn">
Always add new translation keys to **all** language resources. If a key is missing, i18next will fall back to the `fallbackLng` (English by default).
</Callout>

## Language Actions

### setAppLanguage

Changes the current language and persists the selection:

```ts
import { setAppLanguage } from "@/actions/language";
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { i18n } = useTranslation();

  const changeToSpanish = () => {
    setAppLanguage("es", i18n);
  };

  return <button onClick={changeToSpanish}>Switch to Spanish</button>;
}
```

This function:

1. Saves the language to localStorage
2. Changes the i18next language
3. Updates the `lang` attribute on the HTML document

### updateAppLanguage

Restores the language from localStorage on app startup. This is called automatically in `App.tsx`:

```tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { updateAppLanguage } from "./actions/language";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    updateAppLanguage(i18n);
  }, [i18n]);

  // ...
}
```

## Language Toggle Component

electron-shadcn includes a `LangToggle` component that displays all available languages:

```tsx
import LangToggle from "@/components/lang-toggle";

export default function Header() {
  return (
    <header>
      <LangToggle />
    </header>
  );
}
```

The component automatically:

- Reads available languages from `langs.ts`
- Highlights the currently selected language
- Persists language changes to localStorage

### Customizing the Toggle

You can create a custom language selector using the same building blocks:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import langs from "@/localization/langs";
import { setAppLanguage } from "@/actions/language";

export default function CustomLangSelector() {
  const { i18n } = useTranslation();

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => setAppLanguage(value, i18n)}
    >
      <SelectTrigger className="w-45">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {langs.map((lang) => (
          <SelectItem key={lang.key} value={lang.key}>
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## Advanced Usage

### Interpolation

Insert dynamic values into translations:

```ts
// In i18n.ts
en: {
  translation: {
    greeting: "Hello, {{name}}!",
    itemCount: "You have {{count}} items",
  },
}
```

```tsx
// In your component
const { t } = useTranslation();

t("greeting", { name: "John" }); // "Hello, John!"
t("itemCount", { count: 5 });    // "You have 5 items"
```

### Pluralization

Handle singular and plural forms:

```ts
// In i18n.ts
en: {
  translation: {
    item_one: "{{count}} item",
    item_other: "{{count}} items",
  },
},
"pt-BR": {
  translation: {
    item_one: "{{count}} item",
    item_other: "{{count}} itens",
  },
}
```

```tsx
t("item", { count: 1 }); // "1 item"
t("item", { count: 5 }); // "5 items"
```

### Nested Translations

Organize translations with nested objects:

```ts
// In i18n.ts
en: {
  translation: {
    nav: {
      home: "Home",
      settings: "Settings",
      about: "About",
    },
    errors: {
      notFound: "Page not found",
      serverError: "Server error occurred",
    },
  },
}
```

```tsx
t("nav.home");         // "Home"
t("errors.notFound");  // "Page not found"
```

## Toggle language component

electron-shadcn already includes a language toggle component that displays all available languages and allows users to switch between them easily.

```
<Card
    href="electron-shadcn/docs/components/language-toggle"
    title="LangToggle Component"
>
    Check out the documentation for the built-in language toggle component
</Card>
```

## Best Practices

- **Use descriptive keys**: Prefer `nav.homeButton` over `btn1`
- **Keep translations organized**: Group related keys together using nested objects
- **Don't hardcode text**: Always use the `t()` function for user-facing text
- **Test all languages**: Verify translations don't break layouts (some languages are longer)
- **Document context**: Add comments for translators if a key's context isn't obvious
- **Handle missing translations**: Set up a fallback language and monitor for missing keys

## Removing a Language

To remove a language from your application:

1. Remove the language object from `src/localization/i18n.ts` resources
2. Remove the language entry from `src/localization/langs.ts`

The language toggle will automatically update to show only the remaining languages.
