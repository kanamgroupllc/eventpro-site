# Amazon OpenSearch Integration Guide

**Date**: 2025-01-26  
**Service**: Amazon OpenSearch Service  
**Purpose**: Enhanced search capabilities for events and admin operations  
**Status**: Planning/Implementation Guide

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Backend Integration](#backend-integration)
5. [API Implementation](#api-implementation)
6. [Use Cases](#use-cases)
7. [Data Synchronization](#data-synchronization)
8. [Best Practices](#best-practices)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Checklist](#deployment-checklist)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## Introduction

### Current Search Limitations

The EventPro platform currently uses PostgreSQL `LIKE` queries for search functionality:

**Current Implementation:**

- Event search: `findByNameContainingIgnoreCase()` - simple case-insensitive name matching
- Admin search: Client-side filtering in React components
- User search: No backend search implementation

**Limitations:**

- ❌ No full-text search across multiple fields (name, description, category, location)
- ❌ No relevance ranking - results are not sorted by relevance
- ❌ No fuzzy matching - typos in search queries return no results
- ❌ Limited scalability - PostgreSQL LIKE queries don't scale well with large datasets
- ❌ No advanced filtering capabilities (location-based, date ranges, price ranges)
- ❌ No search analytics or insights
- ❌ Poor performance on complex queries

### What is Amazon OpenSearch?

Amazon OpenSearch Service is a managed search and analytics engine based on OpenSearch (forked from Elasticsearch). It provides:

- **Full-text search** with relevance scoring
- **Advanced filtering** and aggregations
- **Scalable** - handles millions of documents
- **Real-time indexing** - near-instant search results
- **Rich query DSL** - complex search queries
- **Analytics capabilities** - dashboards and visualizations
- **Managed service** - AWS handles infrastructure, scaling, and maintenance

### Benefits for EventPro Platform

**For Users:**

- ✅ Fast, relevant event search results
- ✅ Search across event name, description, category, and location
- ✅ Typo-tolerant search (fuzzy matching)
- ✅ Advanced filters (date, location, price, category)
- ✅ Better discovery of events

**For Administrators:**

- ✅ Powerful search across users, events, and orders
- ✅ Analytics and insights
- ✅ Complex queries for reporting
- ✅ Better user management tools

**For Platform:**

- ✅ Scalable search infrastructure
- ✅ Reduced load on PostgreSQL
- ✅ Better user experience
- ✅ Foundation for future features (recommendations, analytics)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User/Admin Search Request                │
│                    (Frontend - React)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              EventPro API (Spring Boot)                     │
│              Port 8080                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EventSearchController / AdminSearchController       │   │
│  │  - Receives search requests                          │   │
│  │  - Validates parameters                              │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │  OpenSearchService / AdminSearchService              │   │
│  │  - Builds OpenSearch queries                         │   │
│  │  - Executes searches                                 │   │
│  │  - Transforms results                                │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Amazon OpenSearch Service (Managed)                 │
│         VPC Endpoint (Private)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Index: events                                       │   │
│  │  - Event documents with full metadata                │   │
│  │  - Analyzed fields for full-text search              │   │
│  │                                                      │   │
│  │  Index: users                                        │   │
│  │  - User documents (admin search)                     │   │
│  │  - Email, name, role, status                         │   │
│  │                                                      │   │
│  │  Index: orders (optional, for analytics)             │   │
│  │  - Order documents for admin analytics               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────┴─────────────────────────────────┐
│         Data Synchronization (Event-Driven)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Option 1: Spring Events → OpenSearchService         │   │
│  │  - EventCreatedEvent → indexEvent()                  │   │
│  │  - EventUpdatedEvent → indexEvent()                  │   │
│  │  - EventDeletedEvent → deleteEvent()                 │   │
│  │                                                      │   │
│  │  Option 2: Database Change Streams → Lambda          │   │
│  │  - PostgreSQL logical replication                    │   │
│  │  - Lambda processes changes                          │   │
│  │  - Updates OpenSearch index                          │   │
│  │                                                      │   │
│  │  Option 3: Direct sync in service layer              │   │
│  │  - After save/update operations                      │   │
│  │  - Synchronous indexing                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interactions

**Search Flow:**

1. User/admin submits search query via frontend
2. Frontend calls API endpoint (`/api/v1/events/search`)
3. Controller validates and forwards to OpenSearchService
4. OpenSearchService builds query and executes against OpenSearch
5. Results are transformed and returned to frontend
6. Frontend displays results with relevance ranking

**Indexing Flow:**

1. Event is created/updated via EventService
2. Spring Event is published (EventCreatedEvent/EventUpdatedEvent)
3. Event listener calls OpenSearchService.indexEvent()
4. Document is indexed in OpenSearch
5. Search results are immediately available

### Data Flow Diagram

```txt
┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│PostgreSQL│────▶│EventService │────▶│Spring Event │────▶│OpenSearch│
│  (RDS)   │     │             │     │  Publisher  │     │  Service │
└──────────┘     └─────────────┘     └─────────────┘     └──────────┘
     │                 │                  │                   │
     │                 │                  │                   │
     ▼                 ▼                  ▼                   ▼
  Event Entity    Save Event        Publish Event       Index Document
  Created/Updated                    EventCreated        (async)
                                     EventUpdated
```

---

## Infrastructure Setup

### Terraform Module Structure

Create a new Terraform module for OpenSearch:

**File Structure:**

```txt
infrastructure/modules/opensearch/
├── main.tf          # OpenSearch domain configuration
├── variables.tf     # Input variables
├── outputs.tf        # Output values
└── security.tf      # Security group and IAM roles
```

### OpenSearch Domain Configuration

**File: `infrastructure/modules/opensearch/main.tf`**

```h
variable "domain_name" {
  description = "Name of the OpenSearch domain"
  type        = string
}

variable "instance_type" {
  description = "Instance type for OpenSearch nodes"
  type        = string
  default     = "t3.small.search"
}

variable "instance_count" {
  description = "Number of instances in the cluster"
  type        = number
  default     = 1
}

variable "ebs_volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 20
}

variable "vpc_id" {
  description = "VPC ID where OpenSearch will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for OpenSearch (private subnets)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for OpenSearch"
  type        = list(string)
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "master_user_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_opensearch_domain" "main" {
  domain_name    = var.domain_name
  engine_version = "OpenSearch_2.11"

  cluster_config {
    instance_type            = var.instance_type
    instance_count           = var.instance_count
    dedicated_master_enabled = false
    zone_awareness_enabled   = false
    
    # For production, enable zone awareness
    # zone_awareness_enabled = true
    # zone_awareness_config {
    #   availability_zone_count = 2
    # }
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = var.ebs_volume_size
    iops        = 3000
  }

  vpc_options {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  node_to_node_encryption {
    enabled = true
  }

  encrypt_at_rest {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # Access policy - restrict to VPC
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "es:*"
        Resource = "arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${var.domain_name}/*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = ["10.0.0.0/8"] # VPC CIDR - adjust as needed
          }
        }
      }
    ]
  })

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name     = "admin"
      master_user_password = var.master_user_password
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_cloudwatch_log_group" "opensearch" {
  name              = "/aws/opensearch/${var.domain_name}"
  retention_in_days = 7
}

output "domain_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.main.endpoint
}

output "domain_arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.main.arn
}

output "domain_id" {
  description = "OpenSearch domain ID"
  value       = aws_opensearch_domain.main.domain_id
}

output "kibana_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = aws_opensearch_domain.main.dashboard_endpoint
}
```

**File: `infrastructure/modules/opensearch/variables.tf`**

```terraform
variable "domain_name" {
  description = "Name of the OpenSearch domain"
  type        = string
}

variable "instance_type" {
  description = "Instance type for OpenSearch nodes"
  type        = string
  default     = "t3.small.search"
}

variable "instance_count" {
  description = "Number of instances in the cluster"
  type        = number
  default     = 1
}

variable "ebs_volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 20
}

variable "vpc_id" {
  description = "VPC ID where OpenSearch will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for OpenSearch (private subnets)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for OpenSearch"
  type        = list(string)
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "master_user_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}
```

**File: `infrastructure/modules/opensearch/outputs.tf`**

```terraform
output "domain_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = aws_opensearch_domain.main.endpoint
}

output "domain_arn" {
  description = "OpenSearch domain ARN"
  value       = aws_opensearch_domain.main.arn
}

output "domain_id" {
  description = "OpenSearch domain ID"
  value       = aws_opensearch_domain.main.domain_id
}

output "kibana_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = aws_opensearch_domain.main.dashboard_endpoint
}
```

### Security Group Configuration

**File: `infrastructure/modules/opensearch/security.tf`**

```terraform
resource "aws_security_group" "opensearch" {
  name        = "${var.domain_name}-sg"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  # Allow HTTPS from ECS tasks
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
    description     = "HTTPS from ECS tasks"
  }

  # Allow HTTPS from Lambda functions (if using Lambda for sync)
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = var.lambda_security_group_ids
    description     = "HTTPS from Lambda functions"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.domain_name}-sg"
    Environment = var.environment
  }
}

output "security_group_id" {
  description = "Security group ID for OpenSearch"
  value       = aws_security_group.opensearch.id
}
```

### Environment Integration

**File: `infrastructure/environments/dev/main.tf`**

Add OpenSearch module:

```terraform
module "opensearch" {
  source = "../../modules/opensearch"

  domain_name       = "eventpro-search-${var.environment}"
  instance_type     = "t3.small.search"
  instance_count    = 1
  ebs_volume_size   = 20
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_ids = [module.opensearch.security_group_id]
  environment       = var.environment
  master_user_password = var.opensearch_master_password

  # Reference ECS security group
  ecs_security_group_id = module.ecs.security_group_id
  lambda_security_group_ids = [
    module.lambda_order_processor.security_group_id,
    module.lambda_payment_processor.security_group_id,
    module.lambda_notification_sender.security_group_id
  ]
}

# Store OpenSearch endpoint in Secrets Manager
resource "aws_secretsmanager_secret" "opensearch_endpoint" {
  name = "eventpro/${var.environment}/opensearch/endpoint"
}

resource "aws_secretsmanager_secret_version" "opensearch_endpoint" {
  secret_id     = aws_secretsmanager_secret.opensearch_endpoint.id
  secret_string = module.opensearch.domain_endpoint
}

# Store OpenSearch credentials in Secrets Manager
resource "aws_secretsmanager_secret" "opensearch_credentials" {
  name = "eventpro/${var.environment}/opensearch/credentials"
}

resource "aws_secretsmanager_secret_version" "opensearch_credentials" {
  secret_id = aws_secretsmanager_secret.opensearch_credentials.id
  secret_string = jsonencode({
    username = "admin"
    password = var.opensearch_master_password
  })
}
```

### Environment Variables

Add to `infrastructure/environments/dev/variables.tf`:

```terraform
variable "opensearch_master_password" {
  description = "Master user password for OpenSearch"
  type        = string
  sensitive   = true
}
```

---

## Backend Integration

### Dependencies

**File: `backend/services/modules/eventpro-event/build.gradle`**

Add OpenSearch dependencies:

```gradle
dependencies {
    // ... existing dependencies ...
    
    // AWS OpenSearch Java Client
    implementation 'org.opensearch.client:opensearch-rest-client:2.11.0'
    implementation 'org.opensearch.client:opensearch-rest-high-level-client:2.11.0'
    implementation 'org.opensearch.client:opensearch-java:2.11.0'
    
    // AWS SDK for authentication
    implementation platform('software.amazon.awssdk:bom:2.20.0')
    implementation 'software.amazon.awssdk:auth:2.20.0'
    implementation 'software.amazon.awssdk:core:2.20.0'
    
    // AWS SigV4 Signer for OpenSearch
    implementation 'io.github.acm19:aws-request-signing-apache-interceptor:2.3.0'
}
```

### OpenSearch Configuration

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/search/config/OpenSearchConfig.java`**

```java
package com.accessplus.eventpro.event.search.config;

import io.github.acm19.aws.interceptor.HttpRequestInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.opensearch.client.RestClient;
import org.opensearch.client.RestHighLevelClient;
import org.opensearch.client.json.jackson.JacksonJsonpMapper;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.transport.rest_client.RestClientTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;

@Configuration
@Slf4j
public class OpenSearchConfig {

    @Value("${opensearch.endpoint}")
    private String opensearchEndpoint;

    @Value("${opensearch.region:us-east-1}")
    private String region;

    @Value("${opensearch.username:admin}")
    private String username;

    @Value("${opensearch.password}")
    private String password;

    @Bean
    public RestClient restClient() {
        final CredentialsProvider credentialsProvider = new BasicCredentialsProvider();
        credentialsProvider.setCredentials(
            AuthScope.ANY,
            new UsernamePasswordCredentials(username, password)
        );

        return RestClient.builder(
            new HttpHost(opensearchEndpoint, 443, "https")
        )
        .setHttpClientConfigCallback(httpClientBuilder -> {
            // Add AWS SigV4 signing for IAM authentication (if using IAM)
            // httpClientBuilder.addInterceptorLast(new HttpRequestInterceptor(Region.of(region)));
            
            // Or use basic auth
            httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider);
            
            return httpClientBuilder;
        })
        .build();
    }

    @Bean
    public OpenSearchClient opensearchClient(RestClient restClient) {
        RestClientTransport transport = new RestClientTransport(
            restClient,
            new JacksonJsonpMapper()
        );

        return new OpenSearchClient(transport);
    }

    @Bean
    public RestHighLevelClient opensearchHighLevelClient(RestClient restClient) {
        return new RestHighLevelClient(restClient);
    }
}
```

### Application Configuration

**File: `backend/services/modules/eventpro-api/src/main/resources/application.yml`**

Add OpenSearch configuration:

```yaml
opensearch:
  endpoint: ${OPENSEARCH_ENDPOINT:}
  region: ${AWS_REGION:us-east-1}
  username: ${OPENSEARCH_USERNAME:admin}
  password: ${OPENSEARCH_PASSWORD:}
  index:
    events: events
    users: users
    orders: orders
  connection:
    timeout: 5000
    socket-timeout: 60000
```

### OpenSearch Service Implementation

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/search/service/OpenSearchService.java`**

```java
package com.accessplus.eventpro.event.search.service;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.search.model.EventSearchDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.SortOrder;
import org.opensearch.client.opensearch._types.query_dsl.BoolQuery;
import org.opensearch.client.opensearch._types.query_dsl.MultiMatchQuery;
import org.opensearch.client.opensearch._types.query_dsl.Query;
import org.opensearch.client.opensearch._types.query_dsl.RangeQuery;
import org.opensearch.client.opensearch._types.query_dsl.TermQuery;
import org.opensearch.client.opensearch._types.query_dsl.TextQueryType;
import org.opensearch.client.opensearch.core.BulkRequest;
import org.opensearch.client.opensearch.core.BulkResponse;
import org.opensearch.client.opensearch.core.IndexRequest;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.bulk.BulkResponseItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenSearchService {

    private static final String EVENTS_INDEX = "events";
    private final OpenSearchClient client;

    @Value("${opensearch.index.events:events}")
    private String eventsIndex;

    /**
     * Index a single event document
     */
    public void indexEvent(EventEntity event) {
        try {
            EventSearchDocument doc = EventSearchDocument.fromEntity(event);
            
            IndexRequest<EventSearchDocument> request = IndexRequest.of(i -> i
                .index(eventsIndex)
                .id(event.getId().toString())
                .document(doc)
            );

            client.index(request);
            log.debug("Indexed event: {}", event.getId());
        } catch (Exception e) {
            log.error("Failed to index event: {}", event.getId(), e);
            throw new RuntimeException("Failed to index event", e);
        }
    }

    /**
     * Bulk index multiple events
     */
    public void bulkIndexEvents(List<EventEntity> events) {
        try {
            BulkRequest.Builder bulkBuilder = new BulkRequest.Builder();

            for (EventEntity event : events) {
                EventSearchDocument doc = EventSearchDocument.fromEntity(event);
                bulkBuilder.operations(op -> op
                    .index(idx -> idx
                        .index(eventsIndex)
                        .id(event.getId().toString())
                        .document(doc)
                    )
                );
            }

            BulkResponse response = client.bulk(bulkBuilder.build());
            
            if (response.errors()) {
                log.warn("Some events failed to index");
                for (BulkResponseItem item : response.items()) {
                    if (item.error() != null) {
                        log.error("Indexing error for event {}: {}", 
                            item.id(), item.error().reason());
                    }
                }
            } else {
                log.info("Successfully indexed {} events", events.size());
            }
        } catch (Exception e) {
            log.error("Failed to bulk index events", e);
            throw new RuntimeException("Failed to bulk index events", e);
        }
    }

    /**
     * Search events with advanced query
     */
    public SearchResponse<EventSearchDocument> searchEvents(
            String query,
            String category,
            String city,
            LocalDateTime startDate,
            LocalDateTime endDate,
            int page,
            int size) {
        
        try {
            SearchRequest.Builder searchBuilder = new SearchRequest.Builder()
                .index(eventsIndex)
                .from(page * size)
                .size(size);

            // Build bool query
            BoolQuery.Builder boolQueryBuilder = new BoolQuery.Builder();

            // Multi-match query for full-text search
            if (query != null && !query.trim().isEmpty()) {
                Query multiMatchQuery = Query.of(q -> q
                    .multiMatch(MultiMatchQuery.of(m -> m
                        .query(query)
                        .fields("name^3", "description^1", "category.name^2", "address.city^1")
                        .type(TextQueryType.BestFields)
                        .fuzziness("AUTO")
                    ))
                );
                boolQueryBuilder.must(multiMatchQuery);
            } else {
                // Match all if no query
                boolQueryBuilder.must(Query.of(q -> q.matchAll(m -> m)));
            }

            // Add filters
            if (category != null && !category.trim().isEmpty()) {
                boolQueryBuilder.filter(Query.of(q -> q
                    .term(TermQuery.of(t -> t
                        .field("category.name.keyword")
                        .value(category)
                    ))
                ));
            }

            if (city != null && !city.trim().isEmpty()) {
                boolQueryBuilder.filter(Query.of(q -> q
                    .term(TermQuery.of(t -> t
                        .field("address.city.keyword")
                        .value(city)
                    ))
                ));
            }

            if (startDate != null) {
                boolQueryBuilder.filter(Query.of(q -> q
                    .range(RangeQuery.of(r -> r
                        .field("startTime")
                        .gte(org.opensearch.client.opensearch._types.query_dsl.FieldValue.of(startDate.toString()))
                    ))
                ));
            }

            if (endDate != null) {
                boolQueryBuilder.filter(Query.of(q -> q
                    .range(RangeQuery.of(r -> r
                        .field("endTime")
                        .lte(org.opensearch.client.opensearch._types.query_dsl.FieldValue.of(endDate.toString()))
                    ))
                ));
            }

            // Only show published events
            boolQueryBuilder.filter(Query.of(q -> q
                .term(TermQuery.of(t -> t
                    .field("status")
                    .value("PUBLISHED")
                ))
            ));

            // Only show future events
            boolQueryBuilder.filter(Query.of(q -> q
                .range(RangeQuery.of(r -> r
                    .field("startTime")
                    .gte(org.opensearch.client.opensearch._types.query_dsl.FieldValue.of(LocalDateTime.now().toString()))
                ))
            ));

            Query boolQuery = Query.of(q -> q.bool(boolQueryBuilder.build()));
            searchBuilder.query(boolQuery);

            // Add sorting - relevance first, then start time
            searchBuilder.sort(s -> s
                .score(sc -> sc.order(SortOrder.Desc))
            );
            searchBuilder.sort(s -> s
                .field(f -> f
                    .field("startTime")
                    .order(SortOrder.Asc)
                )
            );

            SearchResponse<EventSearchDocument> response = client.search(
                searchBuilder.build(), 
                EventSearchDocument.class
            );

            log.debug("Search returned {} results", response.hits().total().value());
            return response;
        } catch (Exception e) {
            log.error("Failed to search events", e);
            throw new RuntimeException("Failed to search events", e);
        }
    }

    /**
     * Delete event from index
     */
    public void deleteEvent(UUID eventId) {
        try {
            client.delete(d -> d
                .index(eventsIndex)
                .id(eventId.toString())
            );
            log.debug("Deleted event from index: {}", eventId);
        } catch (Exception e) {
            log.error("Failed to delete event from index: {}", eventId, e);
            // Don't throw - deletion failures are not critical
        }
    }

    /**
     * Check if index exists, create if not
     */
    public void ensureIndexExists() {
        try {
            boolean exists = client.indices().exists(e -> e.index(eventsIndex)).value();
            if (!exists) {
                createIndex();
            }
        } catch (Exception e) {
            log.error("Failed to check index existence", e);
            throw new RuntimeException("Failed to check index existence", e);
        }
    }

    /**
     * Create events index with proper mapping
     */
    private void createIndex() {
        try {
            client.indices().create(c -> c
                .index(eventsIndex)
                .mappings(m -> m
                    .properties("name", p -> p
                        .text(t -> t.analyzer("standard"))
                    )
                    .properties("description", p -> p
                        .text(t -> t.analyzer("standard"))
                    )
                    .properties("category", p -> p
                        .object(o -> o
                            .properties("name", np -> np
                                .text(t -> t.analyzer("standard"))
                                .keyword(k -> k)
                            )
                        )
                    )
                    .properties("address", p -> p
                        .object(o -> o
                            .properties("city", np -> np
                                .text(t -> t.analyzer("standard"))
                                .keyword(k -> k)
                            )
                            .properties("state", np -> np
                                .keyword(k -> k)
                            )
                        )
                    )
                    .properties("startTime", p -> p
                        .date(d -> d)
                    )
                    .properties("endTime", p -> p
                        .date(d -> d)
                    )
                    .properties("status", p -> p
                        .keyword(k -> k)
                    )
                )
            );
            log.info("Created OpenSearch index: {}", eventsIndex);
        } catch (Exception e) {
            log.error("Failed to create index", e);
            throw new RuntimeException("Failed to create index", e);
        }
    }
}
```

### Document Model

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/search/model/EventSearchDocument.java`**

```java
package com.accessplus.eventpro.event.search.model;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Document model for indexing events in OpenSearch.
 * This is a flattened representation of EventEntity optimized for search.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventSearchDocument {
    private UUID id;
    private String name;
    private String description;
    
    @JsonProperty("startTime")
    private LocalDateTime startTime;
    
    @JsonProperty("endTime")
    private LocalDateTime endTime;
    
    private String imageUrl;
    private Boolean marketingEnabled;
    private String status;
    
    // Nested objects for better search
    private CategoryInfo category;
    private AddressInfo address;
    private OrganizerInfo organizer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInfo {
        private UUID id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddressInfo {
        private String street;
        private String city;
        private String state;
        private String zipCode;
        private String country;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizerInfo {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
    }

    /**
     * Convert EventEntity to EventSearchDocument
     */
    public static EventSearchDocument fromEntity(EventEntity event) {
        return EventSearchDocument.builder()
            .id(event.getId())
            .name(event.getName())
            .description(event.getDescription())
            .startTime(event.getStartTime())
            .endTime(event.getEndTime())
            .imageUrl(event.getImageUrl())
            .marketingEnabled(event.getMarketingEnabled())
            .status(event.getStatus() != null ? event.getStatus().name() : null)
            .category(event.getCategory() != null ? CategoryInfo.builder()
                .id(event.getCategory().getId())
                .name(event.getCategory().getName())
                .build() : null)
            .address(event.getAddress() != null ? AddressInfo.builder()
                .street(event.getAddress().getStreet())
                .city(event.getAddress().getCity())
                .state(event.getAddress().getState())
                .zipCode(event.getAddress().getZipCode())
                .country(event.getAddress().getCountry())
                .latitude(event.getAddress().getLatitude() != null ? 
                    event.getAddress().getLatitude().doubleValue() : null)
                .longitude(event.getAddress().getLongitude() != null ? 
                    event.getAddress().getLongitude().doubleValue() : null)
                .build() : null)
            .organizer(event.getOrganizer() != null ? OrganizerInfo.builder()
                .id(event.getOrganizer().getId())
                .firstName(event.getOrganizer().getFirstName())
                .lastName(event.getOrganizer().getLastName())
                .email(event.getOrganizer().getEmail())
                .build() : null)
            .build();
    }
}
```

### Event Synchronization

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/event/service/impl/EventServiceImpl.java`**

Add OpenSearch synchronization:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final OpenSearchService openSearchService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public EventEntity createEvent(EventEntity event) {
        EventEntity saved = eventRepository.save(event);
        
        // Index in OpenSearch (async via event)
        eventPublisher.publishEvent(new EventCreatedEvent(saved));
        
        return saved;
    }

    @Override
    @Transactional
    public EventEntity updateEvent(UUID id, EventEntity event) {
        EventEntity existing = getEventById(id);
        // Update fields...
        EventEntity updated = eventRepository.save(event);
        
        // Update index
        eventPublisher.publishEvent(new EventUpdatedEvent(updated));
        
        return updated;
    }

    @Override
    @Transactional
    public void deleteEvent(UUID id) {
        eventRepository.deleteById(id);
        
        // Remove from index
        eventPublisher.publishEvent(new EventDeletedEvent(id));
    }
}
```

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/event/listener/OpenSearchEventListener.java`**

```java
package com.accessplus.eventpro.event.event.listener;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.search.service.OpenSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenSearchEventListener {

    private final OpenSearchService openSearchService;

    @Async
    @EventListener
    public void handleEventCreated(EventCreatedEvent event) {
        try {
            openSearchService.indexEvent(event.getEvent());
            log.debug("Indexed event after creation: {}", event.getEvent().getId());
        } catch (Exception e) {
            log.error("Failed to index event after creation: {}", event.getEvent().getId(), e);
            // Don't throw - indexing failures shouldn't break event creation
        }
    }

    @Async
    @EventListener
    public void handleEventUpdated(EventUpdatedEvent event) {
        try {
            openSearchService.indexEvent(event.getEvent());
            log.debug("Indexed event after update: {}", event.getEvent().getId());
        } catch (Exception e) {
            log.error("Failed to index event after update: {}", event.getEvent().getId(), e);
        }
    }

    @Async
    @EventListener
    public void handleEventDeleted(EventDeletedEvent event) {
        try {
            openSearchService.deleteEvent(event.getEventId());
            log.debug("Deleted event from index: {}", event.getEventId());
        } catch (Exception e) {
            log.error("Failed to delete event from index: {}", event.getEventId(), e);
        }
    }
}
```

---

## API Implementation

### Search Controller

**File: `backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/EventSearchController.java`**

```java
package com.accessplus.eventpro.api.controller;

import com.accessplus.eventpro.api.dto.ApiResponse;
import com.accessplus.eventpro.api.dto.EventResponse;
import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.search.model.EventSearchDocument;
import com.accessplus.eventpro.event.search.service.OpenSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/events/search")
@RequiredArgsConstructor
@Slf4j
public class EventSearchController {

    private final OpenSearchService openSearchService;
    private final EventRepository eventRepository;

    @GetMapping
    @Operation(
        summary = "Advanced event search",
        description = "Full-text search with filters. Uses OpenSearch for relevance ranking. " +
                      "Supports fuzzy matching, multi-field search, and advanced filtering."
    )
    public ResponseEntity<ApiResponse<SearchResult>> searchEvents(
            @Parameter(description = "Search query (searches name, description, category, location)")
            @RequestParam(required = false) String q,
            
            @Parameter(description = "Filter by category name")
            @RequestParam(required = false) String category,
            
            @Parameter(description = "Filter by city")
            @RequestParam(required = false) String city,
            
            @Parameter(description = "Filter events starting after this date")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            
            @Parameter(description = "Filter events ending before this date")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            
            @Parameter(description = "Page number (0-based)")
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            SearchResponse<EventSearchDocument> searchResponse = openSearchService.searchEvents(
                q, category, city, startDate, endDate, page, size
            );

            // Convert document IDs to full entities
            List<UUID> eventIds = searchResponse.hits().hits().stream()
                .map(hit -> UUID.fromString(hit.id()))
                .collect(Collectors.toList());

            // Load full entities from database
            Map<UUID, EventEntity> eventsMap = eventRepository.findAllById(eventIds)
                .stream()
                .collect(Collectors.toMap(EventEntity::getId, e -> e));

            // Maintain search result order
            List<EventResponse> events = searchResponse.hits().hits().stream()
                .map(hit -> {
                    UUID eventId = UUID.fromString(hit.id());
                    EventEntity entity = eventsMap.get(eventId);
                    return entity != null ? EventResponse.fromEntity(entity) : null;
                })
                .filter(e -> e != null)
                .collect(Collectors.toList());

            SearchResult result = SearchResult.builder()
                .events(events)
                .total(searchResponse.hits().total().value())
                .page(page)
                .size(size)
                .maxScore(searchResponse.hits().maxScore())
                .build();

            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            log.error("Search failed", e);
            // Fallback to database search
            return fallbackSearch(q, category, city, page, size);
        }
    }

    private ResponseEntity<ApiResponse<SearchResult>> fallbackSearch(
            String q, String category, String city, int page, int size) {
        // Fallback to PostgreSQL search
        // Implementation similar to current EventController.getAllEvents()
        log.warn("Using fallback database search");
        // ... fallback implementation
        return ResponseEntity.ok(ApiResponse.success(SearchResult.builder().build()));
    }
}
```

### Response Models

**File: `backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/SearchResult.java`**

```java
package com.accessplus.eventpro.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResult {
    private List<EventResponse> events;
    private Long total;
    private Integer page;
    private Integer size;
    private Double maxScore;
}
```

### Admin Search Service

**File: `backend/services/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/search/AdminSearchService.java`**

```java
package com.accessplus.eventpro.core.user.search;

import com.accessplus.eventpro.core.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.SearchRequest;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSearchService {

    private static final String USERS_INDEX = "users";
    private final OpenSearchClient client;

    @Value("${opensearch.index.users:users}")
    private String usersIndex;

    /**
     * Search users for admin interface
     */
    public SearchResponse<UserSearchDocument> searchUsers(
            String query,
            String role,
            String status,
            int page,
            int size) {
        
        try {
            SearchRequest.Builder searchBuilder = new SearchRequest.Builder()
                .index(usersIndex)
                .from(page * size)
                .size(size);

            // Build query similar to event search
            // Search across email, firstName, lastName
            // Filter by role and status
            
            // Implementation similar to OpenSearchService.searchEvents()
            
            return client.search(searchBuilder.build(), UserSearchDocument.class);
        } catch (Exception e) {
            log.error("Failed to search users", e);
            throw new RuntimeException("Failed to search users", e);
        }
    }
}
```

---

## Use Cases

### User Event Search Scenarios

#### 1. Basic Text Search

**Query**: "jazz concert"
**Expected**: Events with "jazz" or "concert" in name, description, or category
**Features Used**: Multi-match query, fuzzy matching

#### 2. Category Filter

**Query**: "music" + category: "Music"
**Expected**: Music events only
**Features Used**: Term filter

#### 3. Location-Based Search

**Query**: "festival" + city: "New York"
**Expected**: Festivals in New York
**Features Used**: Multi-match + term filter

#### 4. Date Range Search

**Query**: "conference" + startDate: "2025-06-01" + endDate: "2025-06-30"
**Expected**: Conferences in June 2025
**Features Used**: Range filter

#### 5. Typo-Tolerant Search

**Query**: "jass concert" (typo: "jass" instead of "jazz")
**Expected**: Still finds jazz concerts
**Features Used**: Fuzzy matching (fuzziness: AUTO)

#### 6. Combined Search

**Query**: "workshop" + category: "Arts & Crafts" + city: "Boston" + startDate: "2025-03-01"
**Expected**: Arts & Crafts workshops in Boston starting March 2025
**Features Used**: Multi-match + multiple filters

### Admin Search Scenarios

#### 1. User Search

**Query**: "<john@example.com>"
**Expected**: User with matching email
**Features Used**: Exact match on email field

#### 2. User by Name

**Query**: "John Smith"
**Expected**: Users with "John" in firstName or "Smith" in lastName
**Features Used**: Multi-match query

#### 3. Users by Role

**Query**: role: "ORGANIZER"
**Expected**: All organizers
**Features Used**: Term filter

#### 4. Events by Organizer

**Query**: organizer.email: "<organizer@example.com>"
**Expected**: All events by that organizer
**Features Used**: Nested query

#### 5. Analytics Queries

**Query**: Aggregations for event counts by category, revenue by month
**Expected**: Aggregated statistics
**Features Used**: Aggregations API

### Advanced Filtering Examples

#### Example 1: Price Range Filter

```java
// Add to EventSearchDocument
private BigDecimal minPrice;
private BigDecimal maxPrice;

// Add to search query
if (minPrice != null) {
    boolQueryBuilder.filter(Query.of(q -> q
        .range(RangeQuery.of(r -> r
            .field("minPrice")
            .gte(FieldValue.of(minPrice.toString()))
        ))
    ));
}
```

#### Example 2: Distance-Based Search

```java
// Geo-distance query for location-based search
Query geoQuery = Query.of(q -> q
    .geoDistance(g -> g
        .field("address.location")
        .distance("10km")
        .location(l -> l
            .latlon(ll -> ll
                .lat(latitude)
                .lon(longitude)
            )
        )
    )
);
```

---

## Data Synchronization

### Event-Driven Sync (Recommended)

**Advantages:**

- Real-time updates
- Decoupled from main transaction
- Can be async
- Easy to implement

**Implementation:**

1. **Spring Events** (Already shown in EventServiceImpl)
2. **Event Listeners** (Already shown in OpenSearchEventListener)

### Bulk Sync Strategy

**Use Cases:**

- Initial data migration
- Re-indexing after mapping changes
- Recovery from index corruption

**Implementation:**

**File: `backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/AdminController.java`**

Add admin endpoint:

```java
@PostMapping("/opensearch/sync")
@PreAuthorize("hasRole('ADMIN')")
@Operation(summary = "Sync all events to OpenSearch", 
           description = "Bulk sync all events to OpenSearch index. Admin only.")
public ResponseEntity<ApiResponse<String>> syncAllEvents() {
    try {
        List<EventEntity> events = eventService.getAllEvents(Pageable.unpaged()).getContent();
        openSearchService.bulkIndexEvents(events);
        return ResponseEntity.ok(ApiResponse.success(
            String.format("Synced %d events to OpenSearch", events.size())
        ));
    } catch (Exception e) {
        log.error("Failed to sync events", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("Failed to sync events: " + e.getMessage()));
    }
}
```

### Scheduled Sync

**File: `backend/services/modules/eventpro-event/src/main/java/com/accessplus/eventpro/event/search/scheduler/OpenSearchSyncScheduler.java`**

```java
package com.accessplus.eventpro.event.search.scheduler;

import com.accessplus.eventpro.event.event.entity.EventEntity;
import com.accessplus.eventpro.event.event.repository.EventRepository;
import com.accessplus.eventpro.event.search.service.OpenSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenSearchSyncScheduler {

    private final EventRepository eventRepository;
    private final OpenSearchService openSearchService;

    /**
     * Daily sync at 2 AM - syncs events updated in last 24 hours
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void syncRecentEvents() {
        try {
            LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
            List<EventEntity> recentEvents = eventRepository
                .findByUpdatedAtAfter(yesterday);
            
            if (!recentEvents.isEmpty()) {
                openSearchService.bulkIndexEvents(recentEvents);
                log.info("Synced {} recent events to OpenSearch", recentEvents.size());
            }
        } catch (Exception e) {
            log.error("Failed to sync recent events", e);
        }
    }

    /**
     * Weekly full sync on Sunday at 3 AM
     */
    @Scheduled(cron = "0 0 3 * * SUN")
    public void fullSync() {
        try {
            List<EventEntity> allEvents = eventRepository.findAll();
            openSearchService.bulkIndexEvents(allEvents);
            log.info("Full sync completed: {} events", allEvents.size());
        } catch (Exception e) {
            log.error("Failed to perform full sync", e);
        }
    }
}
```

### Initial Data Migration

**Script: `scripts/sync-opensearch.sh`**

```bash
#!/bin/bash

# Initial OpenSearch sync script
# Run after OpenSearch domain is provisioned

echo "Starting OpenSearch initial sync..."

# Call admin sync endpoint
curl -X POST "http://localhost:8080/api/v1/admin/opensearch/sync" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

echo "Sync completed"
```

---

## Best Practices

### Index Mapping Recommendations

1. **Use appropriate field types:**
   - `text` for full-text search (name, description)
   - `keyword` for exact matches (status, category.name)
   - `date` for date fields (startTime, endTime)
   - `geo_point` for location-based search (latitude, longitude)

2. **Use analyzers:**
   - `standard` analyzer for English text
   - `keyword` analyzer for exact matches
   - Custom analyzers for special requirements

3. **Field boosting:**
   - Boost important fields (name^3, description^1)
   - Adjust based on search relevance

### Query Optimization

1. **Use filters instead of queries when possible:**
   - Filters are cached and faster
   - Use queries for relevance scoring
   - Use filters for exact matches

2. **Limit result size:**
   - Use pagination (from/size)
   - Set reasonable page sizes (20-50)
   - Use scroll API for large result sets

3. **Avoid expensive queries:**
   - Limit wildcard queries
   - Use phrase queries instead of complex bool queries when possible
   - Cache frequent queries

### Error Handling Patterns

1. **Fallback to database:**
   - If OpenSearch is unavailable, fall back to PostgreSQL
   - Log errors but don't break user experience

2. **Retry logic:**
   - Retry failed indexing operations
   - Use exponential backoff
   - Queue failed operations for later retry

3. **Monitoring:**
   - Track search success/failure rates
   - Monitor query performance
   - Alert on index errors

### Monitoring and Alerting

**CloudWatch Metrics to Monitor:**

- Search latency
- Indexing success rate
- Query error rate
- Cluster health
- Storage usage

**Alerts to Configure:**

- OpenSearch cluster health is red
- Search latency > 1 second
- Indexing failure rate > 5%
- Storage usage > 80%

### Cost Optimization

1. **Right-size instances:**
   - Start with t3.small.search
   - Scale based on usage
   - Use reserved instances for production

2. **Optimize storage:**
   - Use GP3 volumes (cheaper than GP2)
   - Set appropriate retention policies
   - Archive old data

3. **Query optimization:**
   - Efficient queries use less CPU
   - Cache frequent queries
   - Limit result sizes

---

## Testing Strategy

### Unit Tests

**File: `backend/services/modules/eventpro-event/src/test/java/com/accessplus/eventpro/event/search/service/OpenSearchServiceTest.java`**

```java
package com.accessplus.eventpro.event.search.service;

import com.accessplus.eventpro.event.search.model.EventSearchDocument;
import org.junit.jupiter.api.Test;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
    "opensearch.endpoint=http://localhost:9200",
    "opensearch.username=admin",
    "opensearch.password=admin"
})
class OpenSearchServiceTest {

    @Autowired
    private OpenSearchService openSearchService;

    @Test
    void testIndexEvent() {
        // Test indexing
        // Verify document is indexed
    }

    @Test
    void testSearchEvents() {
        // Test search functionality
        // Verify results are relevant
    }

    @Test
    void testDeleteEvent() {
        // Test deletion
        // Verify document is removed
    }
}
```

### Integration Tests

**File: `backend/services/modules/eventpro-api/src/test/java/com/accessplus/eventpro/api/controller/EventSearchControllerIntegrationTest.java`**

```java
package com.accessplus.eventpro.api.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class EventSearchControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testSearchEvents() throws Exception {
        mockMvc.perform(get("/api/v1/events/search")
                .param("q", "jazz")
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk());
    }
}
```

### Performance Testing

**Test Scenarios:**

1. Search latency < 200ms for simple queries
2. Search latency < 500ms for complex queries
3. Indexing throughput > 1000 events/second
4. Concurrent search requests (100+ simultaneous)

### Search Quality Validation

**Test Cases:**

1. Typo tolerance: "jass" finds "jazz"
2. Relevance ranking: More relevant results first
3. Filter accuracy: Filters work correctly
4. Pagination: Results are consistent across pages

---

## Deployment Checklist

### Infrastructure Provisioning

- [ ] Create OpenSearch domain via Terraform
- [ ] Configure VPC and security groups
- [ ] Set up IAM roles and policies
- [ ] Configure CloudWatch logging
- [ ] Store credentials in Secrets Manager
- [ ] Test connectivity from ECS tasks

### App Configuration

- [ ] Add OpenSearch dependencies to build.gradle
- [ ] Configure OpenSearch client beans
- [ ] Add OpenSearch configuration to application.yml
- [ ] Set environment variables in ECS task definition
- [ ] Update Secrets Manager references

### Data Migration

- [ ] Create index mappings
- [ ] Run initial bulk sync
- [ ] Verify data in OpenSearch Dashboards
- [ ] Test search functionality
- [ ] Monitor indexing performance

### Code Deployment

- [ ] Deploy updated backend services
- [ ] Verify OpenSearch service is working
- [ ] Test search endpoints
- [ ] Monitor error logs
- [ ] Verify event synchronization

### Rollback Procedures

1. **If OpenSearch fails:**
   - Fallback to database search (already implemented)
   - Disable OpenSearch service via feature flag
   - Revert to previous deployment

2. **If indexing fails:**
   - Check OpenSearch cluster health
   - Review error logs
   - Re-run bulk sync if needed

3. **If search quality is poor:**
   - Review index mappings
   - Adjust query boost values
   - Re-index with updated mappings

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Connection Timeout

**Symptoms:** Cannot connect to OpenSearch domain
**Solutions:**

- Verify security group allows traffic from ECS
- Check VPC endpoint configuration
- Verify credentials are correct
- Check network connectivity

#### Issue 2: Index Not Found

**Symptoms:** `index_not_found_exception`
**Solutions:**

- Run `ensureIndexExists()` on startup
- Create index manually via API
- Check index name configuration

#### Issue 3: Slow Search Performance

**Symptoms:** Search queries take > 1 second
**Solutions:**

- Check cluster health and resource usage
- Optimize queries (use filters instead of queries)
- Increase instance size if needed
- Review index mappings

#### Issue 4: Documents Not Appearing in Search

**Symptoms:** Recently created events don't appear
**Solutions:**

- Check if indexing succeeded (review logs)
- Verify event listener is working
- Check OpenSearch refresh interval
- Manually refresh index if needed

#### Issue 5: High Memory Usage

**Symptoms:** OpenSearch cluster memory usage > 80%
**Solutions:**

- Increase instance size
- Optimize queries to reduce memory usage
- Review field mappings (remove unnecessary fields)
- Archive old data

### Performance Tuning

1. **Index Settings:**
   - Adjust refresh interval (default: 1s, can increase to 5s)
   - Configure number of shards and replicas
   - Optimize field mappings

2. **Query Optimization:**
   - Use `filter` context instead of `query` context when possible
   - Limit `from` parameter (use search_after for deep pagination)
   - Use `_source` filtering to reduce response size

3. **Cluster Configuration:**
   - Right-size instances based on workload
   - Enable dedicated master nodes for production
   - Configure appropriate number of replicas

### Debugging Queries

**Enable Query Logging:**

```java
// Add to OpenSearchService
log.debug("OpenSearch query: {}", queryBuilder.build().toString());
```

**Use OpenSearch Dashboards:**

- Dev Tools console for testing queries
- Index management for viewing documents
- Search profiler for analyzing slow queries

**Example Debug Query:**

```json
GET /events/_search
{
  "query": {
    "multi_match": {
      "query": "jazz",
      "fields": ["name^3", "description^1"]
    }
  },
  "explain": true
}
```

---

## Future Enhancements

### Analytics and Dashboards

**OpenSearch Dashboards Integration:**

- Create dashboards for event analytics
- User search behavior analysis
- Popular events and categories
- Revenue analytics

### Auto-Complete/Suggestions

**Implementation:**

- Use OpenSearch completion suggester
- Real-time search suggestions as user types
- Popular search terms
- Category suggestions

**Example:**

```java
SuggestionRequest suggestionRequest = SuggestionRequest.of(s -> s
    .suggesters("event-suggest", su -> su
        .prefix("jazz")
        .completion(c -> c
            .field("name.suggest")
        )
    )
);
```

### Personalization

**Features:**

- User search history
- Personalized recommendations
- Trending events based on user preferences
- Collaborative filtering

### Multi-Language Support

**Implementation:**

- Language-specific analyzers
- Multi-language field mappings
- Language detection
- Translation support

### Advanced Features

1. **Vector Search:**
   - Semantic search using embeddings
   - Similar event recommendations
   - ML-powered search

2. **Real-Time Analytics:**
   - Live event statistics
   - Real-time search trends
   - Performance monitoring

3. **Search Analytics:**
   - Track popular searches
   - Identify search failures
   - Optimize based on user behavior

---

## Reference Links

### AWS Documentation

- [Amazon OpenSearch Service Developer Guide](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/)
- [OpenSearch Java Client Documentation](https://opensearch.org/docs/latest/clients/java/)
- [OpenSearch Query DSL](https://opensearch.org/docs/latest/query-dsl/)

### Best Practices

- [OpenSearch Best Practices](https://opensearch.org/docs/latest/install-and-configure/)
- [AWS Well-Architected Framework - Analytics](https://docs.aws.amazon.com/wellarchitected/latest/analytics-pillar/)

### Related Internal Documentation

- [Modular Monolith Architecture](./modular-monolith-architecture.md)
- [Lambda Implementation Guide](./LAMBDA_IMPLEMENTATION_GUIDE.md)
- [Project Structure](./project-structure.md)

---

## Appendix

### Index Mapping Example

**Complete index mapping for events:**

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "standard"
      },
      "startTime": { "type": "date" },
      "endTime": { "type": "date" },
      "status": { "type": "keyword" },
      "category": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": {
            "type": "text",
            "fields": {
              "keyword": { "type": "keyword" }
            }
          }
        }
      },
      "address": {
        "type": "object",
        "properties": {
          "city": {
            "type": "text",
            "fields": {
              "keyword": { "type": "keyword" }
            }
          },
          "location": {
            "type": "geo_point"
          }
        }
      }
    }
  }
}
```

### Query Examples

**Example 1: Simple Text Search**

```json
{
  "query": {
    "multi_match": {
      "query": "jazz concert",
      "fields": ["name^3", "description^1", "category.name^2"]
    }
  }
}
```

**Example 2: Filtered Search**

```json
{
  "query": {
    "bool": {
      "must": {
        "multi_match": {
          "query": "festival",
          "fields": ["name", "description"]
        }
      },
      "filter": [
        { "term": { "category.name.keyword": "Music" } },
        { "term": { "address.city.keyword": "New York" } },
        { "range": { "startTime": { "gte": "2025-06-01" } } }
      ]
    }
  }
}
```

**Example 3: Geo-Distance Search**

```json
{
  "query": {
    "bool": {
      "must": {
        "match": { "name": "concert" }
      },
      "filter": {
        "geo_distance": {
          "distance": "10km",
          "address.location": {
            "lat": 40.7128,
            "lon": -74.0060
          }
        }
      }
    }
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-26  
**Status**: Implementation Guide  
**Maintained By**: Development Team
