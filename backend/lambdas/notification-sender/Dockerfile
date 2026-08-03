# Multi-stage Dockerfile for Spring Boot Notification Sender Lambda
# Build context: backend/

FROM gradle:9.2.1-jdk21-corretto AS build
WORKDIR /app

COPY lambdas/notification-sender ./lambdas/notification-sender

WORKDIR /app/lambdas/notification-sender
RUN ./gradlew bootJar --no-daemon -x test \
    && mkdir -p build/lambda/lib \
    && cd build/lambda \
    && jar xf ../libs/*.jar \
    && cp -R BOOT-INF/classes/. . \
    && cp BOOT-INF/lib/*.jar lib/

FROM public.ecr.aws/newrelic-lambda-layers-for-docker/newrelic-lambda-layers-java:21 AS newrelic

FROM public.ecr.aws/lambda/java:21 AS runtime-base

COPY --from=build /app/lambdas/notification-sender/build/lambda/ /var/task/

# Handler: FunctionInvoker::handleRequest
# Set Lambda env: spring_cloud_function_definition=sendNotification
CMD ["org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest"]

FROM runtime-base AS runtime-plain

FROM runtime-base AS runtime-newrelic
COPY --from=newrelic /opt/ /opt/
