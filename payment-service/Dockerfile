# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY common-security ./common-security
COPY payment-service ./payment-service
RUN --mount=type=cache,id=m2-cache,target=/root/.m2 mvn -f common-security install -DskipTests
RUN --mount=type=cache,id=m2-cache,target=/root/.m2 mvn -f payment-service package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/payment-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
