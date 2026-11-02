package com.vsa.backend.repositories;

import com.vsa.backend.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

// Người dùng. JpaRepository có sẵn: findById, findAll(Pageable), save, delete, count...
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    // Tuần tự hoá yêu cầu tạo live của cùng một tài khoản trên nhiều thiết bị.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForLiveCreation(@Param("id") Long id);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    Page<User> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String username, String displayName, Pageable pageable);

    // UC04 tìm tài khoản: chỉ người dùng thường chưa bị khoá (giống điều kiện gợi ý bên dưới),
    // tên đăng nhập hoặc tên hiển thị chứa từ khoá. :query đã được SearchService thoát %, _, ! sẵn.
    @Query("""
            select u from User u
            where u.role = com.vsa.backend.enums.Role.USER
              and u.locked = false
              and (lower(u.username) like lower(concat('%', :query, '%')) escape '!'
                   or lower(coalesce(u.displayName, '')) like lower(concat('%', :query, '%')) escape '!')
            order by u.id asc
            """)
    Page<User> searchAccounts(@Param("query") String query, Pageable pageable);

    // UC12 gợi ý: người dùng thường (không gợi ý quản trị viên), chưa bị khoá, không phải mình,
    // mình chưa theo dõi; nhiều người theo dõi xếp trước
    @Query("""
            select u from User u
            left join Follow f on f.following = u
            where u.id <> :viewerId
              and u.role = com.vsa.backend.enums.Role.USER
              and u.locked = false
              and u.id not in (select f2.following.id from Follow f2 where f2.follower.id = :viewerId)
            group by u
            order by count(f) desc, u.id asc
            """)
    List<User> findSuggestions(@Param("viewerId") Long viewerId, Pageable pageable);

    // ===== Trang quản trị (UC16) =====

    // Danh sách tài khoản cho quản trị viên: locked = null là tất cả, tìm theo tên đăng nhập / tên hiển thị / email.
    @Query("""
            select u from User u
            where (:locked is null or u.locked = :locked)
              and (lower(u.username) like lower(concat('%', :query, '%')) escape '!'
                   or lower(coalesce(u.displayName, '')) like lower(concat('%', :query, '%')) escape '!'
                   or lower(u.email) like lower(concat('%', :query, '%')) escape '!')
            order by u.createdAt desc
            """)
    Page<User> searchForAdmin(@Param("query") String query, @Param("locked") Boolean locked, Pageable pageable);

    long countByLocked(boolean locked);
}
