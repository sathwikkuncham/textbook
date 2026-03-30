CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer,
	"subtopic_id" varchar(20),
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"scores_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_attempt_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"subtopic_id" varchar(20) NOT NULL,
	"db_key" integer NOT NULL,
	"attempt" integer NOT NULL,
	"clarity_score" real NOT NULL,
	"completeness_score" real NOT NULL,
	"continuity_score" real,
	"example_quality_score" real NOT NULL,
	"accuracy_score" real NOT NULL,
	"overall_score" real NOT NULL,
	"verdict" varchar(20) NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"structure" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"concept_mastery" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strength_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weak_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"learning_style" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"engagement_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer,
	"subtopic_id" varchar(20),
	"signal_type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"content" text NOT NULL,
	"diagrams" text,
	"audio_url" text,
	"paragraph_timings" jsonb,
	"quality_score" real,
	"generation_attempts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"subtopic_id" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'locked' NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "research_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"foundations" jsonb,
	"applications" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_page_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"section_key" varchar(255) NOT NULL,
	"page_range_start" integer NOT NULL,
	"page_range_end" integer NOT NULL,
	"extracted_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"raw_toc" jsonb NOT NULL,
	"calibration" jsonb NOT NULL,
	"user_scope" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaced_repetition" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"box_number" integer DEFAULT 1 NOT NULL,
	"next_review_date" timestamp NOT NULL,
	"last_review_date" timestamp,
	"last_score" real,
	"review_history" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"display_name" text NOT NULL,
	"level" varchar(50) NOT NULL,
	"goal" text NOT NULL,
	"time_commitment" varchar(50) NOT NULL,
	"total_modules" integer DEFAULT 0 NOT NULL,
	"estimated_minutes" integer DEFAULT 0 NOT NULL,
	"completion_percent" real DEFAULT 0 NOT NULL,
	"current_module" integer DEFAULT 1 NOT NULL,
	"current_subtopic" integer DEFAULT 1 NOT NULL,
	"total_time_minutes" integer DEFAULT 0 NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"source_type" varchar(20) DEFAULT 'topic_only' NOT NULL,
	"source_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_session" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_evaluations" ADD CONSTRAINT "content_evaluations_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_insights" ADD CONSTRAINT "learner_insights_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_signals" ADD CONSTRAINT "learner_signals_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_content" ADD CONSTRAINT "module_content_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_quizzes" ADD CONSTRAINT "module_quizzes_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_cache" ADD CONSTRAINT "research_cache_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_page_cache" ADD CONSTRAINT "source_page_cache_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_structures" ADD CONSTRAINT "source_structures_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaced_repetition" ADD CONSTRAINT "spaced_repetition_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkpoints_topic_module_idx" ON "checkpoints" USING btree ("topic_id","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learner_insights_topic_idx" ON "learner_insights" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "module_content_topic_module_idx" ON "module_content" USING btree ("topic_id","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "module_quizzes_topic_module_idx" ON "module_quizzes" USING btree ("topic_id","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_topic_subtopic_idx" ON "progress" USING btree ("topic_id","subtopic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_page_cache_topic_section_idx" ON "source_page_cache" USING btree ("topic_id","section_key");--> statement-breakpoint
CREATE UNIQUE INDEX "source_structures_topic_idx" ON "source_structures" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spaced_rep_topic_module_idx" ON "spaced_repetition" USING btree ("topic_id","module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");