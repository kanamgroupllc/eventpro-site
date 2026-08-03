.PHONY: help clean build test verify all build-frontend web-dev web-preview api-run api-test clean-services build-services docker-build build-backend jwt-keys \
	build-core build-event build-order build-payment build-order-processor build-payment-processor build-notification-sender build-lambdas build-analytics \
	tf-deploy-shared-infra tf-deploy-services tf-deploy-frontend tf-deploy-lambda-order tf-deploy-lambda-payment tf-deploy-lambda-notification tf-deploy-lambdas tf-deploy-all \
	tf-destroy-shared-infra tf-destroy-services tf-destroy-frontend tf-destroy-lambda-order tf-destroy-lambda-payment tf-destroy-lambda-notification tf-destroy-lambdas tf-destroy-all tf-destroy \
	aws-plan aws-deploy aws-verify-csrf verify-csrf lstk-verify-csrf lstk-init lstk-plan lstk-deploy lstk-verify lstk-destroy \
	lstk-start lstk-stop lstk-state-bucket lstk-route53-zone lstk-endpoints lstk-tf-shared-infra lstk-tf-services lstk-tf-frontend lstk-tf-lambda-order lstk-tf-lambda-payment lstk-tf-lambda-notification lstk-tf-lambdas lstk-tf-all lstk-tf-destroy-all lstk-redeploy \
	lstk-redeploy-services lstk-redeploy-frontend lstk-redeploy-lambda-order lstk-redeploy-lambda-payment lstk-redeploy-lambda-notification lstk-redeploy-lambdas \
	newrelic-lambda-preflight newrelic-lambda-verify-config

# Variables
API_DIR := backend/services
WEB_DIR := eventpro-frontend
ANALYTICS_DIR := backend/lambdas/analytics-service
ORDER_DIR := backend/lambdas/order-processor
PAYMENT_DIR := backend/lambdas/payment-processor
NOTIFICATION_DIR := backend/lambdas/notification-sender
# SECRET_ROTATION_DIR := backend/lambdas/secret-rotation  # Removed - RDS manages credential rotation natively
TF_WORKSPACE ?= dev
TF_ENV_FILE ?= .env.remote
TF_STATE_BUCKET ?= eventpro-site-state
TF_STATE_REGION ?= us-east-1
LSTK_ENV_FILE ?= .env.lstk
LSTK_SECRET_ENV_FILE ?= .env.remote
LSTK_COMPOSE_FILE ?= docker-compose.lstk.yml
LSTK_WORKSPACE ?= lstk
LSTK_TF_ACTION ?= plan
TF_IMAGE_TAG_VAR = $(if $(IMAGE_TAG),-var="image_tag=$(IMAGE_TAG)",)
PIPELINE_ACTION ?= apply
PIPELINE_ACTION_FLAG := --$(PIPELINE_ACTION)
PIPELINE_IMAGE_TAG_ARG = $(if $(IMAGE_TAG),--image-tag "$(IMAGE_TAG)",)
SERVICES_IMAGE_SOURCE ?= build
LAMBDAS_IMAGE_SOURCE ?= build
LAMBDA_TARGETS ?= order-processor,payment-processor,notification-sender
CSRF_ENABLED ?= true

# Terraform reserves TF_WORKSPACE as an environment variable. We keep the Make
# variable name for CLI ergonomics (e.g. `make ... TF_WORKSPACE=dev`) but do not
# export it into shell recipes, otherwise `terraform workspace select` fails.
unexport TF_WORKSPACE

# Default target
.DEFAULT_GOAL := help

