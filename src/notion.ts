import { Client } from "@notionhq/client";
import { env } from "./lib/env";
import type { EmailRecord } from "./types";

const notion = new Client({ auth: env("NOTION_TOKEN") });
const databaseId = env("NOTION_DATABASE_ID");

const textBlock = (content: string) => [
    {
        text: {
            content,
        },
    },
];

export async function createTask(email: EmailRecord) {
    const summary = email.summary ?? email.snippet ?? "";

    return notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
            Title: {
                title: textBlock(email.subject || "(No subject)"),
            },
            Email: {
                rich_text: textBlock(email.snippet ?? ""),
            },
            From: {
                rich_text: textBlock(email.from ?? ""),
            },
            Processed: {
                checkbox: false,
            },
            ...(summary.trim()
                ? {
                      Summary: {
                          rich_text: textBlock(summary),
                      },
                  }
                : {}),
        },
    });
}