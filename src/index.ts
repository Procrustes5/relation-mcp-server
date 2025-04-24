#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod";
import { fetch } from 'undici';

// Relation APIの型定義
interface RelationApiConfig {
  subdomain: string;
  token: string;
}

// Relation APIのベースURL生成関数
const getRelationApiBaseUrl = (config: RelationApiConfig) => {
  return `https://${config.subdomain}.relationapp.jp/api/v2`;
};

// MCPサーバーのインスタンスを作成
const server = new McpServer({
  name: "Relation API Server",
  version: "1.0.0"
});

// APIの設定（環境変数から読み込むなど実際の実装に合わせて変更してください）
const relationApiConfig: RelationApiConfig = {
  subdomain: process.env.RELATION_SUBDOMAIN || '<your-subdomain>',
  token: process.env.RELATION_API_TOKEN || '<your-token>'
};

// Relation APIに対するリクエストを行う関数
async function callRelationApi(
  endpoint: string, 
  method: string = 'GET', 
  data?: Record<string, any>, 
  config: RelationApiConfig = relationApiConfig
) {
  const baseUrl = getRelationApiBaseUrl(config);
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.token}`,
    'Content-Type': 'application/json'
  };
  
  const options: any = {
    method,
    headers
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling Relation API:', error);
    throw error;
  }
}

// APIレスポンスをテキスト形式のMCPレスポンスにフォーマットする
function formatMcpResponse(data: any) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

// ツール登録のテンプレート
server.tool(
  "get_customers",
  "顧客情報を取得します",
  async (extra) => {
    // 仮の実装
    return formatMcpResponse({ customers: [] });
  }
);

// コンタクト検索ツール
const searchCustomersSchema = z.object({
  customer_group_id: z.string().describe("アドレス帳ID"),
  customer_ids: z.array(z.number()).optional().describe("顧客IDの配列"),
  gender_cds: z.array(z.number()).optional().describe("性別コードの配列 (1: 男性、2: 女性、9: 不明)"),
  system_id1s: z.array(z.string()).optional().describe("顧客コードの配列"),
  default_assignees: z.array(z.string()).optional().describe("担当者のメンション名の配列"),
  emails: z.array(z.string()).optional().describe("メールアドレスの配列 (部分一致検索に対応)"),
  tels: z.array(z.string()).optional().describe("電話番号の配列 (部分一致検索に対応)"),
  badge_ids: z.array(z.number()).optional().describe("バッジIDの配列"),
  per_page: z.number().optional().describe("ページごとの件数 (1-50)"),
  page: z.number().optional().describe("ページ番号 (1以上)")
});

server.tool(
  "search_customers",
  searchCustomersSchema.shape,
  async (args: z.infer<typeof searchCustomersSchema>, extra) => {
    const params = new URLSearchParams();
    
    if (args.customer_ids) {
      args.customer_ids.forEach(id => params.append('customer_ids[]', id.toString()));
    }
    
    if (args.gender_cds) {
      args.gender_cds.forEach(code => params.append('gender_cds[]', code.toString()));
    }
    
    if (args.system_id1s) {
      args.system_id1s.forEach(id => params.append('system_id1s[]', id));
    }
    
    if (args.default_assignees) {
      args.default_assignees.forEach(name => params.append('default_assignees[]', name));
    }
    
    if (args.emails) {
      args.emails.forEach(email => params.append('emails[]', email));
    }
    
    if (args.tels) {
      args.tels.forEach(tel => params.append('tels[]', tel));
    }
    
    if (args.badge_ids) {
      args.badge_ids.forEach(id => params.append('badge_ids[]', id.toString()));
    }
    
    if (args.per_page) {
      params.append('per_page', args.per_page.toString());
    }
    
    if (args.page) {
      params.append('page', args.page.toString());
    }
    
    const endpoint = `/customer_groups/${args.customer_group_id}/customers/search?${params.toString()}`;
    
    try {
      const response = await callRelationApi(endpoint);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error searching customers:', error);
      return formatMcpResponse({ error: "Failed to search customers" });
    }
  }
);

// コンタクト登録ツールを追加
server.tool(
  "create_customer",
  {
    customer_group_id: z.string().describe("アドレス帳ID"),
    last_name: z.string().describe("姓"),
    first_name: z.string().optional().describe("名"),
    last_name_kana: z.string().optional().describe("姓（カナ）"),
    first_name_kana: z.string().optional().describe("名（カナ）"),
    company_name: z.string().optional().describe("会社名"),
    memo: z.string().optional().describe("メモ"),
    gender_cd: z.number().optional().describe("性別コード (1: 男性、2: 女性、9: 不明)"),
    birthday: z.string().optional().describe("誕生日 (YYYY-MM-DD形式)"),
    system_id1: z.string().optional().describe("顧客コード"),
    default_assignee: z.string().optional().describe("担当者のメンション名"),
    emails: z.array(z.string()).optional().describe("メールアドレスの配列"),
    tels: z.array(z.string()).optional().describe("電話番号の配列"),
    badge_ids: z.array(z.number()).optional().describe("バッジIDの配列"),
    address: z.object({
      postal_code: z.string().optional().describe("郵便番号"),
      prefecture: z.string().optional().describe("都道府県"),
      address1: z.string().optional().describe("住所1"),
      address2: z.string().optional().describe("住所2")
    }).optional().describe("住所情報")
  },
  async (params: {
    customer_group_id: string;
    last_name: string;
    first_name?: string;
    last_name_kana?: string;
    first_name_kana?: string;
    company_name?: string;
    memo?: string;
    gender_cd?: number;
    birthday?: string;
    system_id1?: string;
    default_assignee?: string;
    emails?: string[];
    tels?: string[];
    badge_ids?: number[];
    address?: {
      postal_code?: string;
      prefecture?: string;
      address1?: string;
      address2?: string;
    };
  }, extra) => {
    const { customer_group_id, ...customerData } = params;
    
    const endpoint = `/customer_groups/${customer_group_id}/customers/create`;
    
    try {
      const response = await callRelationApi(endpoint, 'POST', customerData);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
);

// チケット検索ツール
const searchTicketsSchema = z.object({
  message_box_id: z.string().describe("受信箱ID"),
  ticket_ids: z.array(z.number()).optional().describe("チケットIDの配列"),
  statuses: z.array(z.string()).optional().describe("ステータスの配列 (open, pending, closed)"),
  subject_query: z.string().optional().describe("件名の検索クエリ"),
  body_query: z.string().optional().describe("本文の検索クエリ"),
  channel_ids: z.array(z.number()).optional().describe("チャネルIDの配列"),
  assignee_ids: z.array(z.number()).optional().describe("担当者IDの配列"),
  is_snoozed: z.boolean().optional().describe("スヌーズ中かどうか"),
  ticket_number_query: z.string().optional().describe("チケット番号の検索クエリ"),
  customer_ids: z.array(z.number()).optional().describe("顧客IDの配列"),
  snooze_expire_from: z.string().optional().describe("スヌーズ期限の検索開始日時 (ISO 8601形式)"),
  snooze_expire_to: z.string().optional().describe("スヌーズ期限の検索終了日時 (ISO 8601形式)"),
  created_from: z.string().optional().describe("作成日時の検索開始日時 (ISO 8601形式)"),
  created_to: z.string().optional().describe("作成日時の検索終了日時 (ISO 8601形式)"),
  last_updated_from: z.string().optional().describe("更新日時の検索開始日時 (ISO 8601形式)"),
  last_updated_to: z.string().optional().describe("更新日時の検索終了日時 (ISO 8601形式)"),
  label_ids: z.array(z.number()).optional().describe("ラベルIDの配列"),
  pending_reason_ids: z.array(z.number()).optional().describe("保留理由IDの配列"),
  per_page: z.number().optional().describe("ページごとの件数 (1-100)"),
  page: z.number().optional().describe("ページ番号 (1以上)")
});

// チケット検索ツールの修正
server.tool(
  "search_tickets",
  searchTicketsSchema.shape,
  async (args: z.infer<typeof searchTicketsSchema>, extra) => {
    const { message_box_id, ...searchParams } = args;
    
    // 新しいオブジェクトを作成して値をコピー
    const requestParams: Record<string, any> = { ...searchParams };
    
    // status_cdsパラメータ名の修正（statusesからstatus_cdsに）
    if (searchParams.statuses) {
      requestParams.status_cds = searchParams.statuses;
      delete requestParams.statuses;
    }
    
    // POSTリクエストのデータとして送信
    const endpoint = `/${message_box_id}/tickets/search`;
    
    try {
      const response = await callRelationApi(endpoint, 'POST', requestParams);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error searching tickets:', error);
      return formatMcpResponse({ error: "Failed to search tickets" });
    }
  }
);

// テンプレート検索ツール
const searchTemplatesSchema = z.object({
  message_box_id: z.string().describe("受信箱ID"),
  query: z.string().optional().describe("検索クエリ"),
  tags: z.array(z.string()).optional().describe("タグの配列"),
  per_page: z.number().optional().describe("ページごとの件数"),
  page: z.number().optional().describe("ページ番号")
});

server.tool(
  "search_templates",
  searchTemplatesSchema.shape,
  async (args: z.infer<typeof searchTemplatesSchema>, extra) => {
    const queryParams = new URLSearchParams();
    
    if (args.query) {
      queryParams.append('query', args.query);
    }
    
    if (args.tags) {
      args.tags.forEach(tag => queryParams.append('tags[]', tag));
    }
    
    if (args.per_page) {
      queryParams.append('per_page', args.per_page.toString());
    }
    
    if (args.page) {
      queryParams.append('page', args.page.toString());
    }
    
    const endpoint = `/${args.message_box_id}/templates/search?${queryParams.toString()}`;
    
    try {
      const response = await callRelationApi(endpoint);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error searching templates:', error);
      return formatMcpResponse({ error: "Failed to search templates" });
    }
  }
);

// メール送信ツール
const sendEmailSchema = z.object({
  message_box_id: z.string().describe("受信箱ID"),
  customer_id: z.number().describe("顧客ID"),
  mail_account_id: z.number().describe("送信メールアカウントID"),
  to: z.array(z.string()).describe("宛先メールアドレスの配列"),
  cc: z.array(z.string()).optional().describe("CCメールアドレスの配列"),
  bcc: z.array(z.string()).optional().describe("BCCメールアドレスの配列"),
  subject: z.string().describe("件名"),
  body: z.string().describe("本文"),
  reply_to: z.string().optional().describe("Reply-Toメールアドレス")
});

server.tool(
  "send_email",
  sendEmailSchema.shape,
  async (args: z.infer<typeof sendEmailSchema>, extra) => {
    const { message_box_id, ...mailData } = args;
    
    const endpoint = `/${message_box_id}/mails/create`;
    
    try {
      const response = await callRelationApi(endpoint, 'POST', mailData);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error sending email:', error);
      return formatMcpResponse({ error: "Failed to send email" });
    }
  }
);

// チケット更新ツール
const updateTicketSchema = z.object({
  message_box_id: z.string().describe("受信箱ID"),
  ticket_id: z.number().describe("チケットID"),
  status: z.enum(["open", "pending", "closed"]).optional().describe("ステータス"),
  subject: z.string().optional().describe("件名"),
  assignee_id: z.number().optional().describe("担当者ID"),
  is_snoozed: z.boolean().optional().describe("スヌーズ中かどうか"),
  snooze_expire_at: z.string().optional().describe("スヌーズ期限 (ISO 8601形式)"),
  snooze_notification_user_names: z.array(z.string()).optional().describe("スヌーズ復帰時に通知するユーザのメンション名"),
  pending_reason_id: z.number().optional().describe("保留理由ID"),
  label_ids: z.array(z.number()).optional().describe("ラベルIDの配列")
});

server.tool(
  "update_ticket",
  updateTicketSchema.shape,
  async (args: z.infer<typeof updateTicketSchema>, extra) => {
    const { message_box_id, ticket_id, ...updateData } = args;
    
    const endpoint = `/${message_box_id}/tickets/${ticket_id}`;
    
    try {
      const response = await callRelationApi(endpoint, 'PATCH', updateData);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error updating ticket:', error);
      return formatMcpResponse({ error: "Failed to update ticket" });
    }
  }
);

// ラベル一覧取得ツール
const getLabelsSchema = z.object({
  message_box_id: z.string().describe("受信箱ID")
});

server.tool(
  "get_labels",
  getLabelsSchema.shape,
  async (args: z.infer<typeof getLabelsSchema>, extra) => {
    const endpoint = `/${args.message_box_id}/labels`;
    
    try {
      const response = await callRelationApi(endpoint);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error getting labels:', error);
      return formatMcpResponse({ error: "Failed to get labels" });
    }
  }
);

// ユーザー一覧取得ツール
server.tool(
  "get_users",
  "ユーザー一覧を取得します",
  async (extra) => {
    const endpoint = `/users`;
    
    try {
      const response = await callRelationApi(endpoint);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error getting users:', error);
      return formatMcpResponse({ error: "Failed to get users" });
    }
  }
);

// 受信箱一覧取得ツール
server.tool(
  "get_message_boxes",
  "受信箱一覧を取得します",
  async (extra) => {
    const endpoint = `/message_boxes`;
    
    try {
      const response = await callRelationApi(endpoint);
      return formatMcpResponse(response);
    } catch (error) {
      console.error('Error getting message boxes:', error);
      return formatMcpResponse({ error: "Failed to get message boxes" });
    }
  }
);

// サーバーを標準入出力に接続して起動
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);