import { describe, expect, it } from "vitest";
import usersReducer from "../usersReducer.js";
import { searchUserThunk } from "../../api/usersThunk.js";

describe("usersReducer", () => {
  it("stores the user returned by a successful phone search", () => {
    const user = {
      id: "user-1",
      name: "Ari",
      phoneNumber: "+911234567890",
      profilePic: null,
    };

    const state = usersReducer(
      undefined,
      searchUserThunk.fulfilled(user, "request-1"),
    );

    expect(state.user).toEqual(user);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
  });
});
