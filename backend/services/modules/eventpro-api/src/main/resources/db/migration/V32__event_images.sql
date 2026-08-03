-- Multiple images per event for gallery on event detail page.
CREATE TABLE IF NOT EXISTS event_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON event_images(event_id);
COMMENT ON TABLE event_images IS 'Additional event images for gallery; primary image remains on events.image_url.';
