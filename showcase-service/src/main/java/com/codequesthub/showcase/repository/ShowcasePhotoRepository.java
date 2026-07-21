package com.codequesthub.showcase.repository;

import com.codequesthub.showcase.entity.ShowcasePhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ShowcasePhotoRepository extends JpaRepository<ShowcasePhoto, UUID> {
    List<ShowcasePhoto> findByEntryIdOrderByPositionAsc(UUID entryId);
    List<ShowcasePhoto> findByEntryIdInOrderByPositionAsc(List<UUID> entryIds);
    long countByEntryId(UUID entryId);
    void deleteByEntryId(UUID entryId);
}
