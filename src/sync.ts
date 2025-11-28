import { getStarredEmails } from "./gmail";
import { createTask } from "./notion";

export async function sync(): Promise<void> {
  const emails = await getStarredEmails();
  console.log(`Found ${emails.length} starred emails`);

  if (!emails.length) {
    return;
  }

  for (const email of emails) {
    try {
      console.log(`Creating task for: ${email.subject || email.id}`);
      await createTask(email);
    } catch (error) {
      console.error(`Failed to create task for email ${email.id}`, error);
    }
  }

  console.log("Sync complete.");
}