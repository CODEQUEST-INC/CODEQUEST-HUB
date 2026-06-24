FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
RUN apk add --no-cache maven
COPY common-security ./common-security
COPY showcase-service ./showcase-service
RUN mvn -q -f common-security install -DskipTests
RUN mvn -q -f showcase-service package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/showcase-service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
