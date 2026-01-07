#!/bin/bash

# Bump patch version on each commit
VERSION_FILE="VERSION"

if [ ! -f "$VERSION_FILE" ]; then
  echo "1.0.0" > "$VERSION_FILE"
fi

# Read current version
VERSION=$(cat "$VERSION_FILE")

# Split into major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Increment patch
PATCH=$((PATCH + 1))

# Write new version
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "$NEW_VERSION" > "$VERSION_FILE"

# Stage the version file so it's included in the commit
git add "$VERSION_FILE"

echo "Version bumped: $VERSION -> $NEW_VERSION"