# Help target
help:
	@echo "EventPro Site - Makefile Commands"
	@echo ""
	@echo "All Projects:"
	@echo "  make clean          - Clean all projects"
	@echo "  make build          - Build all projects"
	@echo "  make test           - Test all projects"
	@echo "  make verify         - Clean, build, and test all projects"
	@echo ""
	@echo "Backend & Services:"
	@echo "  make build-backend             - Build API and all backend Lambdas"
	@echo "  make build-services            - Build EventPro API"
	@echo "  make clean-services            - Clean EventPro API"
	@echo "  make api-test                  - Test EventPro API"
	@echo "  make api-run                   - Run EventPro API locally"
	@echo "  make api                       - Clean, build, and test EventPro API"
	@echo ""
	@echo "Backend Lambdas:"
	@echo "  make build-lambdas             - Build all backend Lambdas"
	@echo "  make build-order-processor     - Build order-processor Lambda"
	@echo "  make build-payment-processor   - Build payment-processor Lambda"
	@echo "  make build-notification-sender - Build notification-sender Lambda"
	@echo ""
	@echo "Individual Modules:"
	@echo "  make build-core     - Build eventpro-core module"
	@echo "  make build-event    - Build eventpro-event module"
	@echo "  make build-order    - Build eventpro-order module"
	@echo "  make build-payment  - Build eventpro-payment module"
	@echo ""
	@echo "Analytics Service Lambda:"
	@echo "  make build-analytics - Build Analytics Service"
	@echo "  make analytics-clean - Clean Analytics Service"
	@echo "  make analytics-test  - Test Analytics Service"
	@echo "  make analytics       - Clean, build, and test Analytics Service"
	@echo ""
	@echo "Web Frontend (React + Vite):"
	@echo "  make build-frontend - Build Web Frontend"
	@echo "  make web-dev        - Start Frontend development server"
	@echo "  make web-preview    - Preview Frontend production build"
	@echo ""
	@echo "Docker Images:"
	@echo "  make docker-build   - Build EventPro API Docker image"
	@echo "  make docker-analytics - Build Analytics Service Docker image"
	@echo "  make lambda-build   - Build all Lambda Docker images"
	@echo "  make lambda-build-order - Build order-processor Lambda image"
	@echo "  make lambda-build-payment - Build payment-processor Lambda image"
	@echo "  make lambda-build-notification - Build notification-sender Lambda image"
	@echo ""
	@echo "AWS Terraform Deploy (set TF_WORKSPACE=dev|prod, TF_ENV_FILE=.env.remote; IMAGE_TAG optional for services/lambdas):"
	@echo "  make aws-plan                       - Plan every real AWS stack with target safeguards"
	@echo "  make aws-deploy                     - Deploy every real AWS stack with target safeguards"
	@echo "  make verify-csrf                    - Verify browser CSRF/CORS against the selected AWS workspace"
	@echo "  make aws-verify-csrf                - Same as verify-csrf"
	@echo "  make tf-deploy-shared-infra         - Deploy shared infrastructure stack"
	@echo "  make tf-deploy-services IMAGE_TAG=x - Build/push/deploy services (CSRF_ENABLED=true|false)"
	@echo "  make tf-deploy-frontend             - Deploy frontend Terraform stack"
	@echo "  make tf-deploy-lambda-order IMAGE_TAG=x - Build/push/deploy order lambda via pipeline-deploy.sh"
	@echo "  make tf-deploy-lambda-payment IMAGE_TAG=x - Build/push/deploy payment lambda via pipeline-deploy.sh"
	@echo "  make tf-deploy-lambda-notification IMAGE_TAG=x - Build/push/deploy notification lambda via pipeline-deploy.sh"
	@echo "  make tf-deploy-lambdas IMAGE_TAG=x  - Build/push/deploy all lambdas via pipeline-deploy.sh"
	@echo "  make tf-deploy-all IMAGE_TAG=x      - Deploy shared, services, frontend, and lambdas"
	@echo "  make newrelic-lambda-preflight      - Validate NEW_RELIC_* env for Lambda deploys (sources TF_ENV_FILE)"
	@echo "  make newrelic-lambda-verify-config  - AWS audit: Lambda NR image command + env keys (needs aws, jq; sources TF_ENV_FILE)"
	@echo "  Existing image mode: make tf-deploy-services SERVICES_IMAGE_SOURCE=existing IMAGE_TAG=x"
	@echo "  Existing lambda mode: make tf-deploy-lambdas LAMBDAS_IMAGE_SOURCE=existing IMAGE_TAG=x"
	@echo ""
	@echo "AWS Terraform Destroy (set TF_WORKSPACE=dev|prod, TF_ENV_FILE=.env.remote; DOMAIN_NAME required. Lambda/services image registry+tag default to placeholders if unset):"
	@echo "  make tf-destroy-frontend            - Destroy frontend Terraform stack"
	@echo "  make tf-destroy-lambda-order        - Destroy order-processor Lambda stack"
	@echo "  make tf-destroy-lambda-payment      - Destroy payment-processor Lambda stack"
	@echo "  make tf-destroy-lambda-notification - Destroy notification-sender Lambda stack"
	@echo "  make tf-destroy-services            - Destroy services Terraform stack"
	@echo "  make tf-destroy-shared-infra        - Destroy shared infrastructure stack"
	@echo "  make tf-destroy-lambdas             - Destroy all lambda Terraform stacks"
	@echo "  make tf-destroy-all                 - Destroy frontend, lambdas, services, then shared infra"
	@echo "  make tf-destroy                     - Same as tf-destroy-all (AWS bill cleanup)"
	@echo ""
	@echo "Complete LocalStack Pro Terraform (set LSTK_TF_ACTION=plan|apply|destroy, default plan; test secrets load from LSTK_SECRET_ENV_FILE=.env.remote):"
	@echo "  make lstk-init                      - Create local config/JWT keys and bootstrap LocalStack"
	@echo "  make lstk-plan                      - Plan all available LocalStack stacks"
	@echo "  make lstk-deploy                    - Deploy and verify the complete LocalStack environment"
	@echo "  make lstk-verify                    - Re-run end-to-end LocalStack verification"
	@echo "  make lstk-verify-csrf               - Verify browser CSRF/CORS against LocalStack environment"
	@echo "  make lstk-destroy                   - Destroy Terraform-owned LocalStack resources"
	@echo "  make lstk-start                     - Start LocalStack Pro with docker-compose.lstk.yml"
	@echo "  make lstk-stop                      - Stop LocalStack Pro compose service"
	@echo "  make lstk-state-bucket              - Create the LocalStack Terraform state bucket"
	@echo "  make lstk-route53-zone              - Create the LocalStack Route53 hosted zone"
	@echo "  make lstk-endpoints                 - Print LocalStack application endpoints"
	@echo "  make lstk-tf-shared-infra           - Plan/apply shared-infra against LocalStack"
	@echo "  make lstk-tf-services               - Plan/apply services against LocalStack"
	@echo "  make lstk-tf-frontend               - Plan/apply frontend against LocalStack"
	@echo "  make lstk-tf-lambdas                - Plan/apply all lambda stacks against LocalStack"
	@echo "  make lstk-tf-all                    - Plan/apply shared, services, frontend, lambdas"
	@echo "  make lstk-tf-destroy-all            - Destroy frontend, lambdas, services, then shared infra in LocalStack"
	@echo "  make lstk-redeploy                  - Destroy all LocalStack resources, then apply all fresh"
	@echo "  make lstk-redeploy-services         - Rebuild and redeploy only the API services stack"
	@echo "  make lstk-redeploy-frontend         - Rebuild, sync, and invalidate only the frontend stack"
	@echo "  make lstk-redeploy-lambda-order     - Rebuild and redeploy only order-processor"
	@echo "  make lstk-redeploy-lambda-payment   - Rebuild and redeploy only payment-processor"
	@echo "  make lstk-redeploy-lambda-notification - Rebuild and redeploy only notification-sender"
	@echo "  make lstk-redeploy-lambdas          - Rebuild and redeploy all three Lambdas only"
	@echo ""
	@echo "Local Development:"
	@echo "  make local-setup    - Complete first-time setup (all steps)"
	@echo "  make local-infra-only - Step 1: Start PostgreSQL + LocalStack"
	@echo "  make local-infra    - Step 2: Provision resources + create .env"
	@echo "  make local-up       - Step 3: Start Backend + Frontend + Mobile"
	@echo "  make local-down     - Stop all services"
	@echo "  make start-mobile   - Start Mobile (Expo) only"
	@echo "  make mobile-logs    - Follow mobile container logs"
	@echo "  make local-restart  - Restart Backend + Frontend"
	@echo "  make backend-rebuild - Clean backend build and restart (use after changing shared/migrations)"
	@echo "  make local-reset    - Reset containers (fixes conflicts)"
	@echo "  make local-clean    - Clean everything (containers + Terraform)"
	@echo "  make local-logs    - View all logs"
	@echo ""
	@echo "Security:"
	@echo "  make jwt-keys       - Ensure JWT PEM files exist and update .env keys"
	@echo ""
	@echo "Quick Commands:"
	@echo "  make rebuild        - Clean and rebuild everything"
	@echo "  make test-no-cache  - Run all tests without build cache"

