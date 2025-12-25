CREATE TABLE "ips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"port" text DEFAULT '',
	"username" text DEFAULT '',
	"password" text DEFAULT '',
	"provider" text DEFAULT '',
	"remark" text DEFAULT '',
	"computer" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ips_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "phones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"email" text DEFAULT '',
	"remark" text DEFAULT '',
	"computer" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phones_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_id" varchar,
	"ip_id" varchar,
	"count" integer DEFAULT 1 NOT NULL,
	"used_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_phone_id_phones_id_fk" FOREIGN KEY ("phone_id") REFERENCES "public"."phones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_ip_id_ips_id_fk" FOREIGN KEY ("ip_id") REFERENCES "public"."ips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slots_phone_id_idx" ON "slots" USING btree ("phone_id");--> statement-breakpoint
CREATE INDEX "slots_ip_id_idx" ON "slots" USING btree ("ip_id");--> statement-breakpoint
CREATE INDEX "slots_used_at_idx" ON "slots" USING btree ("used_at");--> statement-breakpoint
CREATE INDEX "slots_phone_id_used_at_idx" ON "slots" USING btree ("phone_id","used_at");--> statement-breakpoint
CREATE INDEX "slots_ip_id_used_at_idx" ON "slots" USING btree ("ip_id","used_at");