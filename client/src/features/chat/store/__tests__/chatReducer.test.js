import { describe, it, expect } from "vitest";
import chatReducer, {
  addMessage,
  addOptimisticMessage,
  reconcileMessage,
  markMessageFailed,
  updateMessageStatus,
} from "../chatReducer.js";

describe("chatReducer", () => {
  const baseState = chatReducer(undefined, { type: "@@INIT" });

  it("addMessage appends a message and bumps chat preview", () => {
    const state = {
      ...baseState,
      chats: [
        {
          id: "conv-1",
          name: "Alice",
          lastMessage: "Hi",
          lastMessageAt: "2026-01-01T10:00:00.000Z",
        },
      ],
    };

    const message = {
      id: "msg-1",
      conversation_id: "conv-1",
      content: "Hello there",
      created_at: "2026-01-02T10:00:00.000Z",
      sender_id: "user-2",
    };

    const next = chatReducer(state, addMessage(message));

    expect(next.messages["conv-1"]).toHaveLength(1);
    expect(next.messages["conv-1"][0].content).toBe("Hello there");
    expect(next.chats[0].lastMessage).toBe("Hello there");
  });

  it("updateMessageStatus upserts status by messageId in O(1) map", () => {
    const state = {
      ...baseState,
      statuses: {
        "conv-1": {
          "msg-1": {
            "user-2": {
              message_id: "msg-1",
              user_id: "user-2",
              msg_status: "sent",
            },
          },
        },
      },
    };

    const next = chatReducer(
      state,
      updateMessageStatus({
        conversationId: "conv-1",
        messageId: "msg-1",
        userId: "user-2",
        status: "seen",
      }),
    );

    expect(next.statuses["conv-1"]["msg-1"]["user-2"].msg_status).toBe("seen");

    const created = chatReducer(
      baseState,
      updateMessageStatus({
        conversationId: "conv-1",
        messageId: "msg-2",
        userId: "user-2",
        status: "delivered",
      }),
    );

    expect(created.statuses["conv-1"]["msg-2"]["user-2"].msg_status).toBe(
      "delivered",
    );
  });

  it("addOptimisticMessage adds a pending message with sendStatus sending", () => {
    const next = chatReducer(
      baseState,
      addOptimisticMessage({
        client_msg_id: "client-1",
        conversation_id: "conv-1",
        sender_id: "user-1",
        content: "Pending",
        created_at: "2026-01-02T10:00:00.000Z",
      }),
    );

    expect(next.messages["conv-1"]).toHaveLength(1);
    expect(next.messages["conv-1"][0].sendStatus).toBe("sending");
    expect(next.messages["conv-1"][0].id).toBe("client-1");
  });

  it("reconcileMessage replaces optimistic row by client_msg_id", () => {
    const withOptimistic = chatReducer(
      baseState,
      addOptimisticMessage({
        client_msg_id: "client-1",
        conversation_id: "conv-1",
        sender_id: "user-1",
        content: "Pending",
        created_at: "2026-01-02T10:00:00.000Z",
      }),
    );

    const next = chatReducer(
      withOptimistic,
      reconcileMessage({
        clientMsgId: "client-1",
        serverMessage: {
          id: "msg-1",
          client_msg_id: "client-1",
          conversation_id: "conv-1",
          sender_id: "user-1",
          content: "Pending",
          created_at: "2026-01-02T10:00:00.000Z",
        },
      }),
    );

    expect(next.messages["conv-1"]).toHaveLength(1);
    expect(next.messages["conv-1"][0].id).toBe("msg-1");
    expect(next.messages["conv-1"][0].sendStatus).toBe("sent");
  });

  it("markMessageFailed sets sendStatus to failed", () => {
    const withOptimistic = chatReducer(
      baseState,
      addOptimisticMessage({
        client_msg_id: "client-1",
        conversation_id: "conv-1",
        sender_id: "user-1",
        content: "Pending",
        created_at: "2026-01-02T10:00:00.000Z",
      }),
    );

    const next = chatReducer(
      withOptimistic,
      markMessageFailed({
        clientMsgId: "client-1",
        conversationId: "conv-1",
      }),
    );

    expect(next.messages["conv-1"][0].sendStatus).toBe("failed");
  });
});