# ============================================================================
# All Projects
# ============================================================================

clean:
	@echo "Cleaning all projects..."
	cd $(API_DIR) && ./gradlew clean
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew clean; \
	fi

build:
	@echo "Building all projects..."
	cd $(API_DIR) && ./gradlew build
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew build; \
	fi

test:
	@echo "Testing all projects..."
	cd $(API_DIR) && ./gradlew test
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew test; \
	fi

verify: clean build test
	@echo "Verification complete!"

rebuild: clean build
	@echo "Rebuild complete!"

test-no-cache:
	@echo "Running all tests without build cache..."
	cd $(API_DIR) && ./gradlew test --no-build-cache
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew test --no-build-cache; \
	fi

# ============================================================================
# EventPro API (Modular Monolith)
# ============================================================================

clean-services:
	@echo "Cleaning EventPro API..."
	cd $(API_DIR) && ./gradlew clean

build-services:
	@echo "Building EventPro API..."
	cd $(API_DIR) && ./gradlew build

build-order-processor:
	@echo "Building order-processor Lambda..."
	cd $(ORDER_DIR) && ./gradlew build

build-payment-processor:
	@echo "Building payment-processor Lambda..."
	cd $(PAYMENT_DIR) && ./gradlew build

build-notification-sender:
	@echo "Building notification-sender Lambda..."
	cd $(NOTIFICATION_DIR) && ./gradlew build

