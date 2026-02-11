# 01: Project Setup — Next.js 16 × Tailwind CSS v4 × shadcn/ui でモダンなフロントエンド基盤を構築する

> **Polaris** プロジェクトの第1回目として、2026年最新のフロントエンドスタックでプロジェクトの土台を構築しました。本記事ではセットアップの全工程と、採用した各技術の選定理由を解説します。

---

## 📦 技術スタック概要

| カテゴリ | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (App Router) | 16.1.1 |
| 言語 | TypeScript | 5.x |
| UIライブラリ | React | 19.2.3 |
| CSS | Tailwind CSS v4 | 4.x |
| コンポーネント | shadcn/ui (new-york style) | 3.8.4 |
| テーマ管理 | next-themes | 0.4.6 |
| アイコン | Lucide React | 0.563.0 |
| フォント | Inter / IBM Plex Mono (Google Fonts) | — |
| リンター | ESLint (Flat Config) | 9.x |

---

## 🚀 Step 1: Next.js プロジェクトの作成

`create-next-app` を使って Next.js 16 のプロジェクトを生成しました。

```bash
npx create-next-app@latest polaris
```

生成時のオプション選択：

- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router (`src/` ディレクトリ使用)
- ❌ Turbopack (必要に応じて後から有効化)

### なぜ Next.js 16 なのか？

Next.js 16 は React 19 をフルサポートし、Server Components / Server Actions がさらに安定しました。App Router をデフォルトとすることで、ファイルベースのルーティングとレイアウトのネストが直感的に行えます。

---

## 📂 Step 2: ディレクトリ構成

生成後のプロジェクト構成は以下の通りです。

```
polaris/
├── public/                  # 静的アセット
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/
│   │   ├── globals.css      # グローバルスタイル & デザイントークン
│   │   ├── layout.tsx       # ルートレイアウト
│   │   ├── page.tsx         # トップページ
│   │   └── favicon.ico
│   ├── components/
│   │   ├── theme-provider.tsx   # ダークモードプロバイダー
│   │   └── ui/                  # shadcn/ui コンポーネント群 (56個)
│   ├── hooks/
│   │   └── use-mobile.ts    # モバイル判定カスタムフック
│   └── lib/
│       └── utils.ts         # ユーティリティ (cn 関数)
├── components.json          # shadcn/ui 設定
├── eslint.config.mjs        # ESLint Flat Config
├── next.config.ts           # Next.js 設定
├── postcss.config.mjs       # PostCSS (Tailwind CSS v4)
├── tsconfig.json            # TypeScript 設定
└── package.json
```

`src/` ディレクトリを採用することで、設定ファイル群とアプリケーションコードを明確に分離しています。

---

## 🎨 Step 3: Tailwind CSS v4 のセットアップ

Tailwind CSS v4 は従来の `tailwind.config.js` を廃止し、**CSS ファーストの設定方式**に移行しました。

### PostCSS 設定

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

v4 では `tailwindcss` プラグインではなく `@tailwindcss/postcss` を使用します。

### グローバルCSS (`globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
```

#### ポイント解説

- **`@import "tailwindcss"`**: v4 ではこの1行で Tailwind のすべてのレイヤー (base, components, utilities) がインポートされます。従来の `@tailwind base; @tailwind components; @tailwind utilities;` は不要です。
- **`@import "tw-animate-css"`**: アニメーションユーティリティを追加するプラグイン。
- **`@custom-variant dark`**: ダークモードのカスタムバリアントを定義。`next-themes` のクラスベースのダークモード (`class="dark"`) と連携します。

---

## 🎭 Step 4: デザイントークン (カラーシステム)

`globals.css` 内の `@theme inline` ブロックと CSS カスタムプロパティで、アプリケーション全体のデザイントークンを定義しています。

### テーマトークンの橋渡し

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-plex-mono);
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-ring: var(--ring);
  /* ... 他のトークン */
}
```

`@theme inline` は Tailwind CSS v4 の新機能で、CSS カスタムプロパティを Tailwind のユーティリティクラス (`bg-background`, `text-foreground` など) として使えるようにするブリッジです。

### ライト/ダークモードのカラー定義

カラーは **OKLCH 色空間** を使用して定義しています。

```css
:root {
  --background: oklch(0.2925 0.0157 264.3);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --ring: oklch(0.6562 0.1826 262.74);
  /* ... */
}

.dark {
  --background: oklch(0.2925 0.0157 264.3);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --ring: oklch(0.6562 0.1826 262.74);
  /* ... */
}
```

#### なぜ OKLCH なのか？

- **人間の知覚に基づいた色空間**: 従来の HSL と異なり、知覚的に均一な明度変化を実現します。
- **広い色域**: P3 ディスプレイなどの広色域モニターに対応可能。
- **shadcn/ui v3 のデフォルト**: 最新の shadcn/ui は OKLCH をデフォルトで採用しています。

### セマンティックカラー設計

カラーシステムは以下のセマンティックな構造を持っています：

