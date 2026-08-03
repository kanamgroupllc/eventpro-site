-- Basic theming (Iteration 1): promotional video URL and event page template for all tiers
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS promotional_video_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS event_page_template VARCHAR(50) NOT NULL DEFAULT 'DEFAULT';

COMMENT ON COLUMN events.promotional_video_url IS 'Optional YouTube/Vimeo URL for embed on event detail page';
COMMENT ON COLUMN events.event_page_template IS 'Pre-set template: DEFAULT, MINIMAL, VIBRANT';
