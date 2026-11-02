package com.vsa.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// Test luôn chạy với AI tắt, kể cả khi máy có file ai-local.yaml (không cần key, không cần pgvector)
@SpringBootTest(properties = "spring.profiles.active=test")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