| トークン | 用途 |
|---|---|
| `background` / `foreground` | ページ全体の背景と文字色 |
| `card` / `card-foreground` | カードコンポーネントの背景と文字色 |
| `primary` / `primary-foreground` | 主要アクション (ボタンなど) |
| `secondary` / `secondary-foreground` | 補助的なアクション |
| `muted` / `muted-foreground` | 控えめな要素 (プレースホルダーなど) |
| `accent` / `accent-foreground` | アクセントカラー (ホバーなど) |
| `destructive` | 削除・危険なアクション |
| `border` / `input` / `ring` | ボーダー、入力フィールド、フォーカスリング |
| `chart-1` 〜 `chart-5` | グラフ・チャート用のカラーパレット |
| `sidebar-*` | サイドバー専用のカラーセット |

---

## 🔤 Step 5: フォントの設定

Google Fonts から2つのフォントファミリーをインポートし、`next/font` で最適化しています。

```tsx
// src/app/layout.tsx
import { IBM_Plex_Mono, Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
```

| フォント | 用途 | CSS変数 |
|---|---|---|
| **Inter** | 本文・UI テキスト (`--font-sans`) | `--font-inter` |
| **IBM Plex Mono** | コード・等幅テキスト (`--font-mono`) | `--font-plex-mono` |

`next/font` を使うことで、フォントはビルド時に最適化され、**FOUT (Flash of Unstyled Text) を防止**できます。また、外部への追加リクエストも発生しません。

---

## 🌙 Step 6: ダークモードの実装

`next-themes` を使用したクラスベースのダークモード切り替えを実装しています。

```tsx
// src/components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### ルートレイアウトでの適用

```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plexMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 設定のポイント

- **`attribute="class"`**: `<html>` タグに `dark` クラスを付与する方式。Tailwind の `dark:` バリアントと連携。
- **`defaultTheme="dark"`**: デフォルトでダークモードを適用。
- **`enableSystem`**: OS のダークモード設定に自動追従可能。
- **`disableTransitionOnChange`**: テーマ切替時のちらつきを防止。
- **`suppressHydrationWarning`**: サーバーとクライアントの `class` 属性の不一致による警告を抑制。

---

## 🧩 Step 7: shadcn/ui のセットアップ

shadcn/ui はコンポーネントライブラリではなく、**コピー＆ペースト方式のコンポーネントコレクション**です。

### 初期化

```bash
npx shadcn@latest init
```

### 設定ファイル (`components.json`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

#### 設定のポイント

- **`style: "new-york"`**: より洗練されたデザインのバリアント。
- **`rsc: true`**: React Server Components に対応。
- **`baseColor: "neutral"`**: 中立的なカラーベース。
- **`iconLibrary: "lucide"`**: 軽量でモダンなアイコンライブラリ。

### インストール済みコンポーネント (56個)

プロジェクトには以下のコンポーネントが事前インストールされています：

<details>
<summary>コンポーネント一覧 (クリックで展開)</summary>

| コンポーネント | ファイル |
|---|---|
| Accordion | `accordion.tsx` |
| Alert | `alert.tsx` |
| Alert Dialog | `alert-dialog.tsx` |
| Aspect Ratio | `aspect-ratio.tsx` |
| Avatar | `avatar.tsx` |
| Badge | `badge.tsx` |
| Breadcrumb | `breadcrumb.tsx` |
| Button | `button.tsx` |
| Button Group | `button-group.tsx` |
| Calendar | `calendar.tsx` |
| Card | `card.tsx` |
| Carousel | `carousel.tsx` |
| Chart | `chart.tsx` |
| Checkbox | `checkbox.tsx` |
| Collapsible | `collapsible.tsx` |
| Combobox | `combobox.tsx` |
| Command | `command.tsx` |
| Context Menu | `context-menu.tsx` |
| Dialog | `dialog.tsx` |
| Direction | `direction.tsx` |
| Drawer | `drawer.tsx` |
| Dropdown Menu | `dropdown-menu.tsx` |
| Empty | `empty.tsx` |
| Field | `field.tsx` |
| Form | `form.tsx` |
| Hover Card | `hover-card.tsx` |
| Input | `input.tsx` |
| Input Group | `input-group.tsx` |
| Input OTP | `input-otp.tsx` |
| Item | `item.tsx` |
| Kbd | `kbd.tsx` |
| Label | `label.tsx` |
| Menubar | `menubar.tsx` |
| Native Select | `native-select.tsx` |
| Navigation Menu | `navigation-menu.tsx` |
| Pagination | `pagination.tsx` |
| Popover | `popover.tsx` |
| Progress | `progress.tsx` |
| Radio Group | `radio-group.tsx` |
| Resizable | `resizable.tsx` |
| Scroll Area | `scroll-area.tsx` |
| Select | `select.tsx` |
| Separator | `separator.tsx` |
| Sheet | `sheet.tsx` |
| Sidebar | `sidebar.tsx` |
| Skeleton | `skeleton.tsx` |
| Slider | `slider.tsx` |
| Sonner | `sonner.tsx` |
| Spinner | `spinner.tsx` |
| Switch | `switch.tsx` |
| Table | `table.tsx` |
| Tabs | `tabs.tsx` |
| Textarea | `textarea.tsx` |
| Toggle | `toggle.tsx` |
| Toggle Group | `toggle-group.tsx` |
| Tooltip | `tooltip.tsx` |

