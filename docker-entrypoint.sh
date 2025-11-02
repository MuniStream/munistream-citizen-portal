#!/bin/sh

# This script replaces environment variable placeholders in the built React app
# at container startup, allowing runtime configuration

echo "Configuring application with runtime environment variables..."

# Function to replace placeholders in all JS files
replace_env_vars() {
    # Find all JS files in the dist directory
    for file in /usr/share/nginx/html/assets/*.js; do
        if [ -f "$file" ]; then
            echo "Processing $file..."

            # Replace placeholders with actual environment variable values
            # Use sed to replace in-place
            sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" "$file"
            sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_URL__|${VITE_KEYCLOAK_URL}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_REALM__|${VITE_KEYCLOAK_REALM}|g" "$file"
            sed -i "s|__VITE_KEYCLOAK_CLIENT_ID__|${VITE_KEYCLOAK_CLIENT_ID}|g" "$file"
            sed -i "s|__VITE_TENANT__|${VITE_TENANT}|g" "$file"
            sed -i "s|__VITE_TENANT_ID__|${VITE_TENANT_ID}|g" "$file"
            sed -i "s|__VITE_TENANT_NAME__|${VITE_TENANT_NAME}|g" "$file"
            sed -i "s|__VITE_ORGANIZATION__|${VITE_ORGANIZATION}|g" "$file"
            sed -i "s|__VITE_APP_TITLE__|${VITE_APP_TITLE}|g" "$file"
            sed -i "s|__VITE_LANGUAGE__|${VITE_LANGUAGE}|g" "$file"
            sed -i "s|__VITE_ENABLE_NOTIFICATIONS__|${VITE_ENABLE_NOTIFICATIONS}|g" "$file"
            sed -i "s|__VITE_ENABLE_FILE_UPLOAD__|${VITE_ENABLE_FILE_UPLOAD}|g" "$file"
            sed -i "s|__VITE_MAX_FILE_SIZE__|${VITE_MAX_FILE_SIZE}|g" "$file"
            sed -i "s|__VITE_ALLOWED_FILE_TYPES__|${VITE_ALLOWED_FILE_TYPES}|g" "$file"
        fi
    done
}

# Replace environment variables
replace_env_vars

echo "Configuration complete. Starting nginx..."

# Start nginx
exec nginx -g 'daemon off;'