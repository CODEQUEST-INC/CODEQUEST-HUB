# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY common-security ./common-security
COPY project-service ./project-service
RUN mvn -f common-security install -DskipTests
RUN mvn -f project-service package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/project-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
