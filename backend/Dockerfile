# Build image backend cho VPS (chạy được cả x86 lẫn ARM/Ampere của Oracle).
# Không cần sửa application.yaml: cấu hình production truyền qua biến môi trường
# (xem deploy/docker-compose.prod.yml).

# ---------- 1. Build file .jar ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---------- 2. Image chạy thật (chỉ JRE, nhẹ hơn) ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system vsa && useradd --system --gid vsa --home /app vsa \
    && mkdir -p /app/uploads && chown -R vsa:vsa /app

COPY --from=build --chown=vsa:vsa /src/target/*.jar app.jar
COPY --chown=vsa:vsa seed-media ./seed-media

USER vsa
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
