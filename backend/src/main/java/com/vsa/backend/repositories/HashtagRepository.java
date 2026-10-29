package com.vsa.backend.repositories;

import com.vsa.backend.entities.Hashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

// Hashtag. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface HashtagRepository extends JpaRepository<Hashtag, Long> {

    Optional<Hashtag> findByName(String name);

    List<Hashtag> findTop10ByNameContainingIgnoreCaseOrderByNameAsc(String name);
}
