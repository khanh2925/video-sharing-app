package com.vsa.backend.repositories;

import com.vsa.backend.entities.User;
import com.vsa.backend.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// Người dùng. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // UC04 – tìm kiếm người dùng (Thanh)
    Page<User> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String username, String displayName, Pageable pageable);

    // ===== UC12 – Gợi ý tài khoản ("Suggestions for you") =====
    // Người dùng thường (không gợi ý quản trị viên), chưa bị khoá, không phải mình, mình chưa theo dõi; mới tham gia trước.
    // Pageable chỉ dùng để giới hạn số lượng (LIMIT N).
    @Query("""
            SELECT u FROM User u
            WHERE u.id <> :meId
              AND u.role = :role
              AND u.locked = false
              AND NOT EXISTS (SELECT f.id FROM Follow f
                              WHERE f.follower.id = :meId
                                AND f.following.id = u.id)
            ORDER BY u.createdAt DESC, u.id DESC
            """)
    List<User> findSuggestions(@Param("meId") Long meId,
                               @Param("role") Role role,
                               Pageable pageable);
}
