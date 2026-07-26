import "server-only";
import { PluggyClient } from "pluggy-sdk";

export const pluggyClient = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID!,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
});
