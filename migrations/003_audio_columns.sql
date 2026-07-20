ALTER TABLE debate_arguments ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE debate_arguments ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE debate_arguments ADD COLUMN IF NOT EXISTS transcription TEXT;