build-lambdas: build-order-processor build-payment-processor build-notification-sender
	@echo "All Lambdas build complete!"

build-backend: build-services build-lambdas
	@echo "All projects build complete!"

api-test:
	@echo "Testing EventPro API..."
	cd $(API_DIR) && ./gradlew test

api-run:
	@echo "Running EventPro API locally..."
	cd $(API_DIR) && ./gradlew :eventpro-api:bootRun

api: clean-services build-services api-test
	@echo "EventPro API verification complete!"

# ============================================================================
# Individual Modules
# ============================================================================

build-core:
	@echo "Building eventpro-core module..."
	cd $(API_DIR) && ./gradlew :eventpro-core:build

build-event:
	@echo "Building eventpro-event module..."
	cd $(API_DIR) && ./gradlew :eventpro-event:build

build-order:
	@echo "Building eventpro-order module..."
	cd $(API_DIR) && ./gradlew :eventpro-order:build

build-payment:
	@echo "Building eventpro-payment module..."
	cd $(API_DIR) && ./gradlew :eventpro-payment:build

# ============================================================================
# Analytics Service Lambda
# ============================================================================

analytics-clean:
	@echo "Cleaning Analytics Service..."
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew clean; \
	else \
		echo "Analytics Service directory not found: $(ANALYTICS_DIR)"; \
	fi

build-analytics:
	@echo "Building Analytics Service..."
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew build; \
	else \
		echo "Analytics Service directory not found: $(ANALYTICS_DIR)"; \
	fi

analytics-test:
	@echo "Testing Analytics Service..."
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && ./gradlew test; \
	else \
		echo "Analytics Service directory not found: $(ANALYTICS_DIR)"; \
	fi

analytics: analytics-clean build-analytics analytics-test
	@echo "Analytics Service verification complete!"

# ============================================================================
# Web Frontend
# ============================================================================

build-frontend:
	@echo "Building Web Frontend..."
	cd $(WEB_DIR) && npm run build

web-dev:
	@echo "Starting Web development server..."
	cd $(WEB_DIR) && npm run dev

web-preview:
	@echo "Previewing Web production build..."
	cd $(WEB_DIR) && npm run preview

web-install:
	@echo "Installing Web Frontend dependencies..."
	cd $(WEB_DIR) && npm install

# ============================================================================
# Docker Images
# ============================================================================

docker-build:
	@echo "Building EventPro API Docker image..."
	cd backend && docker image build -f services/Dockerfile -t backend:latest .

docker-analytics:
	@echo "Building Analytics Service Docker image..."
	@if [ -d "$(ANALYTICS_DIR)" ]; then \
		cd $(ANALYTICS_DIR) && docker build -f Dockerfile -t analytics-service:latest .; \
	else \
		echo "Analytics Service directory not found: $(ANALYTICS_DIR)"; \
	fi

# docker-secret-rotation: Removed - RDS now manages credential rotation natively
# docker-secret-rotation:
# 	@echo "Building Secret Rotation Lambda Docker image..."
# 	cd $(SECRET_ROTATION_DIR) && docker image build -f Dockerfile -t secret-rotation:latest .

# Lambda Docker Images
lambda-build:
	@echo "Building all Lambda Docker images..."
	@./scripts/build-lambda-local.sh all latest

lambda-build-payment:
	@echo "Building payment-processor Lambda Docker image..."
	@./scripts/build-lambda-local.sh payment-processor latest

lambda-build-notification:
	@echo "Building notification-sender Lambda Docker image..."
	@./scripts/build-lambda-local.sh notification-sender latest

lambda-build-order:
	@echo "Building order-processor Lambda Docker image..."
	@./scripts/build-lambda-local.sh order-processor latest

jwt-keys:
	@echo "Ensuring JWT PEM files exist and updating .env..."
	@./scripts/jwt-script.sh --generate-if-missing jwt-private.pem jwt-public.pem .env

# ============================================================================
# AWS Terraform Deploy (higher environments)
# ============================================================================

tf-deploy-shared-infra:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only shared-infra \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-services:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only services \
		--services-image-source "$(SERVICES_IMAGE_SOURCE)" \
		--csrf-enabled "$(CSRF_ENABLED)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-frontend:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only frontend \
		$(PIPELINE_ACTION_FLAG)

# New Relic (Java Lambdas): validate deploy env and optional AWS-side config audit
newrelic-lambda-preflight:
	@set -a; [ -f "$(TF_ENV_FILE)" ] && . "$(TF_ENV_FILE)"; set +a; \
		./scripts/check-newrelic-lambda-prereqs.sh

