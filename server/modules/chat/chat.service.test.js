const ChatService = require("./chat.service");
const ChatRepo = require("./chat.repo");
const ChatParticipantsRepo = require("../chatParticipants/chatParticipants.repo");
const { withTransaction } = require("../../shared/utils/withTransaction");
const AppError = require("../../shared/errors/AppError");

jest.mock("./chat.repo");
jest.mock("../chatParticipants/chatParticipants.repo");
jest.mock("../../shared/utils/withTransaction");

describe("ChatService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDirectConversation", () => {
    const currentUserId = "user-1";
    const otherUserId = "user-2";

    it("throws AppError if trying to start conversation with self", async () => {
      await expect(ChatService.createDirectConversation(currentUserId, currentUserId))
        .rejects.toThrow(AppError);
      await expect(ChatService.createDirectConversation(currentUserId, currentUserId))
        .rejects.toMatchObject({ message: "Cannot start a conversation with yourself", statusCode: 400 });
    });

    it("returns existing conversation if one exists", async () => {
      ChatRepo.findDirectConversation.mockResolvedValue({ conversation_id: "existing-conv" });

      const result = await ChatService.createDirectConversation(currentUserId, otherUserId);

      expect(result).toEqual({ conversationId: "existing-conv", created: false });
      expect(ChatRepo.findDirectConversation).toHaveBeenCalledTimes(1);
      expect(withTransaction).not.toHaveBeenCalled();
    });

    it("creates new conversation if none exists", async () => {
      ChatRepo.findDirectConversation.mockResolvedValueOnce(null); // First check
      withTransaction.mockImplementation(async (callback) => {
        const mockClient = {};
        ChatRepo.findDirectConversation.mockResolvedValueOnce(null); // Race check
        ChatRepo.createConversation.mockResolvedValue({ id: "new-conv" });
        ChatParticipantsRepo.addTwoParticipants.mockResolvedValue();
        return callback(mockClient);
      });

      const result = await ChatService.createDirectConversation(currentUserId, otherUserId);

      expect(result).toEqual({ conversationId: "new-conv", created: true });
      expect(ChatRepo.createConversation).toHaveBeenCalledWith("direct", expect.any(Object));
      expect(ChatParticipantsRepo.addTwoParticipants).toHaveBeenCalledWith("new-conv", currentUserId, otherUserId, expect.any(Object));
    });

    it("handles race condition - returns existing if created between checks", async () => {
      ChatRepo.findDirectConversation.mockResolvedValueOnce(null); // First check
      withTransaction.mockImplementation(async (callback) => {
        const mockClient = {};
        ChatRepo.findDirectConversation.mockResolvedValueOnce({ conversation_id: "race-conv" }); // Race check finds it
        return callback(mockClient);
      });

      const result = await ChatService.createDirectConversation(currentUserId, otherUserId);

      expect(result).toEqual({ conversationId: "race-conv", created: false });
      expect(ChatRepo.createConversation).not.toHaveBeenCalled();
    });
  });
});