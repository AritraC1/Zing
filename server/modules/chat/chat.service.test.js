const ChatService = require("./chat.service");
const { withTransaction } = require("../../utils/withTransaction");
const AppError = require("../../core/errors/AppError");

jest.mock("./chat.repository");
jest.mock("./participants.repository");
jest.mock("../blocks/blocks.repository");
jest.mock("../../utils/withTransaction");

// Repositories are mocked; jest automock creates per-instance mocks
// (the service constructs its own), so the mocks are driven through
// the instances owned by the service under test.
let ChatRepo;
let ChatParticipantsRepo;

describe("ChatService", () => {
  let chatService;

  beforeEach(() => {
    jest.clearAllMocks();
    chatService = new ChatService();
    ChatRepo = chatService.chatRepo;
    ChatParticipantsRepo = chatService.participantsRepository;
  });

  describe("createDirectConversation", () => {
    const currentUserId = "user-1";
    const otherUserId = "user-2";

    it("throws AppError if trying to start conversation with yourself", async () => {
      await expect(chatService.createDirectConversation(currentUserId, currentUserId))
        .rejects.toThrow(AppError);
      await expect(chatService.createDirectConversation(currentUserId, currentUserId))
        .rejects.toMatchObject({ message: "Cannot start a conversation with yourself", statusCode: 400 });
    });

    it("returns existing conversation if one exists", async () => {
      ChatRepo.findDirectConversation.mockResolvedValue({ conversation_id: "existing-conv" });

      const result = await chatService.createDirectConversation(currentUserId, otherUserId);

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

      const result = await chatService.createDirectConversation(currentUserId, otherUserId);

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

      const result = await chatService.createDirectConversation(currentUserId, otherUserId);

      expect(result).toEqual({ conversationId: "race-conv", created: false });
      expect(ChatRepo.createConversation).not.toHaveBeenCalled();
    });
  });
});
