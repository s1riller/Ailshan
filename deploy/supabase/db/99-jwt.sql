-- Секрет JWT в настройках базы: его читают auth.jwt()/RLS и функции,
-- подписывающие токены на стороне Postgres.
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

ALTER DATABASE postgres SET "app.settings.jwt_secret" TO :'jwt_secret';
ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';
