# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY common-security ./common-security
COPY judging-service ./judging-service
RUN --mount=type=cache,target=/root/.m2 mvn -f common-security install -DskipTests
RUN --mount=type=cache,target=/root/.m2 mvn -f judging-service package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/judging-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
