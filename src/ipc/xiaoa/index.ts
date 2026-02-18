import {
  addMessage,
  createSession,
  deleteSession,
  getMessages,
  getSession,
  getSessions,
  updateSession,
} from "./handlers";

export const xiaoa = {
  listSessions: getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getMessages,
  addMessage,
};
