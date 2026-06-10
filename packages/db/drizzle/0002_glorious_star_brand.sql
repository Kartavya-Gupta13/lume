CREATE TYPE "public"."event_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."trace_status" AS ENUM('ok', 'error', 'in_progress');--> statement-breakpoint
CREATE TYPE "public"."span_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TYPE "public"."span_type" AS ENUM('llm_call', 'tool_call', 'agent', 'retrieval', 'custom');--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"span_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"level" "event_level" NOT NULL,
	"message" text NOT NULL,
	"attributes" jsonb
);
--> statement-breakpoint
CREATE TABLE "trace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "trace_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"total_tokens_input" integer,
	"total_tokens_output" integer,
	"total_cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"metadata" jsonb,
	"user_id_external" text,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "span" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" uuid NOT NULL,
	"parent_span_id" uuid,
	"name" text NOT NULL,
	"type" "span_type" NOT NULL,
	"status" "span_status" NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb,
	"model" text,
	"tokens_input" integer,
	"tokens_output" integer,
	"cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_span_id_span_id_fk" FOREIGN KEY ("span_id") REFERENCES "public"."span"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace" ADD CONSTRAINT "trace_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "span" ADD CONSTRAINT "span_trace_id_trace_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."trace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "span" ADD CONSTRAINT "span_parent_span_id_span_id_fk" FOREIGN KEY ("parent_span_id") REFERENCES "public"."span"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_span_idx" ON "event" USING btree ("span_id");--> statement-breakpoint
CREATE INDEX "trace_project_idx" ON "trace" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "trace_started_at_idx" ON "trace" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "span_trace_idx" ON "span" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "span_parent_idx" ON "span" USING btree ("parent_span_id");