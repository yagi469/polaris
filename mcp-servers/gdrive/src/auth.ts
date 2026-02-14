import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { exec } from "child_process";

// フルアクセス（読み書き）スコープ
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

// --- パス解決 ---

export function getCredentialsDir(): string {
  return (
    process.env.GDRIVE_MCP_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".gdrive-mcp")
  );
}

function getOAuthKeysPath(): string {
  return path.join(getCredentialsDir(), "gcp-oauth.keys.json");
}

function getTokenPath(): string {
  return path.join(getCredentialsDir(), "tokens.json");
}

// --- OAuth クライアント生成 ---

interface OAuthKeysFile {
  installed?: { client_id: string; client_secret: string };
  web?: { client_id: string; client_secret: string };
}

function loadOAuthKeys() {
  const keysPath = getOAuthKeysPath();
  if (!fs.existsSync(keysPath)) {
    throw new Error(
      `OAuth keys file not found: ${keysPath}\n` +
      "GCP Console からダウンロードした JSON を gcp-oauth.keys.json にリネームして配置してください。"
    );
  }
  const keys: OAuthKeysFile = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  const config = keys.installed || keys.web;
  if (!config) {
    throw new Error("Invalid gcp-oauth.keys.json: 'installed' or 'web' key が必要です");
  }
  return config;
}

function createOAuth2Client() {
  const { client_id, client_secret } = loadOAuthKeys();
  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

// --- 認証済みクライアント取得 ---

export async function getAuthenticatedClient() {
  const client = createOAuth2Client();
  const tokenPath = getTokenPath();

  if (!fs.existsSync(tokenPath)) {
    throw new Error(
      `認証トークンが見つかりません: ${tokenPath}\n` +
      "先に認証を実行してください: node dist/index.js auth"
    );
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
  client.setCredentials(tokens);

  // トークン自動更新時にファイルへ保存
  client.on("tokens", (newTokens) => {
    const existing = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    const merged = { ...existing, ...newTokens };
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
    console.error("[gdrive-mcp] Tokens refreshed and saved.");
  });

  return client;
}

// --- 初回認証フロー ---

export async function authenticate(): Promise<void> {
  const client = createOAuth2Client();
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("ブラウザで Google 認証を開始します...");
  console.log(`URL: ${authUrl}\n`);

  return new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400);
        res.end(`認証エラー: ${error}`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end("認可コードが取得できませんでした。");
        server.close();
        reject(new Error("No authorization code received"));
        return;
      }

      try {
        const { tokens } = await client.getToken(code);
        const tokenPath = getTokenPath();
        const dir = path.dirname(tokenPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>✅ 認証成功！</h1><p>このタブを閉じてください。</p>" +
          "<script>setTimeout(() => window.close(), 2000)</script>"
        );
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end("トークン取得に失敗しました。");
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`コールバックサーバー起動: http://localhost:${REDIRECT_PORT}`);
      openBrowser(authUrl);
    });
  });
}

// --- ブラウザを開く ---

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "win32") {
    // Windows: start コマンドは URL に & が含まれる場合に備えて "" でタイトルを指定
    exec(`start "" "${url}"`);
  } else if (platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}
