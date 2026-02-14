import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { google, drive_v3 } from "googleapis";
import { z } from "zod";
import { Readable } from "stream";
import { getAuthenticatedClient } from "./auth.js";

let drive: drive_v3.Drive;

// ファイル情報の標準フィールド
const FILE_FIELDS = "id, name, mimeType, modifiedTime, size, webViewLink, parents";
const LIST_FIELDS = `files(${FILE_FIELDS})`;

// Google Workspace MIME types
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDE = "application/vnd.google-apps.presentation";
const GOOGLE_FOLDER = "application/vnd.google-apps.folder";

export async function startServer() {
  // Drive クライアント初期化
  const auth = await getAuthenticatedClient();
  drive = google.drive({ version: "v3", auth });

  const server = new McpServer({
    name: "gdrive",
    version: "1.0.0",
  });

  // ============================================================
  //  READ TOOLS
  // ============================================================

  server.tool(
    "gdrive_search",
    "Google Drive 内のファイルを検索します。Google Drive のクエリ構文が使えます。",
    {
      query: z.string().describe("検索クエリ（例: \"name contains 'report'\" や \"fullText contains 'keyword'\"）"),
      pageSize: z.number().optional().default(20).describe("取得件数（デフォルト: 20、最大: 100）"),
    },
    async ({ query, pageSize }) => {
      const res = await drive.files.list({
        q: query,
        pageSize: Math.min(pageSize, 100),
        fields: `nextPageToken, ${LIST_FIELDS}`,
        orderBy: "modifiedTime desc",
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { files: res.data.files || [], count: res.data.files?.length || 0 },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_list",
    "指定フォルダ内のファイル・フォルダ一覧を取得します。",
    {
      folderId: z.string().optional().default("root").describe("フォルダID（デフォルト: root = マイドライブ直下）"),
      pageSize: z.number().optional().default(30).describe("取得件数"),
    },
    async ({ folderId, pageSize }) => {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: Math.min(pageSize, 100),
        fields: `nextPageToken, ${LIST_FIELDS}`,
        orderBy: "folder, name",
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { files: res.data.files || [], count: res.data.files?.length || 0 },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_read",
    "ファイルの内容を読み取ります。Google Docs → Markdown、Sheets → CSV、Slides → テキスト に自動変換します。",
    {
      fileId: z.string().describe("ファイルID"),
    },
    async ({ fileId }) => {
      // メタデータ取得
      const meta = await drive.files.get({
        fileId,
        fields: FILE_FIELDS,
      });

      const mimeType = meta.data.mimeType || "";
      const name = meta.data.name || "unknown";
      let content: string;

      // Google Workspace ファイルは export
      if (mimeType === GOOGLE_DOC) {
        const res = await drive.files.export({ fileId, mimeType: "text/markdown" });
        content = String(res.data);
      } else if (mimeType === GOOGLE_SHEET) {
        const res = await drive.files.export({ fileId, mimeType: "text/csv" });
        content = String(res.data);
      } else if (mimeType === GOOGLE_SLIDE) {
        const res = await drive.files.export({ fileId, mimeType: "text/plain" });
        content = String(res.data);
      } else {
        // 通常ファイル → ダウンロード
        const res = await drive.files.get(
          { fileId, alt: "media" },
          { responseType: "text" }
        );
        content = String(res.data);
      }

      return {
        content: [
          {
            type: "text",
            text: `--- File: ${name} (${mimeType}) ---\n\n${content}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_get_metadata",
    "ファイルやフォルダのメタデータ（名前、サイズ、更新日時、共有設定など）を取得します。",
    {
      fileId: z.string().describe("ファイルID"),
    },
    async ({ fileId }) => {
      const res = await drive.files.get({
        fileId,
        fields: "id, name, mimeType, modifiedTime, createdTime, size, webViewLink, parents, shared, sharingUser, owners, permissions",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    }
  );

  // ============================================================
  //  WRITE TOOLS
  // ============================================================

  server.tool(
    "gdrive_create_file",
    "新しいファイルを作成します。Google Docs/Sheets/Slides として作成することもできます。",
    {
      name: z.string().describe("ファイル名"),
      content: z.string().describe("ファイルの内容（テキスト、Markdown、CSV など）"),
      folderId: z.string().optional().describe("作成先フォルダID（省略時: マイドライブ直下）"),
      convertTo: z
        .enum(["document", "spreadsheet", "presentation"])
        .optional()
        .describe("Google Workspace 形式に変換して作成する場合に指定（document=Docs, spreadsheet=Sheets, presentation=Slides）"),
      mimeType: z.string().optional().default("text/plain").describe("アップロードするコンテンツの MIME タイプ（デフォルト: text/plain）"),
    },
    async ({ name, content, folderId, convertTo, mimeType }) => {
      const googleMimeTypes: Record<string, string> = {
        document: GOOGLE_DOC,
        spreadsheet: GOOGLE_SHEET,
        presentation: GOOGLE_SLIDE,
      };

      const requestBody: drive_v3.Schema$File = {
        name,
        parents: folderId ? [folderId] : undefined,
        mimeType: convertTo ? googleMimeTypes[convertTo] : undefined,
      };

      const res = await drive.files.create({
        requestBody,
        media: {
          mimeType,
          body: Readable.from([content]),
        },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ ファイルを作成しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_create_folder",
    "新しいフォルダを作成します。",
    {
      name: z.string().describe("フォルダ名"),
      parentId: z.string().optional().describe("親フォルダID（省略時: マイドライブ直下）"),
    },
    async ({ name, parentId }) => {
      const res = await drive.files.create({
        requestBody: {
          name,
          mimeType: GOOGLE_FOLDER,
          parents: parentId ? [parentId] : undefined,
        },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `📁 フォルダを作成しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_update_file",
    "既存ファイルの内容を更新（上書き）します。",
    {
      fileId: z.string().describe("更新するファイルのID"),
      content: z.string().describe("新しいファイル内容"),
      mimeType: z.string().optional().default("text/plain").describe("コンテンツの MIME タイプ"),
    },
    async ({ fileId, content, mimeType }) => {
      const res = await drive.files.update({
        fileId,
        media: {
          mimeType,
          body: Readable.from([content]),
        },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ ファイルを更新しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_rename",
    "ファイルまたはフォルダの名前を変更します。",
    {
      fileId: z.string().describe("ファイル/フォルダのID"),
      newName: z.string().describe("新しい名前"),
    },
    async ({ fileId, newName }) => {
      const res = await drive.files.update({
        fileId,
        requestBody: { name: newName },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ 名前を変更しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_move",
    "ファイルまたはフォルダを別のフォルダに移動します。",
    {
      fileId: z.string().describe("移動するファイル/フォルダのID"),
      destinationFolderId: z.string().describe("移動先フォルダのID"),
    },
    async ({ fileId, destinationFolderId }) => {
      // 現在の親を取得
      const file = await drive.files.get({
        fileId,
        fields: "parents",
      });
      const previousParents = (file.data.parents || []).join(",");

      const res = await drive.files.update({
        fileId,
        addParents: destinationFolderId,
        removeParents: previousParents,
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ ファイルを移動しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_copy",
    "ファイルをコピーします。",
    {
      fileId: z.string().describe("コピー元ファイルのID"),
      newName: z.string().optional().describe("コピー先のファイル名（省略時: 元ファイル名のコピー）"),
      folderId: z.string().optional().describe("コピー先フォルダID"),
    },
    async ({ fileId, newName, folderId }) => {
      const res = await drive.files.copy({
        fileId,
        requestBody: {
          name: newName || undefined,
          parents: folderId ? [folderId] : undefined,
        },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ ファイルをコピーしました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_delete",
    "ファイルまたはフォルダをゴミ箱に移動します。",
    {
      fileId: z.string().describe("削除するファイル/フォルダのID"),
    },
    async ({ fileId }) => {
      // 完全削除ではなくゴミ箱へ移動（安全）
      const res = await drive.files.update({
        fileId,
        requestBody: { trashed: true },
        fields: FILE_FIELDS,
      });

      return {
        content: [
          {
            type: "text",
            text: `🗑️ ゴミ箱に移動しました:\n${JSON.stringify(res.data, null, 2)}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gdrive_share",
    "ファイルまたはフォルダの共有設定を変更します。",
    {
      fileId: z.string().describe("共有するファイル/フォルダのID"),
      email: z.string().describe("共有先のメールアドレス"),
      role: z
        .enum(["reader", "commenter", "writer", "organizer"])
        .default("reader")
        .describe("権限（reader=閲覧, commenter=コメント, writer=編集, organizer=管理者）"),
      sendNotification: z.boolean().optional().default(true).describe("通知メールを送るか"),
    },
    async ({ fileId, email, role, sendNotification }) => {
      const res = await drive.permissions.create({
        fileId,
        sendNotificationEmail: sendNotification,
        requestBody: {
          type: "user",
          role,
          emailAddress: email,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ 共有設定を追加しました:\n` +
              `  ファイル: ${fileId}\n` +
              `  共有先: ${email}\n` +
              `  権限: ${role}\n` +
              `  Permission ID: ${res.data.id}`,
          },
        ],
      };
    }
  );

  // ============================================================
  //  サーバー起動
  // ============================================================

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[gdrive-mcp] Server started successfully.");
}
