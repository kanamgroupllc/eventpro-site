# Multi-stage build for EventPro API (Modular Monolith)
# Build context: backend/ directory
FROM gradle:9.2.1-jdk25-corretto AS build
WORKDIR /app



# Copy entire services directory structure
# (Jerome's question - why don't we only copy the build.gradle and settings.gradle files first,
# run a dependencies download step, and then copy the source code) This way, if the code changes but our dependencies don't, we don't have to re-download them.
# This would also be faster, as we wouldn't have to download the entire source code again.
COPY services ./services

# Build the application from services directory
WORKDIR /app/services
RUN ./gradlew :eventpro-api:bootJar --no-daemon -x test

# Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# ECS container health check uses curl (/actuator/health)
RUN apk add --no-cache curl

# Download New Relic Java agent into the runtime image.
RUN mkdir -p /opt/newrelic \
  && curl -fsSL "https://download.newrelic.com/newrelic/java-agent/newrelic-agent/current/newrelic.jar" -o /opt/newrelic/newrelic.jar

# Copy the built JAR
COPY --from=build /app/services/modules/eventpro-api/build/libs/eventpro-api-*.jar app.jar

# Set Java options for container
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -javaagent:/opt/newrelic/newrelic.jar"

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
