# EventPro API - Modular Monolith

This is the main EventPro API application built as a modular monolith using Spring Boot 4.0.0.

## Architecture

The application is organized into modules with clear boundaries:

- **eventpro-core**: User management, authentication, common utilities
- **eventpro-event**: Event management, tickets, search
- **eventpro-order**: Shopping cart, orders, checkout (synchronous REST API)
- **eventpro-payment**: Payment processing (Stripe) - synchronous REST API
- **eventpro-api**: Main application module (REST API, configuration)

**Note:** Notifications are handled asynchronously by the `notification-sender` Lambda function, not by a Spring Boot module.

## Building

```bash
./gradlew build
```

## Running Locally

```bash
./gradlew :eventpro-api:bootRun
```

Or run the JAR:

```bash
java -jar modules/eventpro-api/build/libs/eventpro-api-1.0.0.jar
```

## Building Docker Image

```bash
docker image build -t eventpro-api:latest .
```

## Module Structure

Each module is a separate Gradle subproject with its own:
- `build.gradle` - Module dependencies
- `src/main/java` - Source code
- `src/test/java` - Tests

Modules communicate via:
- Direct method calls (same JVM)
- Spring dependency injection
- Spring Events (for async communication)

## API Endpoints

- `GET /actuator/health` - Health check
- `GET /actuator/info` - Application info
- `GET /actuator/metrics` - Metrics
- `GET /actuator/prometheus` - Prometheus metrics

## Configuration

Configuration is in `modules/eventpro-api/src/main/resources/application.yml`

Environment variables:
- `DB_URL` - PostgreSQL connection URL
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `COGNITO_CLIENT_ID` - AWS Cognito Client ID
- `AWS_REGION` - AWS region
- `STRIPE_SECRET_KEY` - Stripe secret key
- `S3_BUCKET_NAME` - S3 bucket for images

