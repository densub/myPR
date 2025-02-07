#!/bin/bash

# Check if secret exists
if [ -z "$GOOGLE_SERVICE_INFO_BASE64" ]; then
  echo "Error: GOOGLE_SERVICE_INFO_BASE64 is not set"
  exit 1
fi

# Decode the Base64 string into the GoogleService-Info.plist file
echo $GOOGLE_SERVICE_INFO_BASE64 | base64 --decode > ./ios/GoogleService-Info.plist

echo "✅ GoogleService-Info.plist has been created successfully."