newrelic-lambda-verify-config:
	@set -a; [ -f "$(TF_ENV_FILE)" ] && . "$(TF_ENV_FILE)"; set +a; \
		WORKSPACE="$(TF_WORKSPACE)" ./scripts/verify-newrelic-lambda-telemetry.sh

tf-deploy-lambda-order:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only lambdas \
		--lambdas order-processor \
		--lambdas-image-source "$(LAMBDAS_IMAGE_SOURCE)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-lambda-payment:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only lambdas \
		--lambdas payment-processor \
		--lambdas-image-source "$(LAMBDAS_IMAGE_SOURCE)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-lambda-notification:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only lambdas \
		--lambdas notification-sender \
		--lambdas-image-source "$(LAMBDAS_IMAGE_SOURCE)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-lambdas:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only lambdas \
		--lambdas "$(LAMBDA_TARGETS)" \
		--lambdas-image-source "$(LAMBDAS_IMAGE_SOURCE)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

tf-deploy-all:
	@./scripts/pipeline-deploy.sh \
		--env-file "$(TF_ENV_FILE)" \
		--workspace "$(TF_WORKSPACE)" \
		--only all \
		--services-image-source "$(SERVICES_IMAGE_SOURCE)" \
		--csrf-enabled "$(CSRF_ENABLED)" \
		--lambdas-image-source "$(LAMBDAS_IMAGE_SOURCE)" \
		--lambdas "$(LAMBDA_TARGETS)" \
		$(PIPELINE_IMAGE_TAG_ARG) \
		$(PIPELINE_ACTION_FLAG)

aws-plan:
	@$(MAKE) tf-deploy-all TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) PIPELINE_ACTION=plan IMAGE_TAG=$(IMAGE_TAG)

aws-deploy:
	@$(MAKE) tf-deploy-all TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) PIPELINE_ACTION=apply IMAGE_TAG=$(IMAGE_TAG) CSRF_ENABLED=$(CSRF_ENABLED)

verify-csrf: aws-verify-csrf

aws-verify-csrf:
	@set -a; [ -f "$(TF_ENV_FILE)" ] && . "$(TF_ENV_FILE)"; set +a; \
		[ -n "$${DOMAIN_NAME:-}" ] || { echo "DOMAIN_NAME is required in $(TF_ENV_FILE) or the environment" >&2; exit 1; }; \
		./scripts/verify-browser-security.sh \
			--api-url "https://$(TF_WORKSPACE)-api.$$DOMAIN_NAME" \
			--app-origin "https://$(TF_WORKSPACE)-app.$$DOMAIN_NAME" \
			--csrf-enabled "$(CSRF_ENABLED)" \
			--verify-frontend

tf-services-output:
	@cd backend/services/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=services/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform output -json

tf-frontend-output:
	@cd eventpro-frontend/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=frontend/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform output -json

tf-outputs: tf-services-output tf-frontend-output

# ============================================================================
# AWS Terraform Destroy (higher environments)
# ============================================================================

tf-destroy-shared-infra:
	@echo "Destroying shared infrastructure Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@set -a; [ -f "$(TF_ENV_FILE)" ] && . "$(TF_ENV_FILE)"; set +a; \
		[ -n "$$DOMAIN_NAME" ] || { echo "DOMAIN_NAME is required (set in $(TF_ENV_FILE) or env)"; exit 1; }; \
		export TF_VAR_domain_name="$$DOMAIN_NAME"; \
		cd backend/shared-infra && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=shared-infra/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		if terraform workspace select "$(TF_WORKSPACE)" >/dev/null 2>&1; then \
			terraform destroy -auto-approve -var-file=terraform.tfvars; \
		else \
			echo "Workspace \"$(TF_WORKSPACE)\" not found in this backend; skipping destroy."; \
		fi

tf-destroy-services:
	@echo "Destroying services Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@cd backend/services/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=services/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform destroy -auto-approve -var-file=terraform.tfvars

tf-destroy-frontend:
	@echo "Destroying frontend Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@cd eventpro-frontend/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=frontend/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform destroy -auto-approve -var-file=terraform.tfvars $(TF_IMAGE_TAG_VAR)

tf-destroy-lambda-order:
	@echo "Destroying order-processor Lambda Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@cd backend/lambdas/order-processor/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=order/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform destroy -auto-approve -var-file=terraform.tfvars

tf-destroy-lambda-payment:
	@echo "Destroying payment-processor Lambda Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@cd backend/lambdas/payment-processor/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=payment/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform destroy -auto-approve -var-file=terraform.tfvars

