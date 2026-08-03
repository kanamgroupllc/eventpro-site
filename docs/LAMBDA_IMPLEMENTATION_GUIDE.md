# Lambda Implementation Guide

**Date**: 2025-01-24  
**Framework**: Quarkus 3.26.2+  
**Target**: AWS Lambda Container Images  
**Registry**: Amazon ECR

---

## Table of Contents

<details>
<summary>1. Framework Decision: Quarkus vs Spring Boot</summary>

### Overview

This section documents the framework selection process for AWS Lambda functions in the EventPro Platform.

**Context**: EventPro Platform - Order Processing, Payment Processing, and Notification Lambda functions  
**Current Backend**: Spring Boot 4.0.0 (ECS services)  
**Decision**: ✅ **Quarkus** for all Lambda functions

### Playoff Structure

We compared Spring Boot and Quarkus across **7 critical categories** for Lambda development:
1. **Cold Start Performance** (Most Critical for Lambda) - 30% weight
2. **Memory Footprint** - 15% weight
3. **AWS Lambda Integration** - 20% weight
4. **Native Compilation Support** - 15% weight
5. **Developer Experience** - 10% weight
6. **Ecosystem & Dependencies** - 5% weight
7. **Cost Efficiency** - 5% weight

Each category was scored 1-10, with the winner determined by weighted total points.

### Category 1: Cold Start Performance ⚡

**Weight**: 30% (Most Critical for Lambda)

#### Quarkus
- **Cold Start (JVM)**: ~500-1000ms
- **Cold Start (Native)**: ~50-200ms ⭐
- **Warm Start**: ~10-50ms
- **Native Image**: Compiles to native executable using GraalVM
- **Startup Optimization**: Build-time optimizations, eager initialization
- **Score**: **9/10**

#### Spring Boot
- **Cold Start (JVM)**: ~2000-5000ms
- **Cold Start (Native)**: Limited support, experimental
- **Warm Start**: ~100-300ms
- **Native Image**: Spring Native (experimental, not production-ready)
- **Startup Optimization**: Runtime initialization, reflection-heavy
- **Score**: **4/10**

**Winner**: 🏆 **Quarkus** (9 vs 4)

**Reasoning**: Quarkus is specifically designed for cloud-native, serverless workloads. Native compilation reduces cold starts by 10-20x. Spring Boot's heavy runtime initialization makes it unsuitable for Lambda's cold start requirements.

### Category 2: Memory Footprint 💾

**Weight**: 15%

#### Quarkus
- **JVM Mode**: ~100-200MB baseline
- **Native Mode**: ~50-100MB baseline ⭐
- **Build-time Processing**: Reduces runtime overhead
- **Score**: **9/10**

#### Spring Boot
- **JVM Mode**: ~200-400MB baseline
- **Native Mode**: Not production-ready
- **Runtime Reflection**: Higher memory overhead
- **Score**: **5/10**

**Winner**: 🏆 **Quarkus** (9 vs 5)

**Reasoning**: Quarkus's build-time optimizations and native compilation result in significantly lower memory usage, directly impacting Lambda costs.

### Category 3: AWS Lambda Integration 🔌

**Weight**: 20%

#### Quarkus
- **Official Support**: ✅ `quarkus-amazon-lambda` extension
- **Event Types**: SQS, HTTP API, Application Load Balancer, S3, DynamoDB
- **Testing**: Built-in `LambdaClient` for local testing
- **SAM Templates**: Auto-generated `sam.jvm.yaml` and `sam.native.yaml`
- **Deployment**: `manage.sh` script for create/update/delete
- **Documentation**: Comprehensive AWS Lambda guides
- **Score**: **10/10**

#### Spring Boot
- **Official Support**: ❌ No official AWS Lambda starter
- **Event Types**: Requires manual `RequestHandler` implementation
- **Testing**: Manual mock setup required
- **SAM Templates**: Manual creation
- **Deployment**: Manual AWS CLI/SAM commands
- **Documentation**: Limited, community-driven
- **Score**: **4/10**

