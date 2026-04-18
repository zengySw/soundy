ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'primary', '#6366f1',
    'accent', '#8b5cf6',
    'bg', '#0a0a0f',
    'preset', 'dark'
  );

UPDATE users
SET theme_config = jsonb_build_object(
  'primary', COALESCE(theme_config ->> 'primary', '#6366f1'),
  'accent', COALESCE(theme_config ->> 'accent', '#8b5cf6'),
  'bg', COALESCE(theme_config ->> 'bg', '#0a0a0f'),
  'preset', COALESCE(theme_config ->> 'preset', 'dark')
);
