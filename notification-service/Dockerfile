FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY common-security ./common-security
COPY notification-service ./notification-service
RUN --mount=type=cache,target=/root/.m2 mvn -f common-security install -DskipTests
RUN --mount=type=cache,target=/root/.m2 mvn -f notification-service package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/notification-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]