**Winner**: 🏆 **Quarkus** (10 vs 4)

**Reasoning**: Quarkus has first-class AWS Lambda support with extensions, testing tools, and deployment automation. Spring Boot requires significant manual configuration.

### Category 4: Native Compilation Support 🚀

**Weight**: 15%

#### Quarkus
- **Status**: ✅ Production-ready
- **GraalVM Integration**: Native
- **Build Time**: 2-5 minutes
- **Compatibility**: Excellent with most libraries
- **Documentation**: Comprehensive native image guides
- **Score**: **10/10**

#### Spring Boot
- **Status**: ⚠️ Experimental (Spring Native)
- **GraalVM Integration**: Limited
- **Build Time**: 5-15 minutes
- **Compatibility**: Many libraries incompatible
- **Documentation**: Limited, experimental
- **Score**: **3/10**

**Winner**: 🏆 **Quarkus** (10 vs 3)

**Reasoning**: Quarkus was built from the ground up for native compilation. Spring Native is experimental and not recommended for production.

### Category 5: Developer Experience 👨‍💻

**Weight**: 10%

#### Quarkus
- **Learning Curve**: Moderate (new framework)
- **Code Generation**: Dev mode with hot reload
- **IDE Support**: Good (IntelliJ, VS Code)
- **Documentation**: Excellent
- **Community**: Growing, but smaller than Spring
- **Score**: **7/10**

#### Spring Boot
- **Learning Curve**: Low (team already knows it)
- **Code Generation**: Dev mode with hot reload
- **IDE Support**: Excellent (IntelliJ, VS Code)
- **Documentation**: Excellent
- **Community**: Large, mature
- **Score**: **8/10**

**Winner**: 🏆 **Spring Boot** (8 vs 7)

**Reasoning**: Since the team already uses Spring Boot for ECS services, there's familiarity. However, Quarkus's Lambda-specific tooling partially offsets this.

### Category 6: Ecosystem & Dependencies 📦

**Weight**: 5%

#### Quarkus
- **Dependencies**: ✅ Hibernate ORM, AWS SDK v2, Stripe SDK
- **Extensions**: Rich ecosystem (1000+ extensions)
- **Compatibility**: Most Java libraries work
- **Score**: **8/10**

#### Spring Boot
- **Dependencies**: ✅ Spring Data JPA, AWS SDK v2, Stripe SDK
- **Extensions**: Massive ecosystem
- **Compatibility**: Excellent
- **Score**: **9/10**

**Winner**: 🏆 **Spring Boot** (9 vs 8)

**Reasoning**: Spring Boot has a larger ecosystem, but Quarkus has all the dependencies we need for Lambda functions.

### Category 7: Cost Efficiency 💰

**Weight**: 5%

#### Quarkus
- **Memory**: Lower memory = lower Lambda costs
- **Cold Starts**: Fewer cold starts = better performance = lower costs
- **Execution Time**: Faster execution = lower costs
- **Estimated Savings**: 30-50% vs Spring Boot
- **Score**: **9/10**

#### Spring Boot
- **Memory**: Higher memory = higher Lambda costs
- **Cold Starts**: More frequent cold starts = higher costs
- **Execution Time**: Slower execution = higher costs
- **Estimated Savings**: Baseline
- **Score**: **5/10**

**Winner**: 🏆 **Quarkus** (9 vs 5)

**Reasoning**: Lower memory footprint and faster cold starts directly translate to lower AWS Lambda costs.

### Final Scores

#### Weighted Scoring