tf-destroy-lambda-notification:
	@echo "Destroying notification-sender Lambda Terraform (workspace=$(TF_WORKSPACE), env=$(TF_ENV_FILE))..."
	@cd backend/lambdas/notification-sender/terraform && \
		terraform init -reconfigure \
			-backend-config=bucket=$(TF_STATE_BUCKET) \
			-backend-config=key=notification/terraform.tfstate \
			-backend-config=region=$(TF_STATE_REGION) \
			-backend-config=use_lockfile=true && \
		(terraform workspace select -or-create "$(TF_WORKSPACE)") && \
		terraform destroy -auto-approve -var-file=terraform.tfvars

tf-destroy-lambdas:
	@$(MAKE) tf-destroy-lambda-order TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)
	@$(MAKE) tf-destroy-lambda-payment TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)
	@$(MAKE) tf-destroy-lambda-notification TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)

tf-destroy-all:
	@$(MAKE) tf-destroy-frontend TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)
	@$(MAKE) tf-destroy-lambdas TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)
	@$(MAKE) tf-destroy-services TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)
	@$(MAKE) tf-destroy-shared-infra TF_WORKSPACE=$(TF_WORKSPACE) TF_ENV_FILE=$(TF_ENV_FILE) TF_STATE_BUCKET=$(TF_STATE_BUCKET) TF_STATE_REGION=$(TF_STATE_REGION)

# Convenience alias: tear down all remote Terraform (frontend + lambdas + services + shared infra)
tf-destroy: tf-destroy-all

# ============================================================================
# Complete LocalStack Pro Terraform (full AWS emulation)
# ============================================================================

lstk-init:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --init

lstk-plan:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start --plan --only all

lstk-deploy:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --apply --only all --verify-after

lstk-verify:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --verify

lstk-verify-csrf:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		CSRF_SMOKE_EMAIL="$${LSTK_SMOKE_EMAIL:-admin@event.com}" \
		CSRF_SMOKE_PASSWORD="$${LSTK_SMOKE_PASSWORD:-Password@123}" \
		./scripts/verify-browser-security.sh \
			--api-url "https://$(LSTK_WORKSPACE)-api.localhost.localstack.cloud" \
			--app-origin "https://$(LSTK_WORKSPACE)-app.localhost.localstack.cloud" \
			--csrf-enabled true \
			--verify-frontend \
			--insecure

lstk-destroy:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start --destroy --only all

lstk-start:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start-only

lstk-stop:
	@docker compose --env-file "$(LSTK_ENV_FILE)" -f "$(LSTK_COMPOSE_FILE)" down -v

lstk-state-bucket:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start --bootstrap-state

lstk-route53-zone:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start --bootstrap-route53

lstk-endpoints:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --print-endpoints

lstk-tf-shared-infra:
	@./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only shared-infra

lstk-tf-services:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only services

lstk-tf-frontend:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only frontend

lstk-tf-lambda-order:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only order-processor

lstk-tf-lambda-payment:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only payment-processor

lstk-tf-lambda-notification:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only notification-sender

lstk-tf-lambdas:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --$(LSTK_TF_ACTION) --only lambdas

lstk-tf-all:
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --start --$(LSTK_TF_ACTION) --only all

lstk-tf-destroy-all:
	@$(MAKE) lstk-destroy LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-destroy LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@set -a; [ ! -f "$(abspath $(LSTK_SECRET_ENV_FILE))" ] || . "$(abspath $(LSTK_SECRET_ENV_FILE))"; set +a; \
		./scripts/lstk-deploy.sh --env-file "$(LSTK_ENV_FILE)" --compose-file "$(LSTK_COMPOSE_FILE)" --workspace "$(LSTK_WORKSPACE)" --apply --only all --verify-after

# Fast, non-destructive LocalStack redeploys. These retain the existing
# infrastructure and state, rebuild only the selected artifact, and apply only
# its Terraform stack. Run `make lstk-deploy` once before using these targets.
lstk-redeploy-services:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-services LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy-frontend:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-frontend LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy-lambda-order:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-lambda-order LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy-lambda-payment:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-lambda-payment LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy-lambda-notification:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-lambda-notification LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

lstk-redeploy-lambdas:
	@$(MAKE) lstk-init LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)
	@$(MAKE) lstk-tf-lambdas LSTK_TF_ACTION=apply LSTK_ENV_FILE=$(LSTK_ENV_FILE) LSTK_COMPOSE_FILE=$(LSTK_COMPOSE_FILE) LSTK_WORKSPACE=$(LSTK_WORKSPACE)

# ============================================================================
# Local Development (Docker Compose + LocalStack)
# ============================================================================

