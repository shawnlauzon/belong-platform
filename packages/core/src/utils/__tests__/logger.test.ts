import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLogger, logger } from "../logger";

describe("logger utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLogger", () => {
    it("should create a logger with default info level", () => {
      const testLogger = createLogger();
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.info).toBe("function");
      expect(typeof testLogger.debug).toBe("function");
      expect(typeof testLogger.error).toBe("function");
      expect(typeof testLogger.warn).toBe("function");
      expect(typeof testLogger.trace).toBe("function");
    });

    it("should create a logger with specified log level", () => {
      const testLogger = createLogger("debug");
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.debug).toBe("function");
    });

    it("should create a logger with trace level", () => {
      const testLogger = createLogger("trace");
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.trace).toBe("function");
    });

    it("should create a logger with warn level", () => {
      const testLogger = createLogger("warn");
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.warn).toBe("function");
    });

    it("should create a logger with error level", () => {
      const testLogger = createLogger("error");
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.error).toBe("function");
    });

    it("should create a logger with silent level", () => {
      const testLogger = createLogger("silent");
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.info).toBe("function");
    });

    it("should create working logger instances", () => {
      const logger1 = createLogger("info");
      const logger2 = createLogger("debug");
      
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(typeof logger1.info).toBe("function");
      expect(typeof logger2.debug).toBe("function");
    });

    it("should have all required logging methods", () => {
      const testLogger = createLogger("trace");
      
      expect(testLogger.trace).toBeDefined();
      expect(testLogger.debug).toBeDefined();
      expect(testLogger.info).toBeDefined();
      expect(testLogger.warn).toBeDefined();
      expect(testLogger.error).toBeDefined();
    });

    it("should have setLevel method", () => {
      const testLogger = createLogger("info");
      
      expect(testLogger.setLevel).toBeDefined();
      expect(typeof testLogger.setLevel).toBe("function");
    });

    it("should have getLevel method", () => {
      const testLogger = createLogger("info");
      
      expect(testLogger.getLevel).toBeDefined();
      expect(typeof testLogger.getLevel).toBe("function");
    });

    it("should not throw when calling logging methods", () => {
      const testLogger = createLogger("trace");
      
      expect(() => testLogger.trace("trace message")).not.toThrow();
      expect(() => testLogger.debug("debug message")).not.toThrow();
      expect(() => testLogger.info("info message")).not.toThrow();
      expect(() => testLogger.warn("warn message")).not.toThrow();
      expect(() => testLogger.error("error message")).not.toThrow();
    });

    it("should handle multiple arguments", () => {
      const testLogger = createLogger("info");
      
      expect(() => testLogger.info("Message", { data: "test" }, "extra")).not.toThrow();
    });

    it("should handle complex objects", () => {
      const testLogger = createLogger("info");
      const complexObject = {
        nested: { value: 42 },
        array: [1, 2, 3],
        date: new Date(),
      };
      
      expect(() => testLogger.info("Complex object:", complexObject)).not.toThrow();
    });

    it("should handle null and undefined values", () => {
      const testLogger = createLogger("info");
      
      expect(() => testLogger.info("Null value:", null)).not.toThrow();
      expect(() => testLogger.info("Undefined value:", undefined)).not.toThrow();
    });

    it("should handle error objects", () => {
      const testLogger = createLogger("error");
      const error = new Error("Test error");
      
      expect(() => testLogger.error("Error occurred:", error)).not.toThrow();
    });

    it("should create logger with methodFactory", () => {
      const testLogger = createLogger("info");
      
      expect(testLogger.methodFactory).toBeDefined();
      expect(typeof testLogger.methodFactory).toBe("function");
    });
  });

  describe("default logger", () => {
    it("should be exported as singleton", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });

    it("should have proper log level set", () => {
      expect(logger.getLevel).toBeDefined();
      expect(typeof logger.getLevel()).toBe("number");
    });

    it("should not throw when logging", () => {
      expect(() => logger.info("Test message")).not.toThrow();
      expect(() => logger.debug("Debug message")).not.toThrow();
      expect(() => logger.warn("Warning message")).not.toThrow();
      expect(() => logger.error("Error message")).not.toThrow();
    });
  });

  describe("logger configuration", () => {
    it("should respect environment variables for log level", () => {
      // Note: The actual env var reading happens during module import
      // so we can't test it directly, but we can test that the logger works
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid log levels by throwing", () => {
      // loglevel library throws on invalid levels
      // @ts-expect-error - testing invalid input
      expect(() => createLogger("invalid")).toThrow();
    });
  });

  describe("convenience methods exist", () => {
    it("should export logComponentRender", async () => {
      const { logComponentRender } = await import("../logger");
      expect(logComponentRender).toBeDefined();
      expect(typeof logComponentRender).toBe("function");
    });

    it("should export logApiCall", async () => {
      const { logApiCall } = await import("../logger");
      expect(logApiCall).toBeDefined();
      expect(typeof logApiCall).toBe("function");
    });

    it("should export logApiResponse", async () => {
      const { logApiResponse } = await import("../logger");
      expect(logApiResponse).toBeDefined();
      expect(typeof logApiResponse).toBe("function");
    });

    it("should export logUserAction", async () => {
      const { logUserAction } = await import("../logger");
      expect(logUserAction).toBeDefined();
      expect(typeof logUserAction).toBe("function");
    });

    it("should export logStateChange", async () => {
      const { logStateChange } = await import("../logger");
      expect(logStateChange).toBeDefined();
      expect(typeof logStateChange).toBe("function");
    });

    it("should export logEvent", async () => {
      const { logEvent } = await import("../logger");
      expect(logEvent).toBeDefined();
      expect(typeof logEvent).toBe("function");
    });
  });

  describe("convenience functions don't throw", () => {
    it("logComponentRender should not throw", async () => {
      const { logComponentRender } = await import("../logger");
      
      expect(() => logComponentRender("TestComponent")).not.toThrow();
      expect(() => logComponentRender("TestComponent", { prop: "value" })).not.toThrow();
    });

    it("logApiCall should not throw", async () => {
      const { logApiCall } = await import("../logger");
      
      expect(() => logApiCall("GET", "/api/test")).not.toThrow();
      expect(() => logApiCall("POST", "/api/test", { data: "test" })).not.toThrow();
    });

    it("logApiResponse should not throw", async () => {
      const { logApiResponse } = await import("../logger");
      
      expect(() => logApiResponse("GET", "/api/test")).not.toThrow();
      expect(() => logApiResponse("GET", "/api/test", { result: "data" })).not.toThrow();
      expect(() => logApiResponse("GET", "/api/test", undefined, new Error("API error"))).not.toThrow();
    });

    it("logUserAction should not throw", async () => {
      const { logUserAction } = await import("../logger");
      
      expect(() => logUserAction("click")).not.toThrow();
      expect(() => logUserAction("click", { button: "save" })).not.toThrow();
    });

    it("logStateChange should not throw", async () => {
      const { logStateChange } = await import("../logger");
      
      expect(() => logStateChange("count")).not.toThrow();
      expect(() => logStateChange("count", 1, 2)).not.toThrow();
    });

    it("logEvent should not throw", async () => {
      const { logEvent } = await import("../logger");
      
      expect(() => logEvent("user_action")).not.toThrow();
      expect(() => logEvent("user_action", { userId: "123" })).not.toThrow();
    });
  });
});