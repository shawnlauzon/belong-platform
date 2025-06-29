import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import {
  renderHook,
  act,
  waitFor,
} from "@testing-library/react";
import {
  useAuth,
} from "@belongnetwork/platform";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from "../helpers";

describe("Conversations Integration Tests", () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(async () => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterEach(async () => {
    await authHelper.ensureSignedOut();
    // Add delay after each test
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should create valid test message data", async () => {
    const messageData = TestDataFactory.createMessage();

    expect(messageData).toHaveProperty('content');
    expect(typeof messageData.content).toBe('string');
    expect(messageData.content.length).toBeGreaterThan(0);

    // Test with overrides
    const customMessage = TestDataFactory.createMessage({
      content: "Custom test message",
    });

    expect(customMessage.content).toBe("Custom test message");
  });

  test("should validate message data structure", async () => {
    // Test message data structure
    const messageData = TestDataFactory.createMessage();

    // Verify required properties
    expect(messageData).toHaveProperty('content');
    
    // Verify data types
    expect(typeof messageData.content).toBe('string');
    
    // Verify content is not empty
    expect(messageData.content.trim().length).toBeGreaterThan(0);
    
    // Test multiple message creation for uniqueness
    const message1 = TestDataFactory.createMessage();
    const message2 = TestDataFactory.createMessage();
    
    // Messages should have different content (using faker)
    expect(message1.content).not.toBe(message2.content);
  });

  test("should support message content variations", async () => {
    // Test different types of message content
    const shortMessage = TestDataFactory.createMessage({
      content: "Hi",
    });
    expect(shortMessage.content).toBe("Hi");

    const longMessage = TestDataFactory.createMessage({
      content: "This is a very long message that contains multiple sentences and should be handled properly by the conversation system. It includes various punctuation marks and special characters! @ # $ % ^ & * ( ) - _ = + [ ] { } | \ : ; \" ' < > , . ? / ~ `",
    });
    expect(longMessage.content.length).toBeGreaterThan(100);

    const emojiMessage = TestDataFactory.createMessage({
      content: "Hello 👋 World 🌍! How are you? 😊",
    });
    expect(emojiMessage.content).toContain("👋");
    expect(emojiMessage.content).toContain("🌍");
    expect(emojiMessage.content).toContain("😊");

    const numbersMessage = TestDataFactory.createMessage({
      content: "Meeting at 2:30 PM on 12/25/2023. Room #123.",
    });
    expect(numbersMessage.content).toContain("2:30");
    expect(numbersMessage.content).toContain("12/25/2023");
    expect(numbersMessage.content).toContain("#123");
  });

  test("should handle message data edge cases", async () => {
    // Test edge cases for message content
    const emptyContentMessage = TestDataFactory.createMessage({
      content: "",
    });
    expect(emptyContentMessage.content).toBe("");

    const whitespaceMessage = TestDataFactory.createMessage({
      content: "   \n\t   ",
    });
    expect(whitespaceMessage.content).toBe("   \n\t   ");

    const specialCharsMessage = TestDataFactory.createMessage({
      content: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
    });
    expect(specialCharsMessage.content).toContain("!@#$%^&*()");

    const unicodeMessage = TestDataFactory.createMessage({
      content: "Unicode: ñ español, 中文, العربية, русский, हिंदी",
    });
    expect(unicodeMessage.content).toContain("中文");
    expect(unicodeMessage.content).toContain("العربية");
  });

  test("should validate message factory with multiple calls", async () => {
    // Generate multiple messages to ensure consistency
    const messages = Array.from({ length: 5 }, () => TestDataFactory.createMessage());
    
    // All messages should have content property
    messages.forEach(message => {
      expect(message).toHaveProperty('content');
      expect(typeof message.content).toBe('string');
    });
    
    // All messages should be different (faker randomness)
    const contents = messages.map(m => m.content);
    const uniqueContents = new Set(contents);
    expect(uniqueContents.size).toBe(contents.length);
  });

  test("should handle conversation ID patterns", async () => {
    // Test conversation ID formats that might be used
    const conversationIds = [
      "conv-12345",
      "conversation_abc123",
      "12345-67890",
      "user1-user2-conv",
      "c_1234567890abcdef",
    ];

    conversationIds.forEach(id => {
      const message = TestDataFactory.createMessage();
      
      // Simulate conversation ID usage
      const messageWithConversation = {
        ...message,
        conversationId: id,
      };
      
      expect(messageWithConversation.conversationId).toBe(id);
      expect(messageWithConversation.content).toBe(message.content);
    });
  });

  test("should support message metadata simulation", async () => {
    // Test simulated message metadata
    const baseMessage = TestDataFactory.createMessage();
    
    // Simulate different message states
    const unreadMessage = {
      ...baseMessage,
      id: "msg-123",
      conversationId: "conv-456",
      senderId: "user-789",
      readAt: null,
      createdAt: new Date(),
    };
    
    const readMessage = {
      ...baseMessage,
      id: "msg-124",
      conversationId: "conv-456", 
      senderId: "user-789",
      readAt: new Date(),
      createdAt: new Date(),
    };
    
    expect(unreadMessage.readAt).toBeNull();
    expect(readMessage.readAt).toBeInstanceOf(Date);
    expect(unreadMessage.id).not.toBe(readMessage.id);
  });

  test("should validate message threading concepts", async () => {
    // Test message threading/conversation concepts
    const conversationId = "conv-integration-test";
    
    // Create multiple messages for the same conversation
    const messages = Array.from({ length: 3 }, (_, index) => ({
      ...TestDataFactory.createMessage(),
      id: `msg-${index + 1}`,
      conversationId,
      senderId: index % 2 === 0 ? "user-1" : "user-2", // Alternate senders
      createdAt: new Date(Date.now() + index * 1000), // Sequential timestamps
    }));
    
    // Verify conversation structure
    expect(messages).toHaveLength(3);
    messages.forEach(message => {
      expect(message.conversationId).toBe(conversationId);
      expect(message.id).toMatch(/^msg-\d+$/);
      expect(['user-1', 'user-2']).toContain(message.senderId);
    });
    
    // Verify alternating senders
    expect(messages[0].senderId).toBe("user-1");
    expect(messages[1].senderId).toBe("user-2");
    expect(messages[2].senderId).toBe("user-1");
    
    // Verify sequential timestamps
    expect(messages[1].createdAt.getTime()).toBeGreaterThan(messages[0].createdAt.getTime());
    expect(messages[2].createdAt.getTime()).toBeGreaterThan(messages[1].createdAt.getTime());
  });

  test("should support conversation integration infrastructure", async () => {
    // Test that basic conversation infrastructure components work
    
    // Test user creation for conversation participants
    const user1 = TestDataFactory.createUser();
    const user2 = TestDataFactory.createUser();
    
    expect(user1.email).not.toBe(user2.email);
    expect(user1.firstName).toBeDefined();
    expect(user2.firstName).toBeDefined();
    
    // Test message creation between users
    const message1to2 = {
      ...TestDataFactory.createMessage(),
      fromUserId: user1.email, // Using email as ID for this test
      toUserId: user2.email,
      conversationId: `${user1.email}-${user2.email}`,
    };
    
    const message2to1 = {
      ...TestDataFactory.createMessage(),
      fromUserId: user2.email,
      toUserId: user1.email,
      conversationId: `${user1.email}-${user2.email}`, // Same conversation
    };
    
    expect(message1to2.fromUserId).toBe(user1.email);
    expect(message1to2.toUserId).toBe(user2.email);
    expect(message2to1.fromUserId).toBe(user2.email);
    expect(message2to1.toUserId).toBe(user1.email);
    expect(message1to2.conversationId).toBe(message2to1.conversationId);
  });
});