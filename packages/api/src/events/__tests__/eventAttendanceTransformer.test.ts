import { describe, it, expect } from "vitest";
import {
  toDomainEventAttendance,
  forDbInsert,
} from "../transformers/eventAttendanceTransformer";
import { createMockDbEventAttendance } from "./test-utils";
import {
  createMockEventAttendanceData,
  createMockUser,
  createMockEvent,
} from "../../test-utils/mocks";

describe("Event Attendance Transformer", () => {
  describe("toDomainEventAttendance", () => {
    it("should transform a database event attendance to a domain event attendance", () => {
      const mockUser = createMockUser();
      const mockEvent = createMockEvent();
      const dbAttendance = createMockDbEventAttendance({
        user_id: mockUser.id,
        event_id: mockEvent.id,
        status: "attending",
      });

      const attendance = toDomainEventAttendance(dbAttendance, {
        user: mockUser,
        event: mockEvent,
      });

      expect(attendance).toMatchObject({
        id: dbAttendance.id,
        eventId: mockEvent.id,
        userId: mockUser.id,
        status: "attending",
        user: mockUser,
        event: mockEvent,
      });
    });

    it("should handle all attendance status types", () => {
      const mockUser = createMockUser();
      const mockEvent = createMockEvent();

      const statuses = ["attending", "not_attending", "maybe"];

      statuses.forEach((status) => {
        const dbAttendance = createMockDbEventAttendance({
          user_id: mockUser.id,
          event_id: mockEvent.id,
          status,
        });

        const attendance = toDomainEventAttendance(dbAttendance, {
          user: mockUser,
          event: mockEvent,
        });

        expect(attendance.status).toBe(status);
      });
    });

    it("should throw an error if event ID does not match", () => {
      const mockUser = createMockUser();
      const mockEvent = createMockEvent();
      const dbAttendance = createMockDbEventAttendance({
        user_id: mockUser.id,
        event_id: "different-id",
      });

      expect(() => {
        toDomainEventAttendance(dbAttendance, {
          user: mockUser,
          event: mockEvent,
        });
      }).toThrow("Event ID does not match");
    });

    it("should throw an error if user ID does not match", () => {
      const mockUser = createMockUser();
      const mockEvent = createMockEvent();
      const dbAttendance = createMockDbEventAttendance({
        user_id: "different-id",
        event_id: mockEvent.id,
      });

      expect(() => {
        toDomainEventAttendance(dbAttendance, {
          user: mockUser,
          event: mockEvent,
        });
      }).toThrow("User ID does not match");
    });
  });

  describe("forDbInsert", () => {
    it("should transform event attendance data for database insertion", () => {
      const attendanceData = createMockEventAttendanceData();
      const userId = "test-user-id";

      const dbAttendance = forDbInsert(attendanceData, userId);

      expect(dbAttendance).toMatchObject({
        event_id: attendanceData.eventId,
        user_id: userId,
        status: attendanceData.status,
      });
    });

    it("should handle all status types in insert", () => {
      const statuses = ["attending", "not_attending", "maybe"];
      const userId = "test-user-id";

      statuses.forEach((status) => {
        const attendanceData = createMockEventAttendanceData({
          status: status as any,
        });

        const dbAttendance = forDbInsert(attendanceData, userId);

        expect(dbAttendance.status).toBe(status);
      });
    });
  });
});
