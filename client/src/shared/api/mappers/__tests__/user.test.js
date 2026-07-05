import { describe, it, expect } from "vitest";
import { toUser } from "../user.js";

describe("toUser mapper", () => {
  it("maps snake_case API fields to client shape", () => {
    const mapped = toUser({
      id: "user-1",
      phone_number: "+911234567890",
      display_name: "Ari",
      profile_completed: true,
      avatar_url: "https://example.com/a.png",
      last_seen_at: "2026-07-05T10:00:00.000Z",
    });

    expect(mapped).toEqual({
      id: "user-1",
      phoneNumber: "+911234567890",
      displayName: "Ari",
      profileCompleted: true,
      avatarMediaId: null,
      avatarUrl: "https://example.com/a.png",
      lastSeenAt: "2026-07-05T10:00:00.000Z",
      createdAt: null,
      updatedAt: null,
      isNewUser: undefined,
    });
  });
});
