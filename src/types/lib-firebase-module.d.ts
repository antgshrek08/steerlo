declare module "../../../lib/firebase" {
  import type { Auth } from "firebase/auth";
  import type { Firestore } from "firebase/firestore";

  export const auth: Auth;
  export const db: Firestore;
}

declare module "../../../lib/firebase.js" {
  import type { Auth } from "firebase/auth";
  import type { Firestore } from "firebase/firestore";

  export const auth: Auth;
  export const db: Firestore;
}
