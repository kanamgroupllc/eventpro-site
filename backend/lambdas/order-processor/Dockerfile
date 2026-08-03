# Multi-stage Dockerfile for Spring Boot Order Processor Lambda
# Build context: backend/ directory

# Build stage
FROM gradle:9.2.1-jdk21-corretto AS build
WORKDIR /app

COPY lambdas/order-processor ./lambdas/order-processor

WORKDIR /app/lambdas/order-processor
RUN ./gradlew bootJar --no-daemon -x test \
    && mkdir -p build/lambda/lib \
    && cd build/lambda \
    && jar xf ../libs/*.jar \
    && cp -R BOOT-INF/classes/. . \
    && cp BOOT-INF/lib/*.jar lib/

# New Relic Lambda layer payload. New Relic's automatic Java Lambda wrapping
# currently supports Java 21, so keep this in sync with the Lambda base image.
FROM public.ecr.aws/newrelic-lambda-layers-for-docker/newrelic-lambda-layers-java:21 AS newrelic

# Runtime stage shared by AWS and LocalStack.
FROM public.ecr.aws/lambda/java:21 AS runtime-base

COPY --from=build /app/lambdas/order-processor/build/lambda/ /var/task/

# Handler: FunctionInvoker::handleRequest
# Set Lambda env: spring_cloud_function_definition=processOrder
CMD ["org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest"]

# LocalStack selects this target so no New Relic wrapper/extension is present.
FROM runtime-base AS runtime-plain

# Default/AWS target retains New Relic instrumentation support.
FROM runtime-base AS runtime-newrelic
COPY --from=newrelic /opt/ /opt/
