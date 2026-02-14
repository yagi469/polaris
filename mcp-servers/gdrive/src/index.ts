#!/usr/bin/env node

/**
 * Google Drive MCP Server
 *
 * 使い方:
 *   node dist/index.js auth    - 初回認証（ブラウザが開きます）
 *   node dist/index.js         - MCP サーバー起動（stdio モード）
 */

import { authenticate, getCredentialsDir } from "./auth.js";
import { startServer } from "./server.js";

const command = process.argv[2];

if (command === "auth") {
  console.log("=== Google Drive MCP Server - 認証 ===");
  console.log(`認証情報ディレクトリ: ${getCredentialsDir()}\n`);

  authenticate()
    .then(() => {
      console.log("\n✅ 認証が完了しました！");
      console.log("MCP サーバーを起動できます。");
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n❌ 認証に失敗しました:", err.message);
      process.exit(1);
    });
} else {
  startServer().catch((err) => {
    console.error("[gdrive-mcp] Failed to start:", err.message);
    process.exit(1);
  });
}