| Category | Weight | Quarkus | Spring Boot |
|----------|--------|---------|-------------|
| Cold Start Performance | 30% | 9 × 0.30 = **2.7** | 4 × 0.30 = **1.2** |
| Memory Footprint | 15% | 9 × 0.15 = **1.35** | 5 × 0.15 = **0.75** |
| AWS Lambda Integration | 20% | 10 × 0.20 = **2.0** | 4 × 0.20 = **0.8** |
| Native Compilation | 15% | 10 × 0.15 = **1.5** | 3 × 0.15 = **0.45** |
| Developer Experience | 10% | 7 × 0.10 = **0.7** | 8 × 0.10 = **0.8** |
| Ecosystem & Dependencies | 5% | 8 × 0.05 = **0.4** | 9 × 0.05 = **0.45** |
| Cost Efficiency | 5% | 9 × 0.05 = **0.45** | 5 × 0.05 = **0.25** |
| **TOTAL** | **100%** | **9.1/10** | **4.7/10** |

### 🏆 Winner: Quarkus (9.1 vs 4.7)

**Quarkus wins by 93% margin**

### Key Decision Factors

#### Why Quarkus Wins:

1. **Cold Start Performance** (30% weight): Quarkus native compilation achieves 50-200ms cold starts vs Spring Boot's 2000-5000ms. This is critical for Lambda's pay-per-invocation model.

2. **AWS Lambda Integration** (20% weight): Quarkus has first-class AWS Lambda support with extensions, testing tools, and deployment automation. Spring Boot requires manual configuration.

3. **Native Compilation** (15% weight): Quarkus native images are production-ready. Spring Native is experimental and not recommended for production.

4. **Cost Efficiency**: Lower memory footprint and faster cold starts result in 30-50% cost savings.

#### Why Spring Boot Loses:

1. **Cold Start Performance**: Spring Boot's heavy runtime initialization makes it unsuitable for Lambda's cold start requirements.

2. **No Official Lambda Support**: Requires manual `RequestHandler` implementation and manual deployment configuration.

3. **Native Compilation**: Spring Native is experimental and not production-ready.

4. **Memory Overhead**: Higher memory usage increases Lambda costs.

### Recommendation

**✅ Use Quarkus for all Lambda functions**

#### Implementation Plan:

1. **Order Processing Lambda** (`backend/lambdas/order-processor`)
   - Use Quarkus 3.26.2+
   - Native compilation for production
   - SQS event source integration

2. **Payment Processing Lambda** (`backend/lambdas/payment-processor`)
   - Use Quarkus 3.26.2+
   - Native compilation for production
   - SQS event source integration
   - Stripe SDK integration

3. **Notification Sender Lambda** (`backend/lambdas/notification-sender`)
   - Use Quarkus 3.26.2+
   - Native compilation for production
   - SQS event source integration
   - AWS SES/SNS integration

#### Migration Strategy:

- **Keep Spring Boot for ECS services** (already implemented)
- **Use Quarkus for Lambda functions** (new implementation)
- This aligns with the existing plan.md specification: "Spring Boot for ECS services only (Quarkus for Lambda)"

### References

- Quarkus AWS Lambda Guide: https://quarkus.io/guides/amazon-lambda
- Spring Boot AWS Lambda: Limited official documentation
- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html

### Conclusion

**Quarkus is the clear winner** for Lambda functions due to:
- Superior cold start performance (critical for Lambda)
- First-class AWS Lambda integration
- Production-ready native compilation
- Lower memory footprint and costs
- Better alignment with serverless architecture

The slight learning curve for Quarkus is offset by the significant performance and cost benefits, especially for high-frequency Lambda invocations in an event-driven architecture.

</details>

<details>
<summary>2. Docker Setup Summary</summary>

### Overview

This section provides a quick summary of the Docker setup for Quarkus Lambda functions.

**Status**: ✅ Complete

### What Was Created

#### 1. Dockerfiles for Quarkus Lambdas

✅ **Order Processor Lambda**
- `backend/lambdas/order-processor/Dockerfile` (JVM - Development)
- `backend/lambdas/order-processor/Dockerfile.native` (Native - Production)
- `backend/lambdas/order-processor/.dockerignore`

✅ **Payment Processor Lambda**
- `backend/lambdas/payment-processor/Dockerfile` (JVM)
- `backend/lambdas/payment-processor/.dockerignore`

✅ **Notification Sender Lambda**
- `backend/lambdas/notification-sender/Dockerfile` (JVM)
- `backend/lambdas/notification-sender/.dockerignore`

