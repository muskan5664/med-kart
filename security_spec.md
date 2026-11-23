# Security Specification — Aman Medical Doctor Ordering Portal

## 1. Data Invariants
1. **Global Default-Deny**: Any path not explicitly matched is denied for read and write.
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Admin Authorization**: A user is an admin ONLY if they exist in `/admins/$(request.auth.uid)` OR their verified email matches the bootstrapped owner email (`satyamgupta1287@gmail.com`).
4. **PII Isolation on `/profiles/{userId}`**: Profiles contain PII (`email`, `phone`, `clinic`, `city`). `get` and `list` are strictly restricted to the profile owner (`resource.data.uid == request.auth.uid` / `userId == request.auth.uid`) or `isAdmin()`.
5. **No Self-Privilege Escalation**: Doctors creating their own `/profiles/{userId}` document must set `uid == request.auth.uid`, `role == 'doctor'`, `approved == false`, and `status == 'pending'`, unless `isAdmin()`. Doctors updating their profile can only update `name`, `clinic`, `phone`, `city`, and `updatedAt` — never `role`, `approved`, or `status`.
6. **Approved Doctor Ordering**: An order in `/orders/{orderId}` can only be created by an authenticated user whose `doctorId == request.auth.uid` and whose `/profiles/$(request.auth.uid)` document exists and has `approved == true` (or `isAdmin()`).
7. **Master Gate on `/orders/{orderId}/items/{itemId}`**: Line items can only be read or created if the parent `/orders/$(orderId)` exists and belongs to `request.auth.uid` (or `isAdmin()`).
8. **Temporal & Immutable Integrity**: `createdAt == request.time` on creation, `updatedAt == request.time` on update, and immutable fields (`createdAt`, `uid`, `doctorId`, `orderNumber`) cannot be altered on update.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof**: `{ email: "satyamgupta1287@gmail.com", email_verified: false }` attempting admin write to `/medicines/med-1`.
2. **Self-Approved Doctor Registration**: Creating `/profiles/user1` with `{ role: "admin", approved: true, status: "approved" }` as non-admin.
3. **Shadow Field Injection on Profile Update**: Updating `/profiles/user1` with an extra ghost key `{ ghostAdmin: true }`.
4. **PII Blanket Scrape on Profiles**: Authenticated user `user2` calling `get` or `list` on `/profiles/user1`.
5. **ID Poisoning on Medicine**: Creating a medicine with a 200-character or special-char document ID `/medicines/bad$id!`.
6. **Value Poisoning on Medicine Rate**: Admin or user setting `rate: -50` or `name` exceeding 200 characters.
7. **Unapproved Doctor Order Placement**: Doctor with `approved == false` attempting to create `/orders/ord-1`.
8. **Order Ownership Spoofing**: Doctor `user1` creating `/orders/ord-1` with `doctorId: "user2"`.
9. **Doctor Changing Order Status to Delivered**: Doctor `user1` updating `/orders/ord-1` `status` or `trackingNo`.
10. **Terminal State Violation on Order**: Non-admin attempting to mutate an order after `status == 'Delivered'`.
11. **Orphaned Order Item Write**: Creating `/orders/nonexistent/items/item-1` where parent `/orders/nonexistent` does not exist.
12. **Cross-Doctor Order Item Read**: Doctor `user2` reading `/orders/ord-user1/items/item-1`.
