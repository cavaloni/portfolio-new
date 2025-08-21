# Endpoint Discovery and Routing Flow

This diagram shows how the carbon-aware LLM proxy routes requests to a single Modal-hosted endpoint.

## Deployment Flow

```mermaid
graph TD
    %% User initiates deployment
    A[User: npm run runpod deploy] --> B[Deploy Script]
    B --> C[RunPod Service]

    %% Template creation
    C --> D[Create RunPod Template]
    D --> E{Template Created?}
    E -->|Yes| F[Get Template ID]
    E -->|No| G[Log Error & Exit]

    %% Endpoint creation
    F --> H[Create Serverless Endpoint]
    H --> I{Endpoint Created?}
    I -->|Yes| J[Get Endpoint ID]
    I -->|No| K[Log Error & Exit]

    %% URL discovery
    J --> L[Query Endpoint Details]
    L --> M{URL Available?}
    M -->|Yes| N[Store URL in Database]
    M -->|No| O[Mark URL as Pending]

    %% Database update
    N --> P[Update Deployment Record]
    O --> P
    P --> Q[Set Status: RUNNING]

    %% Success confirmation
    Q --> R[Log Success]
    R --> S[Deployment Complete]

    %% Styling
    classDef success fill:#d4edda,stroke:#155724,color:#155724
    classDef error fill:#f8d7da,stroke:#721c24,color:#721c24
    classDef process fill:#d1ecf1,stroke:#0c5460,color:#0c5460
    classDef decision fill:#fff3cd,stroke:#856404,color:#856404

    class S,R,N success
    class G,K error
    class B,C,D,F,H,J,L,P,Q process
    class E,I,M decision
```

## Request Routing Flow

```mermaid
graph TD
    %% Client request
    A[Client: POST /v1/chat/completions] --> B[Chat Router]
    B --> C{RunPod Enabled?}

    %% RunPod routing
    C -->|Yes| D[RunPod Provider Service]
    C -->|No| E[Fallback to Mock Response]

    %% Optimal deployment selection
    D --> F[Select Optimal Deployment]
    F --> G[Query Database]
    G --> H[Filter by Model & Health]
    H --> I[Score Deployments]

    %% Scoring criteria
    I --> J[Carbon Efficiency: 40%]
    I --> K[Availability: 30%]
    I --> L[Regional Preference: 20%]
    I --> M[Health Recency: 10%]

    %% Deployment selection
    J --> N[Calculate Total Score]
    K --> N
    L --> N
    M --> N
    N --> O[Select Best Deployment]

    %% Request execution
    O --> P{Endpoint URL Available?}
    P -->|Yes| Q[Make HTTP Request]
    P -->|No| R[Try Next Best Deployment]
    R --> P

    %% Response handling
    Q --> S{Request Successful?}
    S -->|Yes| T[Return Response + Carbon Footprint]
    S -->|No| U[Retry with Different Deployment]
    U --> P

    %% Fallback
    T --> V[Log Success]
    E --> V

    %% Styling
    classDef success fill:#d4edda,stroke:#155724,color:#155724
    classDef error fill:#f8d7da,stroke:#721c24,color:#721c24
    classDef process fill:#d1ecf1,stroke:#0c5460,color:#0c5460
    classDef decision fill:#fff3cd,stroke:#856404,color:#856404
    classDef scoring fill:#e2e3e5,stroke:#383d41,color:#383d41

    class T,V success
    class U error
    class A,B,D,F,G,H,N,O,Q process
    class C,P,S decision
    class J,K,L,M scoring
```

## Health Check & URL Discovery Flow

```mermaid
graph TD
    %% Health check initiation
    A[Health Check Trigger] --> B[RunPod Service]
    B --> C[Update Endpoint URLs]

    %% URL discovery process
    C --> D[Query Database]
    D --> E[Find Deployments Without URLs]
    E --> F{Deployments Found?}
    F -->|No| G[All URLs Up to Date]
    F -->|Yes| H[For Each Deployment]

    %% Individual URL update
    H --> I[Query RunPod API]
    I --> J{API Response OK?}
    J -->|Yes| K[Extract URL]
    J -->|No| L[Log Warning & Skip]

    %% URL processing
    K --> M{URL Available?}
    M -->|Yes| N[Update Database]
    M -->|No| O[Log: URL Not Ready]

    %% Health check execution
    N --> P[Perform Health Check]
    O --> P
    L --> P

    %% Health check process
    P --> Q{Endpoint URL Available?}
    Q -->|No| R[Skip Health Check]
    Q -->|Yes| S[Make Health Request]

    %% Health evaluation
    S --> T{Response OK?}
    T -->|Yes| U[Mark as Healthy]
    T -->|No| V[Mark as Unhealthy]

    %% Database update
    U --> W[Update Health Status]
    V --> W
    R --> W
    W --> X[Update Last Health Check]

    %% Completion
    X --> Y[Health Check Complete]
    G --> Y

    %% Styling
    classDef success fill:#d4edda,stroke:#155724,color:#155724
    classDef error fill:#f8d7da,stroke:#721c24,color:#721c24
    classDef process fill:#d1ecf1,stroke:#0c5460,color:#0c5460
    classDef decision fill:#fff3cd,stroke:#856404,color:#856404
    classDef warning fill:#fff3cd,stroke:#856404,color:#856404

    class Y,G,U,N success
    class V error
    class A,B,C,D,H,I,K,S process
    class F,J,M,Q,T decision
    class L,O,R warning
```