#### 2. CI/CD Integration

✅ **GitLab CI/CD Jobs Added** (`.gitlab-ci.yml`):
- `docker-build-order-processor-lambda`
- `docker-build-payment-processor-lambda`
- `docker-build-notification-sender-lambda`

✅ **Terraform Integration**:
- Updated `terraform-deploy-eventpro` to include Lambda image variables
- Updated `terraform-destroy-eventpro` to include Lambda image variables

#### 3. Documentation

✅ **Comprehensive Guide**: This document
- Dockerfile options (JVM vs Native)
- Building and pushing to ECR
- CI/CD integration
- Local testing
- Terraform integration
- Troubleshooting

### File Structure

```
backend/
└── lambdas/
    ├── order-processor/
    │   ├── Dockerfile              # JVM build (development)
    │   ├── Dockerfile.native       # Native build (production)
    │   └── .dockerignore
    ├── payment-processor/
    │   ├── Dockerfile              # JVM build
    │   └── .dockerignore
    └── notification-sender/
        ├── Dockerfile              # JVM build
        └── .dockerignore

.gitlab-ci.yml                      # Updated with Lambda build jobs
LAMBDA_IMPLEMENTATION_GUIDE.md      # This comprehensive guide
```

### Key Benefits

✅ **Containerized Deployment**: Use Docker images instead of zip files  
✅ **Version Control**: Tag images with versions for rollback capability  
✅ **CI/CD Integration**: Automated builds and deployments  
✅ **Native Support**: Option for ultra-fast cold starts  
✅ **ECR Integration**: Secure, managed container registry

### Quick Reference

#### Build Image
```bash
cd backend/lambdas/order-processor
docker image build -t eventpro-order-processor:latest -f Dockerfile .
```

#### Push to ECR
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
docker image push ${ECR_REGISTRY}/eventpro-order-processor:latest
```

#### Deploy with Terraform
```bash
terraform apply \
  -var="order_processor_lambda_image=${ECR_REGISTRY}/eventpro-order-processor:${VERSION}"
```

</details>

<details>
<summary>3. Docker Deployment Guide</summary>

### Overview

This section provides detailed instructions for dockerizing Quarkus Lambda functions and pushing them to Amazon ECR for deployment to AWS Lambda.

### Dockerfile Options

#### Option 1: JVM Dockerfile (Recommended for Development)

**File**: `backend/lambdas/order-processor/Dockerfile`

```dockerfile
# Multi-stage Dockerfile for Quarkus Order Processor Lambda (JVM)
# This builds a container image for AWS Lambda
# Build context: backend/ directory

# Build stage
FROM gradle:9.2.1-jdk25-corretto AS build
WORKDIR /app

# Copy entire lambda directory structure
COPY lambdas/order-processor ./lambdas/order-processor

# Copy shared module (for composite build)
COPY shared ./shared

# Build the Quarkus application
WORKDIR /app/lambdas/order-processor
RUN ./gradlew build --no-daemon -x test

# Runtime stage - Use AWS Lambda Java base image
FROM public.ecr.aws/lambda/java:25

