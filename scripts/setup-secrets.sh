#!/bin/bash

# Decode the Base64 secret and save it as GoogleService-Info.plist
echo $GOOGLE_SERVICE_INFO_BASE64 | base64 --decode > ./ios/GoogleService-Info.plist

echo "GoogleService-Info.plist has been created."