# Complete setup (first time) - runs all steps in order
local-setup: local-infra-only local-infra local-up
	@echo ""
	@echo "🎉 Complete setup finished!"
	@echo "   Frontend: http://localhost:5173"
	@echo "   Backend:  http://localhost:8080/actuator/health"

# Step 1: Start infrastructure (PostgreSQL + LocalStack)
local-infra-only:
	@echo "Step 1: Starting infrastructure services (PostgreSQL + LocalStack)..."
	@docker compose up -d postgres localstack || \
		(echo ""; \
		 echo "Container conflict! Run: make local-reset"; \
		 exit 1)
	@echo "Waiting for services to be healthy..."
	@sleep 10
	@echo "Infrastructure ready"

# Step 2: Provision AWS resources (Terraform) and create .env files
local-infra:
	@echo "Step 2: Building Lambda images..."
	@$(MAKE) lambda-build || (echo "⚠️  Lambda build failed. Continuing anyway..."; true)
	@echo "Tagging Lambda images for LocalStack..."
	@docker tag eventpro-order-processor:latest eventpro-order-processor:local 2>/dev/null || true
	@docker tag eventpro-payment-processor:latest eventpro-payment-processor:local 2>/dev/null || true
	@docker tag eventpro-notification-sender:latest eventpro-notification-sender:local 2>/dev/null || true
	@echo "Step 3: Provisioning AWS resources..."
	@echo "  - LocalStack resources: S3, SQS, Secrets Manager, Lambda Functions"
	@if ! docker ps | grep -q "localstack"; then \
		echo "LocalStack not running. Starting it..."; \
		$(MAKE) local-infra-only; \
	fi
	@cd infrastructure/environments/local && \
		terraform init -reconfigure && \
		terraform apply -auto-approve || \
		(echo ""; \
		 echo "⚠️  Terraform apply completed with errors."; \
		 echo "   Check Terraform output for details."; \
		 echo ""; \
		 true)
	@echo "Step 4: Creating environment files..."
	@cd infrastructure/environments/local && \
		S3_BUCKET_NAME=$$(terraform output -raw s3_images_bucket_name 2>/dev/null || echo "") && \
		ORDER_QUEUE_URL=$$(terraform output -raw sqs_order_queue_url 2>/dev/null || echo "") && \
		PAYMENT_QUEUE_URL=$$(terraform output -raw sqs_payment_queue_url 2>/dev/null || echo "") && \
		NOTIFICATION_QUEUE_URL=$$(terraform output -raw sqs_notification_queue_url 2>/dev/null || echo "") && \
		cd ../../.. && \
		echo "S3_BUCKET_NAME=$$S3_BUCKET_NAME" > .env && \
		echo "ORDER_QUEUE_URL=$$ORDER_QUEUE_URL" >> .env && \
		echo "PAYMENT_QUEUE_URL=$$PAYMENT_QUEUE_URL" >> .env && \
		echo "NOTIFICATION_QUEUE_URL=$$NOTIFICATION_QUEUE_URL" >> .env && \
		VITE_STRIPE_PUBLISHABLE_KEY=$$(grep '^VITE_STRIPE_PUBLISHABLE_KEY=' .env 2>/dev/null | cut -d'=' -f2- | tr -d ' ' || echo "") && \
		echo "VITE_API_BASE_URL=http://localhost:8080" > eventpro-frontend/.env.local && \
		echo "VITE_AWS_REGION=us-east-1" >> eventpro-frontend/.env.local && \
		echo "VITE_S3_BUCKET_NAME=$$S3_BUCKET_NAME" >> eventpro-frontend/.env.local && \
		if [ -n "$$VITE_STRIPE_PUBLISHABLE_KEY" ]; then \
			echo "VITE_STRIPE_PUBLISHABLE_KEY=$$VITE_STRIPE_PUBLISHABLE_KEY" >> eventpro-frontend/.env.local; \
		fi
	@echo "Environment files created"

# Step 3: Start all services (Backend + Frontend)
# Note: Lambda functions are managed by LocalStack via Terraform
# Note: Flyway migrations run automatically when backend starts
local-up:
	@echo "Step 5: Starting application services..."
	@if [ ! -f .env ]; then \
		echo ".env file not found. Run 'make local-infra' first."; \
		exit 1; \
	fi
	@if ! docker ps | grep -q "postgres"; then $(MAKE) local-infra-only; fi
	@docker compose --env-file .env up -d backend frontend mobile
	@echo "Waiting for services to start (migrations run automatically)..."
	@sleep 15
	@echo ""
	@echo "All services started!"
	@echo "   Frontend: http://localhost:5173"
	@echo "   Mobile (Expo): Metro on http://localhost:8081, Expo dev tools on http://localhost:19000"
	@echo "   Backend health:  http://localhost:8080/actuator/health"
	@echo "   Backend swagger:  http://localhost:8080/swagger-ui/index.html"
	@echo "   Lambda functions: Managed by LocalStack (automatically triggered by SQS)"
	@echo ""
	@echo "To verify Lambda functions:"
	@echo "   make local-lambda-status"

