#!/bin/bash

# Cloud SQL Proxy Setup Script
# This script helps configure the INSTANCE_CONNECTION_NAME for Cloud SQL Proxy

echo "=== Cloud SQL Proxy Setup ==="
echo ""
echo "To find your Cloud SQL instance connection name:"
echo "1. If you have gcloud installed:"
echo "   gcloud sql instances list --project=eecs-gradeview"
echo ""
echo "2. Or go to Google Cloud Console:"
echo "   https://console.cloud.google.com/sql/instances?project=eecs-gradeview"
echo ""
echo "3. The connection name format is: eecs-gradeview:REGION:INSTANCE_NAME"
echo "   Example: eecs-gradeview:us-central1:gradeview-db"
echo ""

# Check if gcloud is available
if command -v gcloud &> /dev/null; then
    echo "Fetching Cloud SQL instances..."
    gcloud sql instances list --project=eecs-gradeview
    echo ""
fi

read -p "Enter your INSTANCE_CONNECTION_NAME (or press Enter to skip): " instance_name

if [ -n "$instance_name" ]; then
    # Add or update INSTANCE_CONNECTION_NAME in .env
    if grep -q "^INSTANCE_CONNECTION_NAME=" .env; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^INSTANCE_CONNECTION_NAME=.*|INSTANCE_CONNECTION_NAME=$instance_name|" .env
        else
            sed -i "s|^INSTANCE_CONNECTION_NAME=.*|INSTANCE_CONNECTION_NAME=$instance_name|" .env
        fi
        echo "✓ Updated INSTANCE_CONNECTION_NAME in .env"
    else
        # Add new
        echo "" >> .env
        echo "# Cloud SQL Proxy" >> .env
        echo "INSTANCE_CONNECTION_NAME=$instance_name" >> .env
        echo "✓ Added INSTANCE_CONNECTION_NAME to .env"
    fi
    
    echo ""
    echo "Now you can:"
    echo "1. Start cloud-sql-proxy:"
    echo "   docker compose -f docker-compose.dev.yml up -d cloud-sql-proxy"
    echo ""
    echo "2. Update services to use cloud-sql-proxy (already configured)"
    echo ""
    echo "3. Restart services:"
    echo "   docker compose -f docker-compose.dev.yml restart api dbcron gradesync"
else
    echo "Skipped. You can manually add INSTANCE_CONNECTION_NAME to .env later."
fi

echo ""
echo "=== Current Database Configuration ==="
echo "POSTGRES_HOST: ${POSTGRES_HOST:-not set}"
echo "POSTGRES_DB: ${POSTGRES_DB:-not set}"
echo ""
echo "Note: With cloud-sql-proxy, services should use:"
echo "  POSTGRES_HOST=cloud-sql-proxy"
