# Firestore Security Specification

This specification defines the data invariants and security test cases for the Export CRM Firestore database.

## 1. Data Invariants

1. **Identity Isolation**: Users can only access data belonging to their approved organization.
2. **Role Hierarchy**: 
   - `admin`: Can read/write all data within their organization and manage users. Global admin (`akhilvenugopal@gmail.com`) can manage everything.
   - `manager`: Can manage leads, orders, and inventory within their organization.
   - `staff`/`user`: Can read data within their organization and perform basic operations.
3. **Immutable Fields**: `createdAt`, `uid`/`id`, and `organization` (after creation) must be immutable.
4. **Strict Schema**: All writes must comply with the entity definitions in `firebase-blueprint.json`.
5. **Approval Gate**: Non-admin users must be in `active` status to access organization data.

## 2. The Dirty Dozen (Logic Leaks to Block)

| ID | Attack Vector | Expected Result |
|----|---------------|-----------------|
| D1 | Unauthenticated read of any collection | `PERMISSION_DENIED` |
| D2 | New user setting their own role to 'admin' during registration | `PERMISSION_DENIED` |
| D3 | New user setting their own status to 'active' during registration | `PERMISSION_DENIED` |
| D4 | User trying to read Lead data belonging to another organization | `PERMISSION_DENIED` |
| D5 | User trying to update an Order with a different `totalAmount` but also trying to change the `orderNumber` | `PERMISSION_DENIED` |
| D6 | User trying to change their own `organization` field after it has been set | `PERMISSION_DENIED` |
| D7 | Injecting a 1MB shadow field `attackPayload` into a Lead document | `PERMISSION_DENIED` |
| D8 | Attempting to delete an Audit Log (Immutable collection) | `PERMISSION_DENIED` |
| D9 | User trying to read the `users` collection without an approved status | `PERMISSION_DENIED` |
| D10 | Spoofing `request.time` by sending a client-side timestamp for `updatedAt` | `PERMISSION_DENIED` |
| D11 | Creating a User profile with a `uid` that doesn't match `request.auth.uid` | `PERMISSION_DENIED` |
| D12 | Setting a terminal state like `status: 'shippedDelivered'` without being a manager/admin | `PERMISSION_DENIED` |

## 3. Test Runner (Draft)

```typescript
// firestore.rules.test.ts
// This is a conceptual test runner for Firebase Security Rules Emulator

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "spiceroute-manager-65f3b",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

test("D1: Unauthenticated read should fail", async () => {
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(unauthedDb, "leads/test-lead")));
});

test("D2: Privilege escalation during create should fail", async () => {
  const aliceDb = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
  await assertFails(setDoc(doc(aliceDb, "users/alice"), {
    uid: "alice",
    role: "admin", // <--- Attack
    status: "active",
    organization: "Calicut Traders",
    email: "alice@example.com",
    displayName: "Alice",
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    isOnline: true,
    presenceStatus: "online"
  }));
});

test("D4: Cross-org read should fail", async () => {
  // Setup: lead in Org A
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "leads/org-a-lead"), {
      organization: "Org A",
      fullName: "Secret Lead"
    });
    await setDoc(doc(context.firestore(), "users/bob"), {
      uid: "bob",
      organization: "Org B",
      status: "active",
      role: "user"
    });
  });

  const bobDb = testEnv.authenticatedContext("bob").firestore();
  await assertFails(getDoc(doc(bobDb, "leads/org-a-lead")));
});
```
