-- Event add-ons / enhancements (merchandise, add-ons, upgrades) per event - organizer configurable
CREATE TABLE event_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    sizes_json TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_addon_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_event_addons_event_id ON event_addons(event_id);
CREATE INDEX idx_event_addons_display_order ON event_addons(event_id, display_order);
