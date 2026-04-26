// Local typed wrapper around legacy JS firebase setup.
// Keeps runtime behavior unchanged while satisfying TypeScript imports.
// @ts-expect-error Legacy JS module has no declaration file.
import { auth, db } from "../../lib/firebase";

export { auth, db };
