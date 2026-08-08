CREATE TABLE "personal_creator_workspaces" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organisation_id" uuid NOT NULL REFERENCES "organisations"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "personal_creator_workspaces_organisation_unique"
  ON "personal_creator_workspaces" ("organisation_id");