## Database Schema & Relationships

```mermaid
erDiagram
    %% Novita entities removed
        uuid id PK
        string modelId
        string region
        string gpuType
        enum status
        enum deploymentType
        int minReplicas
        int maxReplicas
        int currentReplicas
        boolean autoScaling
        string endpointUrl
        string novitaDeploymentId
        string novitaModelId
        jsonb configuration
        timestamp lastHealthCheck
        string healthStatus
        decimal carbonIntensity
        decimal deploymentCostPerHour
        bigint totalRequests
        bigint totalTokens
        decimal successRate
        timestamp createdAt
        timestamp updatedAt
    }

    %% Novita entities removed
        uuid id PK
        uuid deploymentId FK
        string novitaInstanceId
        enum status
        string instanceName
        int gpuCount
        int vcpuCount
        int memoryGb
        string internalIp
        string externalIp
        jsonb portMappings
        decimal costPerHour
        decimal totalCost
        timestamp lastActivity
        timestamp startedAt
        timestamp stoppedAt
    }

    ModelInfo {
        uuid id PK
        string name
        string provider
        string modelType
        int parameterCount
        decimal costPer1kTokens
        int tokensPerSecond
        jsonb capabilities
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    %% Legacy RunPod entities removed; Modal does not track deployments in DB
```

## System Architecture Overview

```mermaid
graph TB
    %% External Systems
    subgraph "External Services"
        MODAL[Modal Web Endpoint]
        CF[Carbon Footprint APIs]
    end

    %% Client Layer
    subgraph "Client Layer"
        UI[Frontend UI]
        CLI[CLI Commands]
        API[API Clients]
    end

    %% API Gateway
    subgraph "API Gateway"
        CR[Chat Router]
        MR[Models Router]
    end

    %% Service Layer
    subgraph "Service Layer"
        MPP[Modal Provider Service]
        CS[Carbon Service]
    end

    %% Data Layer
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Redis[(Redis Cache)]
    end

    %% RunPod Infrastructure
    subgraph "Modal Infrastructure"
        EP[Modal App /v1/chat/completions]
    end

    %% Connections
    UI --> CR
    CLI --> RR
    API --> CR

    CR --> MPP

    RPS --> RP
    RPP --> EP1
    RPP --> EP2
    RPP --> EP3
    RS --> CF

    RPS --> DB
    RPP --> DB
    RS --> DB
    CS --> Redis

    %% Styling
    classDef external fill:#f8f9fa,stroke:#6c757d,color:#6c757d
    classDef client fill:#e3f2fd,stroke:#1976d2,color:#1976d2
    classDef gateway fill:#f3e5f5,stroke:#7b1fa2,color:#7b1fa2
    classDef service fill:#e8f5e8,stroke:#388e3c,color:#388e3c
    classDef data fill:#fff3e0,stroke:#f57c00,color:#f57c00
    classDef infrastructure fill:#fce4ec,stroke:#c2185b,color:#c2185b

    class RP,CF external
    class UI,CLI,API client
    class CR,RR,MR gateway
    class RPS,RPP,RS,CS service
    class DB,Redis data
    class EP1,EP2,EP3 infrastructure
```

## Key Components Summary

### **Deployment Management**

- **RunPod Service**: Handles template and endpoint creation
- **URL Discovery**: Automatically fetches endpoint URLs after creation
- **Database Tracking**: Stores deployment metadata and status

### **Request Routing**

- **Carbon-Aware Selection**: Prioritizes low-carbon regions
- **Health-Based Routing**: Only routes to healthy endpoints
- **Failover Logic**: Automatically retries with different deployments

### **Health Monitoring**

- **Periodic Checks**: Regular health monitoring of all endpoints
- **URL Updates**: Automatic discovery of missing endpoint URLs
- **Status Tracking**: Real-time health status in database

### **Carbon Efficiency**

- **Regional Scoring**: Norway (0.017), Sweden (0.045), Oregon (0.155), California (0.233) kg CO2e/kWh
- **Weighted Selection**: 40% carbon efficiency, 30% availability, 20% regional preference, 10% health recency

This architecture ensures reliable, carbon-efficient LLM request routing with automatic endpoint discovery and health monitoring.
