#!/bin/bash
# Build and push Lambda Docker images to ECR
# Usage: ./scripts/build-lambda-images.sh [lambda-name] [version] [ecr-repo]

set -e

LAMBDA_NAME=${1:-"all"}
VERSION=${2:-"latest"}
ECR_REPO=${3:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine if we're building for ECR or local development
if [ -z "$ECR_REPO" ]; then
    if [ -n "$AWS_ACCOUNT_ID" ]; then
        # ECR repository format
        ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-us-east-1}.amazonaws.com"
        USE_ECR=true
    else
        # Local development - use simple tag format
        ECR_REPO=""
        USE_ECR=false
    fi
else
    USE_ECR=true
fi

# Function to build and push a lambda image
build_and_push() {
    local lambda=$1
    local image_name="eventpro-${lambda}"
    
    # Determine image tag based on whether we're using ECR or local
    if [ "$USE_ECR" = true ]; then
        local image_tag="${ECR_REPO}/${image_name}:${VERSION}"
    else
        local image_tag="${image_name}:${VERSION}"
    fi
    
    local dockerfile_path="backend/lambdas/${lambda}/Dockerfile"
    local build_context="backend"

    echo -e "${GREEN}Building ${lambda} Lambda...${NC}"
    
    if [ ! -f "$dockerfile_path" ]; then
        echo -e "${RED}Error: Dockerfile not found at ${dockerfile_path}${NC}"
        return 1
    fi

    # Build the image
    echo -e "${YELLOW}Building Docker image: ${image_tag}${NC}"
    docker build -f "$dockerfile_path" -t "$image_tag" "$build_context" || {
        echo -e "${RED}Failed to build ${lambda} image${NC}"
        return 1
    }

    # Tag as latest if version is not latest
    if [ "$VERSION" != "latest" ]; then
        if [ "$USE_ECR" = true ]; then
            docker tag "$image_tag" "${ECR_REPO}/${image_name}:latest"
        else
            docker tag "$image_tag" "${image_name}:latest"
        fi
    fi

    # Push to ECR (if AWS credentials are available and using ECR)
    if [ "$USE_ECR" = true ] && [ -n "$AWS_ACCOUNT_ID" ] && command -v aws &> /dev/null; then
        echo -e "${YELLOW}Pushing to ECR: ${image_tag}${NC}"
        
        # Login to ECR
        aws ecr get-login-password --region "${AWS_REGION:-us-east-1}" | \
            docker login --username AWS --password-stdin "$ECR_REPO" || {
            echo -e "${YELLOW}Warning: Could not login to ECR. Image built but not pushed.${NC}"
            echo -e "${YELLOW}To push manually, run: docker push ${image_tag}${NC}"
            return 0
        }
        
        # Push image
        docker push "$image_tag" || {
            echo -e "${YELLOW}Warning: Could not push to ECR. Image built locally.${NC}"
            return 0
        }
        
        if [ "$VERSION" != "latest" ]; then
            docker push "${ECR_REPO}/${image_name}:latest"
        fi
        
        echo -e "${GREEN}Successfully pushed ${lambda} Lambda image: ${image_tag}${NC}"
    elif [ "$USE_ECR" = true ]; then
        echo -e "${YELLOW}Warning: AWS credentials not configured. Image built locally but not pushed.${NC}"
        echo -e "${YELLOW}To push manually:${NC}"
        echo -e "  1. Configure AWS credentials: aws configure"
        echo -e "  2. Login to ECR: aws ecr get-login-password --region ${AWS_REGION:-us-east-1} | docker login --username AWS --password-stdin ${ECR_REPO}"
        echo -e "  3. Push image: docker push ${image_tag}"
    else
        echo -e "${GREEN}Image built locally for development: ${image_tag}${NC}"
    fi
}

# Main execution
if [ "$LAMBDA_NAME" = "all" ]; then
    echo -e "${GREEN}Building all Lambda images...${NC}"
    build_and_push "order-processor" || exit 1
    build_and_push "payment-processor" || exit 1
    build_and_push "notification-sender" || exit 1
    echo -e "${GREEN}All Lambda images built successfully!${NC}"
else
    build_and_push "$LAMBDA_NAME" || exit 1
    echo -e "${GREEN}Lambda image built successfully!${NC}"
fi

echo ""
echo -e "${GREEN}Build Summary:${NC}"
echo "  Lambda: $LAMBDA_NAME"
echo "  Version: $VERSION"
if [ "$USE_ECR" = true ]; then
    echo "  ECR Repo: $ECR_REPO"
    echo ""
    echo -e "${YELLOW}To use these images in Terraform, set:${NC}"
    if [ "$LAMBDA_NAME" = "all" ]; then
        echo "  order_processor_lambda_image = \"${ECR_REPO}/eventpro-order-processor:${VERSION}\""
        echo "  payment_processor_lambda_image = \"${ECR_REPO}/eventpro-payment-processor:${VERSION}\""
        echo "  notification_sender_lambda_image = \"${ECR_REPO}/eventpro-notification-sender:${VERSION}\""
    else
        echo "  ${LAMBDA_NAME}_lambda_image = \"${ECR_REPO}/eventpro-${LAMBDA_NAME}:${VERSION}\""
    fi
else
    echo "  Mode: Local development (no ECR)"
    echo ""
    echo -e "${YELLOW}Images built with local tags:${NC}"
    if [ "$LAMBDA_NAME" = "all" ]; then
        echo "  eventpro-order-processor:${VERSION}"
        echo "  eventpro-payment-processor:${VERSION}"
        echo "  eventpro-notification-sender:${VERSION}"
    else
        echo "  eventpro-${LAMBDA_NAME}:${VERSION}"
    fi
fi
