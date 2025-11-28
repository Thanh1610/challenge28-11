import fs from "node:fs";
import path, { resolve } from "node:path";
import readline from "node:readline";
import { google, gmail_v1 } from "googleapis";
import type { EmailRecord } from "./types";
import { env } from "./lib/env";

//https://developers.google.com/workspace/gmail/api/auth/scopes
//https://developers.google.com/workspace/gmail/api/auth/oauth-scopes
//Read all resources and their metadata—no write operations.
const TOKEN_PATH = path.resolve(process.cwd(), "token.json");
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function requestNewToken(oAuthClient: gmail_v1.Options["auth"]) {
    const client = oAuthClient as any;
    const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize app via:", authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const code: string = await new Promise((resolve) => {
        rl.question("Enter code: ", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("Token saved to", TOKEN_PATH);
}

async function getAuthorizedClient(): Promise<gmail_v1.Gmail> {
    const oAuth2Client = new google.auth.OAuth2(
        env("GMAIL_CLIENT_ID"),
        env("GMAIL_CLIENT_SECRET"),
        env("GMAIL_REDIRECT_URI")
    );

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
        oAuth2Client.setCredentials(token);
    } else {
        await requestNewToken(oAuth2Client);
    }

    return google.gmail({ version: "v1", auth: oAuth2Client });
}

const getHeader = (
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    name: string
) =>
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    "";

export async function getStarredEmails(limit = 10): Promise<EmailRecord[]> {
    const gmail = await getAuthorizedClient();
    const list = await gmail.users.messages.list({
        userId: "me",
        q: "is:starred",
        maxResults: limit,
    });

    if (!list.data.messages?.length) return [];

    const results: EmailRecord[] = [];

    for (const message of list.data.messages) {
        if (!message.id) continue;

        const detail = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "metadata",
            metadataHeaders: ["Subject", "From"],
        });

        const headers = detail.data.payload?.headers;
        results.push({
            id: message.id,
            subject: getHeader(headers, "Subject"),
            from: getHeader(headers, "From"),
            snippet: detail.data.snippet ?? "",
        });
    }

    return results;
}
