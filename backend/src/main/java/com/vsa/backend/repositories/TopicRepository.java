package com.vsa.backend.repositories;

import com.vsa.backend.entities.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// Chủ đề. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {

    Optional<Topic> findByName(String name);

    List<Topic> findAllByOrderByNameAsc();
}
