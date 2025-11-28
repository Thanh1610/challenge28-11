interface EmailRecord {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    summary?: string;
}

export type { EmailRecord };