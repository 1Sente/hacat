#!/bin/bash

# Create Keycloak database
echo "Creating Keycloak database..."
psql -U postgres -c "CREATE DATABASE keycloak;" || echo "Database keycloak might already exist"

# Create user for keycloak if it doesn't exist
echo "Creating keycloak user..."
psql -U postgres -c "CREATE USER keycloak WITH PASSWORD 'keycloak' SUPERUSER CREATEDB CREATEROLE;" || echo "User keycloak might already exist"

# Grant privileges
echo "Granting privileges..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON SCHEMA public TO keycloak;"

echo "Keycloak database setup complete!"
