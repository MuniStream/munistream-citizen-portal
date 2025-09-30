#!/bin/bash

# H5 Smart Deployment Script for MuniStream Citizen Portal
# This script performs intelligent, non-destructive updates to containers

set -e

# Parse command line arguments
FORCE_REBUILD=${1:-false}
TARGET_CLIENT=${2:-"all"}

echo "🚀 Starting H5 Smart Deployment for Citizen Portal..."
echo "   Target Client: $TARGET_CLIENT"
echo "   Force Rebuild: $FORCE_REBUILD"

# Environment validation
if [ -z "$AURORA_ENDPOINT" ]; then
    echo "❌ Error: AURORA_ENDPOINT is not set"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD is not set"
    exit 1
fi

# Function to check if container needs update
check_container_needs_update() {
    local service_name=$1
    local container_name="citizen-portal-${service_name}"

    # Check if container exists and is running
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo "✅ Container $container_name is running"

        # Check image age vs source code changes
        local image_date=$(docker inspect "$container_name" --format='{{.Created}}' 2>/dev/null || echo "")

        if [ "$FORCE_REBUILD" = "true" ]; then
            echo "🔄 Force rebuild requested for $container_name"
            return 0
        else
            echo "ℹ️ Container $container_name exists and running - skipping rebuild"
            return 1
        fi
    else
        echo "🆕 Container $container_name not found - will create"
        return 0
    fi
}

# Function to deploy specific service
deploy_service() {
    local service_name=$1
    local service_full_name="citizen-portal-${service_name}"

    echo "🔧 Deploying service: $service_full_name"

    # Create network if it doesn't exist
    docker network create munistream-network 2>/dev/null || echo "Network already exists"

    # Build only the specific service
    echo "🏗️ Building $service_full_name..."
    docker-compose -f docker-compose.h5.yml build "$service_full_name"

    # Stop only the target service (graceful)
    echo "🛑 Gracefully stopping $service_full_name..."
    docker-compose -f docker-compose.h5.yml stop "$service_full_name" || true

    # Remove the old container
    docker-compose -f docker-compose.h5.yml rm -f "$service_full_name" || true

    # Start the specific service
    echo "▶️ Starting $service_full_name..."
    docker-compose -f docker-compose.h5.yml up -d "$service_full_name"

    # Wait for container to be ready
    echo "⏳ Waiting for $service_full_name to be ready..."
    sleep 5

    # Health check
    local port
    case $service_name in
        "core") port=3000 ;;
        "conapesca") port=3001 ;;
        "teso") port=3002 ;;
    esac

    if curl -f http://localhost:$port >/dev/null 2>&1; then
        echo "✅ $service_full_name is healthy on port $port"
    else
        echo "⚠️ $service_full_name may need more time to start"
    fi
}

# Main deployment logic
case $TARGET_CLIENT in
    "core")
        if check_container_needs_update "core" || [ "$FORCE_REBUILD" = "true" ]; then
            deploy_service "core"
        fi
        ;;
    "conapesca")
        if check_container_needs_update "conapesca" || [ "$FORCE_REBUILD" = "true" ]; then
            deploy_service "conapesca"
        fi
        ;;
    "tesoreriacdmx"|"teso")
        if check_container_needs_update "teso" || [ "$FORCE_REBUILD" = "true" ]; then
            deploy_service "teso"
        fi
        ;;
    "all")
        echo "🔄 Checking all clients for updates..."

        # Deploy only containers that need updates
        for client in core conapesca teso; do
            if check_container_needs_update "$client" || [ "$FORCE_REBUILD" = "true" ]; then
                deploy_service "$client"
            fi
        done
        ;;
    *)
        echo "❌ Invalid target client: $TARGET_CLIENT"
        echo "Valid options: core, conapesca, tesoreriacdmx, all"
        exit 1
        ;;
esac

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.h5.yml ps

# Verify container health
echo "🔍 Verifying container health..."
for port in 3000 3001 3002; do
    echo "Checking port $port..."
    if curl -f http://localhost:$port >/dev/null 2>&1; then
        echo "✅ Port $port is responding"
    else
        echo "⚠️ Port $port is not responding (may need time to start)"
    fi
done

# Show container logs summary
echo "📋 Recent container logs:"
docker-compose -f docker-compose.h5.yml logs --tail=5

echo "✅ H5 Citizen Portal deployment completed!"
echo ""
echo "🌐 Access URLs:"
echo "  - Core Client: http://localhost:3000"
echo "  - Conapesca Client: http://localhost:3001"
echo "  - Tesoreriacdmx Client: http://localhost:3002"
echo ""
echo "📝 Container Info:"
docker-compose -f docker-compose.h5.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"