</details>

---

## 🛠️ Step 8: ユーティリティとフック

### `cn()` ユーティリティ関数

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`clsx` で条件付きクラスを結合し、`tailwind-merge` で重複するTailwindクラスをインテリジェントにマージします。shadcn/ui の全コンポーネントで使用される核心的なユーティリティです。

### `useIsMobile()` カスタムフック

```typescript
// src/hooks/use-mobile.ts
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```

`window.matchMedia` を使ったレスポンシブ対応のフック。CSS メディアクエリと同じブレークポイントで JavaScript 側でもレイアウト分岐が可能です。

---

## ⚙️ Step 9: TypeScript と ESLint の設定

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- **`strict: true`**: 厳格な型チェックを有効化。
- **`moduleResolution: "bundler"`**: バンドラーモードで最新のモジュール解決。
- **`paths`**: `@/` エイリアスで `src/` からの絶対パスインポートを実現。

### ESLint (Flat Config)

```javascript
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
```

ESLint 9 の **Flat Config** 形式を採用。Next.js の Core Web Vitals ルールと TypeScript ルールを統合しています。

---

## 🎯 Step 10: ベーススタイルとカスタマイズ

### ベースレイヤーのスタイル

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground select-none;
  }
}
```

- すべての要素にデザイントークンベースのボーダーとアウトラインを適用。
- body にはテキスト選択を無効化 (`select-none`) — アプリケーション的なUIを意識した設計。

### カーソルスタイル

```css
@layer base {
  button:not([disabled]),
  [role="button"]:not([disabled]) {
    cursor: pointer;
  }
}
```

無効化されていないボタンに `cursor: pointer` を自動適用。UX の細かな配慮です。

### カスタムアニメーション

```css
@theme inline {
  --animate-cell-ripple: cell-ripple var(--duration, 200ms) ease-out none 1 var(--delay, 0ms);

  @keyframes cell-ripple {
    0%   { opacity: 0.4; }
    50%  { opacity: 0.8; }
    100% { opacity: 0.4; }
  }
}
```

テーブルセルなどで使用するリップルアニメーションを定義。`--duration` と `--delay` の CSS 変数で動的にカスタマイズ可能です。

### スクロールバーのカスタマイズ

```css
::-webkit-scrollbar {
  @apply w-2.5 h-2.5;
}

::-webkit-scrollbar-track {
  @apply bg-transparent;
}

::-webkit-scrollbar-thumb {
  @apply rounded-full bg-border border border-transparent border-solid bg-clip-padding;
}
```

Webkit系ブラウザでスクロールバーをカスタマイズ。ミニマルで丸みのあるデザインに統一しています。

---

## 📋 主要な依存パッケージの役割

| パッケージ | 用途 |
|---|---|
| `next` | フレームワーク本体 |
| `react` / `react-dom` | UIライブラリ |
| `tailwindcss` / `@tailwindcss/postcss` | ユーティリティファーストCSS |
| `tw-animate-css` | Tailwind 用アニメーション拡張 |
| `next-themes` | テーマ (ダークモード) 管理 |
| `lucide-react` | アイコン |
| `class-variance-authority` | コンポーネントのバリアント管理 |
| `clsx` / `tailwind-merge` | クラス名のマージユーティリティ |
| `radix-ui` / `@base-ui/react` | ヘッドレスUIプリミティブ |
| `react-hook-form` / `@hookform/resolvers` | フォーム管理 |
| `zod` | スキーマバリデーション |
| `date-fns` / `react-day-picker` | 日付処理・カレンダー |
| `recharts` | グラフ・チャート |
| `embla-carousel-react` | カルーセル |
| `sonner` | トースト通知 |
| `vaul` | ドロワーコンポーネント |
| `react-resizable-panels` | リサイズ可能パネル |
| `input-otp` | ワンタイムパスワード入力 |
| `cmdk` | コマンドパレット |

---

## 🏃 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で開発サーバーが起動します。ホットリロード対応で、ファイル保存時に即座に変更が反映されます。

---

## 📝 まとめ

今回の Project Setup では、以下の基盤を構築しました：

1. **Next.js 16 (App Router)** — 最新のサーバーコンポーネント対応フレームワーク
2. **Tailwind CSS v4** — CSS ファーストの新しい設定方式
3. **shadcn/ui (new-york)** — 56個の高品質UIコンポーネント
4. **OKLCH カラーシステム** — 知覚的に均一なダーク/ライトテーマ
5. **next-themes** — スムーズなダークモード切替
6. **TypeScript (strict)** + **ESLint (Flat Config)** — 堅牢なコード品質管理

これらの土台の上に、今後の機能開発を進めていきます。

---

*次回: 02 では、この基盤を活かしたページ構築に取り組みます。*
