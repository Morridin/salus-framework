import { startToolbar } from "./toolbar.js";

startToolbar(document, new BroadcastChannel("salus:plugin-messages"));
