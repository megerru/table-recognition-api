import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  tablesData: jsonb("tables_data"),
  errorMessage: text("error_message"),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadedAt: true,
});

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export const tableRecognitionResultSchema = z.object({
  tableIndex: z.number(),
  pageNumber: z.number().optional(),
  html: z.string(),
  rows: z.array(z.array(z.string())),
  confidence: z.number().optional(),
  type: z.string().optional(),
});

export type TableRecognitionResult = z.infer<typeof tableRecognitionResultSchema>;

export const processingStatusSchema = z.object({
  status: z.enum(["idle", "uploading", "converting", "recognizing", "completed", "error"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
  currentStep: z.string().optional(),
});

export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
