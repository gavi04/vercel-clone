#!/bin/bash

set -e  # Exit immediately if any command fails

# Check if GIT_REPOSITORY_URL is set
if [ -z "$GIT_REPOSITORY_URL" ]; then
  echo " Environment variable GIT_REPOSITORY_URL is not set."
  exit 1
fi

echo " Cloning repository from $GIT_REPOSITORY_URL..."
git clone "$GIT_REPOSITORY_URL" /home/app/output

# Check if the clone was successful
if [ ! -d "/home/app/output" ]; then
  echo " Failed to clone repository."
  exit 1
fi

echo " Repository cloned successfully."

# Run the build script
echo " Running script.js..."
node script.js

echo " Build and upload complete."
