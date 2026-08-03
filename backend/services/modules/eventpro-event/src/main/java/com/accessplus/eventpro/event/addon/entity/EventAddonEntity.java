package com.accessplus.eventpro.event.addon.entity;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "event_addons", indexes = {
    @Index(name = "idx_event_addons_event_id", columnList = "event_id"),
    @Index(name = "idx_event_addons_display_order", columnList = "event_id, display_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EventAddonEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, foreignKey = @ForeignKey(name = "fk_addon_event"))
    private EventEntity event;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "sizes_json", columnDefinition = "TEXT")
    private String sizesJson;

    @Column(name = "is_popular", nullable = false)
    private Boolean isPopular = false;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
}