# Copy the Quarkus runner JAR and dependencies
COPY --from=build /app/lambdas/order-processor/build/quarkus-app/lib/ /var/task/lib/
COPY --from=build /app/lambdas/order-processor/build/*-runner.jar /var/task/lib/quarkus-lambda.jar

# Set the handler
CMD ["io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"]
```

**Pros**:
- ✅ Faster build times (~2-5 minutes)
- ✅ Easier debugging (standard JVM)
- ✅ Better compatibility with libraries
- ✅ Smaller image size than full JVM

**Cons**:
- ❌ Slower cold starts (~500-1000ms)
- ❌ Higher memory usage (~100-200MB)

#### Option 2: Native Dockerfile (Recommended for Production)

**File**: `backend/lambdas/order-processor/Dockerfile.native`

```dockerfile
# Multi-stage Dockerfile for Quarkus Order Processor Lambda (Native)
# This builds a native container image for AWS Lambda
# Build context: backend/ directory

# Build stage
FROM ghcr.io/graalvm/native-image-community:25 AS build
WORKDIR /app

# Copy entire lambda directory structure
COPY lambdas/order-processor ./lambdas/order-processor

# Copy shared module (for composite build)
COPY shared ./shared

# Build native executable
WORKDIR /app/lambdas/order-processor
RUN ./gradlew build -Dquarkus.package.type=native --no-daemon -x test

# Runtime stage - Use AWS Lambda provided runtime
FROM public.ecr.aws/lambda/provided:al2

# Copy the native executable
COPY --from=build /app/lambdas/order-processor/build/*-runner /var/runtime/bootstrap

# Make executable
RUN chmod 755 /var/runtime/bootstrap

# Set the handler
CMD ["io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"]
```

**Pros**:
- ✅ Fastest cold starts (~50-200ms)
- ✅ Lowest memory usage (~50-100MB)
- ✅ Best cost efficiency

**Cons**:
- ❌ Longer build times (~5-15 minutes)
- ❌ Requires Docker-in-Docker for CI/CD
- ❌ Some libraries may not be compatible

### Building Docker Images

#### Prerequisites

1. **Docker** installed and running
2. **AWS CLI** configured with appropriate credentials
3. **ECR Repository** created (see below)

#### Create ECR Repository

```bash
# Set variables
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Create ECR repository
aws ecr create-repository \
  --repository-name eventpro-order-processor \
  --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

Repeat for:
- `eventpro-payment-processor`
- `eventpro-notification-sender`

#### Build JVM Image (Development)

```bash
cd backend

# Build Docker image (build context is backend/ directory)
docker image build -t eventpro-order-processor:latest \
  -f lambdas/order-processor/Dockerfile .

# Tag for ECR
docker image tag eventpro-order-processor:latest \
  ${ECR_REGISTRY}/eventpro-order-processor:latest

# Tag with version
VERSION=1.0.0
docker image tag eventpro-order-processor:latest \
  ${ECR_REGISTRY}/eventpro-order-processor:${VERSION}
```

#### Build Native Image (Production)

```bash
cd backend

# Build native Docker image (requires Docker-in-Docker)
docker image build -t eventpro-order-processor:native \
  -f lambdas/order-processor/Dockerfile.native .

# Tag for ECR
docker image tag eventpro-order-processor:native \
  ${ECR_REGISTRY}/eventpro-order-processor:native-${VERSION}
```

**Note**: Native builds require Docker-in-Docker or a build environment with GraalVM. For CI/CD, use the `docker:dind` service.

### Pushing to ECR

#### Authenticate Docker with ECR

```bash
# Get ECR login token
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
```

#### Push Images

```bash
# Push JVM image
docker image push ${ECR_REGISTRY}/eventpro-order-processor:latest
docker image push ${ECR_REGISTRY}/eventpro-order-processor:${VERSION}

# Push native image (if built)
docker image push ${ECR_REGISTRY}/eventpro-order-processor:native-${VERSION}
```

#### Verify Push

```bash
# List images in repository
aws ecr list-images \
  --repository-name eventpro-order-processor \
  --region ${AWS_REGION}
```

### CI/CD Integration

#### GitLab CI/CD

The `.gitlab-ci.yml` file includes jobs for building and pushing Lambda images:

```yaml
docker-build-order-processor-lambda:
  extends: .docker-build-ecr
  needs:
    - job: calculate-version
      artifacts: true
    - job: gradle-build-backend
  script:
    - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
    - cd backend
    - docker image build -t $ECR_REGISTRY/eventpro-order-processor:$VERSION -f lambdas/order-processor/Dockerfile .
    - docker image push $ECR_REGISTRY/eventpro-order-processor:$VERSION
```

**Jobs Added**:
- `docker-build-order-processor-lambda`
- `docker-build-payment-processor-lambda`
- `docker-build-notification-sender-lambda`

#### Required CI/CD Variables

Ensure these are set in GitLab CI/CD settings:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (default: `us-east-1`)
- `ECR_REGISTRY` (auto-calculated from AWS_ACCOUNT_ID and AWS_REGION)

### Local Testing

#### Test Lambda Container Locally

```bash
# Build image
cd backend
docker image build -t eventpro-order-processor:test -f lambdas/order-processor/Dockerfile .

# Run container locally
docker run -p 9000:8080 \
  -e AWS_LAMBDA_RUNTIME_API=localhost:9000 \
  eventpro-order-processor:test

# Test with SAM CLI
sam local invoke OrderProcessorFunction \
  --template sam.jvm.yaml \
  --event test-event.json
```

#### Test with AWS Lambda Runtime Interface Emulator (RIE)

```bash
# Pull RIE
docker pull public.ecr.aws/lambda/java:25

# Run with RIE
docker run -p 9000:8080 \
  -e AWS_LAMBDA_RUNTIME_API=localhost:9000 \
  eventpro-order-processor:test
```

#### Test SQS Event

```bash
# Create test event file
cat > test-sqs-event.json <<EOF
{
  "Records": [
    {
      "messageId": "test-message-id",
      "body": "{\"orderId\":\"123e4567-e89b-12d3-a456-426614174000\"}",
      "attributes": {
        "ApproximateReceiveCount": "1"
      }
    }
  ]
}
EOF

# Invoke locally
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d @test-sqs-event.json
```

### Terraform Integration

#### Update Terraform Variables

Add Lambda image variables to `infrastructure/environments/dev/variables.tf`:

```hcl
variable "order_processor_lambda_image" {
  description = "Docker image URI for order processor Lambda function"
  type        = string
  default     = ""
}

variable "payment_processor_lambda_image" {
  description = "Docker image URI for payment processor Lambda function"
  type        = string
  default     = ""
}

variable "notification_sender_lambda_image" {
  description = "Docker image URI for notification sender Lambda function"
  type        = string
  default     = ""
}
```

#### Create Lambda Module

Create `infrastructure/modules/lambda/main.tf`:

```hcl
# Lambda Function Module
resource "aws_lambda_function" "main" {
  function_name = "${var.name_prefix}-${var.function_name}"
  package_type  = "Image"
  image_uri     = var.image_uri

  role    = aws_iam_role.lambda.arn
  timeout = var.timeout
  memory_size = var.memory_size

  environment {
    variables = var.environment_variables
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.function_name}"
    }
  )
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "sqs" {
  count            = var.sqs_queue_arn != null ? 1 : 0
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.main.arn
  batch_size       = var.batch_size
  enabled          = true
}
```

#### Deploy with Terraform

```bash
cd infrastructure/environments/dev

terraform apply \
  -var="order_processor_lambda_image=${ECR_REGISTRY}/eventpro-order-processor:${VERSION}" \
  -var="payment_processor_lambda_image=${ECR_REGISTRY}/eventpro-payment-processor:${VERSION}" \
  -var="notification_sender_lambda_image=${ECR_REGISTRY}/eventpro-notification-sender:${VERSION}"
```

### Image Size Comparison

| Type | Image Size | Cold Start | Memory |
|------|-----------|------------|--------|
| JVM | ~200-300MB | 500-1000ms | 100-200MB |
| Native | ~50-100MB | 50-200ms | 50-100MB |

### Best Practices

#### 1. Use Multi-Stage Builds
- ✅ Reduces final image size
- ✅ Separates build and runtime dependencies

#### 2. Layer Caching
- ✅ Copy dependency files first (`build.gradle`, `gradle/`)
- ✅ Copy source code last
- ✅ Leverages Docker layer caching

#### 3. Security
- ✅ Scan images with ECR image scanning
- ✅ Use least-privilege IAM roles
- ✅ Keep base images updated

#### 4. Versioning
- ✅ Tag images with semantic versions
- ✅ Use `latest` for development only
- ✅ Use commit SHA for traceability

#### 5. Monitoring
- ✅ Enable CloudWatch Logs
- ✅ Monitor cold start metrics
- ✅ Track memory and CPU usage

### Troubleshooting

#### Build Fails: "Cannot find Gradle wrapper"

**Solution**: Ensure `gradlew` and `gradle/` directory are in the Lambda directory.

```bash
cd backend/lambdas/order-processor
ls -la gradlew gradle/
```

#### Push Fails: "no basic auth credentials"

**Solution**: Re-authenticate with ECR:

```bash
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
```

#### Lambda Fails: "Handler not found"

**Solution**: Ensure CMD in Dockerfile matches Quarkus handler:

```dockerfile
CMD ["io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"]
```

#### Native Build Fails: "Out of memory"

**Solution**: Increase Docker memory limit or use JVM build:

```bash
# Use JVM build instead
docker image build -f Dockerfile .
```

### References

- [Quarkus AWS Lambda Guide](https://quarkus.io/guides/amazon-lambda)
- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [ECR Getting Started](https://docs.aws.amazon.com/ecr/latest/userguide/getting-started-cli.html)
- [Lambda Dockerfile Examples](https://github.com/aws/aws-lambda-base-images)

</details>

<details>
<summary>4. Next Steps</summary>

### Implementation Checklist

#### 1. Create ECR Repositories

Run these commands to create ECR repositories:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create repositories
for repo in eventpro-order-processor eventpro-payment-processor eventpro-notification-sender; do
  aws ecr create-repository \
    --repository-name ${repo} \
    --region ${AWS_REGION} \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256
done
```

#### 2. Update Terraform Variables

Add to `infrastructure/environments/dev/variables.tf`:

```hcl
variable "order_processor_lambda_image" {
  description = "Docker image URI for order processor Lambda function"
  type        = string
  default     = ""
}

variable "payment_processor_lambda_image" {
  description = "Docker image URI for payment processor Lambda function"
  type        = string
  default     = ""
}

variable "notification_sender_lambda_image" {
  description = "Docker image URI for notification sender Lambda function"
  type        = string
  default     = ""
}
```

#### 3. Create Lambda Terraform Module

Create `infrastructure/modules/lambda/` with:
- `main.tf` - Lambda function resource
- `variables.tf` - Module variables
- `outputs.tf` - Module outputs

See section 3 above for example code.

#### 4. Test Locally

```bash
# Build and test order processor
cd backend
docker image build -t eventpro-order-processor:test -f lambdas/order-processor/Dockerfile .
docker run -p 9000:8080 eventpro-order-processor:test
```

#### 5. Deploy via CI/CD

Once ECR repositories are created and Terraform is updated:
1. Push code to trigger CI/CD pipeline
2. Pipeline will build Docker images
3. Pipeline will push to ECR
4. Terraform will deploy Lambda functions with container images

### Summary

✅ **JVM Dockerfile** (`Dockerfile`) - Use for development, faster builds  
✅ **Native Dockerfile** (`Dockerfile.native`) - Use for production, faster cold starts  
✅ **CI/CD Integration** - Automated builds and pushes to ECR  
✅ **Terraform Integration** - Infrastructure as code for Lambda deployment

</details>

---

## Quick Reference

### Build Commands

```bash
# JVM Build
cd backend
docker image build -t eventpro-order-processor:latest -f lambdas/order-processor/Dockerfile .

# Native Build
docker image build -t eventpro-order-processor:native -f lambdas/order-processor/Dockerfile.native .
```

### Push to ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}
docker image push ${ECR_REGISTRY}/eventpro-order-processor:latest
```

### Deploy with Terraform

```bash
terraform apply \
  -var="order_processor_lambda_image=${ECR_REGISTRY}/eventpro-order-processor:${VERSION}"
```

---

## Support

For detailed instructions, refer to the collapsible sections above:
- **Section 1**: Framework decision rationale
- **Section 2**: Quick setup summary
- **Section 3**: Detailed deployment guide
- **Section 4**: Next steps and checklist

