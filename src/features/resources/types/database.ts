import type { Database } from "../../../shared/types/database";

export type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type ResourceInsertDbData =
  Database["public"]["Tables"]["resources"]["Insert"];
export type ResourceUpdateDbData =
  Database["public"]["Tables"]["resources"]["Update"];

export type ResourceResponseRow = Database["public"]["Tables"]["resource_responses"]["Row"];
export type ResourceResponseInsertDbData =
  Database["public"]["Tables"]["resource_responses"]["Insert"];
export type ResourceResponseUpdateDbData =
  Database["public"]["Tables"]["resource_responses"]["Update"];