local-down:
	@echo "Stopping services..."
	@cd infrastructure/environments/local && terraform destroy -auto-approve || true
	cd ../../../
	@rm -f .env eventpro-frontend/.env.local
	@docker compose  down backend frontend mobile postgres -v

local-restart:
	@echo "Restarting application services..."
	@docker compose  restart backend frontend mobile
	@echo "Services restarted!"

# Force backend to recompile from source (clean + restart). Use after changing shared/ or migrations.
backend-rebuild:
	@echo "Stopping backend..."
	@docker compose stop backend
	@echo "Cleaning backend build (shared + eventpro-api)..."
	@docker compose run --rm backend sh -c "cd /app/backend/services && chmod +x ./gradlew && ./gradlew clean --no-daemon"
	@echo "Starting backend (full recompile on boot)..."
	@docker compose up -d backend
	@echo "Backend rebuild done. Watch logs with: make backend-logs"

backend-logs:
	@docker compose  logs -f backend

frontend-logs:
	@docker compose  logs -f frontend

mobile-logs:
	@docker compose  logs -f mobile

# Clean everything (containers + Terraform resources)
local-clean:
	@cd infrastructure/environments/local && terraform destroy -auto-approve || true
	@docker compose  down -v
	@rm -f .env eventpro-frontend/.env.local
	@echo "Everything cleaned up"

start-pg-and-localstack:
	@echo "Starting PostgreSQL and LocalStack..."
	@docker compose up -d postgres localstack

start-backend:
	@echo "Starting backend..."
	@docker compose  --env-file .env up -d backend
	@echo "   Backend API: http://localhost:8080"
	@echo "   Backend health:  http://localhost:8080/actuator/health"
	@echo "   Backend swagger:  http://localhost:8080/swagger-ui/index.html"

start-frontend:
	@echo "Starting frontend..."
	@docker compose  --env-file eventpro-frontend/.env.local up -d frontend
	@echo "   Frontend UI: http://localhost:5173"

start-mobile:
	@echo "Starting mobile (Expo)..."
	@docker compose up -d mobile
	@echo "   Metro: http://localhost:8081"
	@echo "   Expo dev tools: http://localhost:19000"
	@echo "   Use Expo Go and connect to this host; set EXPO_PUBLIC_API_URL to your machine IP for physical devices."

start-localstack:
	@echo "Starting LocalStack..."
	@docker compose up -d localstack

start-postgres:
	@echo "Starting PostgreSQL..."
	@docker compose up -d postgres

destroy-infrastructure:
	@echo "Destroying infrastructure..."
	cd infrastructure/environments/local && terraform destroy -auto-approve || true
	cd ../../../
	@rm -f .env eventpro-frontend/.env.local
	@echo "Infrastructure destroyed"

# Lambda verification targets
local-lambda-status:
	@echo "Lambda Functions in LocalStack:"
	@aws --endpoint-url=http://localhost:4566 lambda list-functions --query 'Functions[*].[FunctionName,State,LastModified]' --output table 2>/dev/null || \
		(echo "⚠️  Could not list Lambda functions. Is LocalStack running?"; exit 1)

local-lambda-logs:
	@if [ -z "$(FUNCTION)" ]; then \
		echo "Usage: make local-lambda-logs FUNCTION=<function-name>"; \
		echo "Example: make local-lambda-logs FUNCTION=local-order-processor"; \
		exit 1; \
	fi
	@echo "Fetching logs for $(FUNCTION)..."
	@aws --endpoint-url=http://localhost:4566 logs tail "/aws/lambda/$(FUNCTION)" --follow 2>/dev/null || \
		(echo "⚠️  Could not fetch logs. Check function name and LocalStack status."; exit 1)

local-event-mappings:
	@echo "Event Source Mappings in LocalStack:"
	@aws --endpoint-url=http://localhost:4566 lambda list-event-source-mappings --query 'EventSourceMappings[*].[EventSourceArn,FunctionArn,State,LastModified]' --output table 2>/dev/null || \
		(echo "⚠️  Could not list event source mappings. Is LocalStack running?"; exit 1)

clean-terraform-init:
	@echo "Cleaning Terraform init..."
	find . -type d -name ".terraform" -exec rm -rf {} \; -o -type f -name ".terraform.lock.hcl" -delete

clean-terraform-init-dry-run:
	@echo "Cleaning Terraform init..."
	find . -type d -name ".terraform" -o -type f -name ".terraform.lock.hcl"
