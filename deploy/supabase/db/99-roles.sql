-- Пароли служебных ролей = POSTGRES_PASSWORD. Выполняется один раз при
-- инициализации каталога данных (docker-entrypoint-initdb.d), как в
-- локальном стеке Supabase CLI и в официальном self-hosting.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER postgres WITH PASSWORD :'pgpass';
ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_functions_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_replication_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_read_only_user WITH PASSWORD :'pgpass';
