#!/bin/bash
set -e

# Configuration
VERSION_FILE="VERSION"
PACKAGE_JSON="web-dashboard/package.json"
README="README.md"
CHANGELOG="CHANGELOG.md"

# 1. Get current version
if [ ! -f "$VERSION_FILE" ]; then
    echo "Error: $VERSION_FILE not found."
    exit 1
fi

current_version=$(cat "$VERSION_FILE")
# Ensure version starts with 'v' for tag, but file might not have 'v'. 
# Check actual file content.
if [[ "$current_version" != v* ]]; then
    # If VERSION file doesn't have 'v', add it for tag logic
    tag_prefix="v"
else
    tag_prefix=""
fi

echo "Current version: $current_version"

# 2. Increment patch version (v1.2.1-patch.X -> v1.2.1-patch.X+1)
# Extract patch number using regex
if [[ "$current_version" =~ patch\.([0-9]+) ]]; then
    patch_num="${BASH_REMATCH[1]}"
    new_patch_num=$((patch_num + 1))
    new_version="${current_version/patch.$patch_num/patch.$new_patch_num}"
else
    echo "Error: Version format not recognized (expected *patch.N). Aborting."
    exit 1
fi

echo "New version: $new_version"

# 3. Update files
echo "Updating files..."

# Update VERSION
echo "$new_version" > "$VERSION_FILE"

# Update package.json (remove 'v' prefix if present for JSON)
json_version=${new_version#v}
current_json_version=${current_version#v}
# specific sed for package.json to avoid matching other "version" keys if possible, but simpler is okay for now
sed -i '' "s/\"version\": \"$current_json_version\"/\"version\": \"$json_version\"/" "$PACKAGE_JSON"

# Update README.md (Badge)
# Escape dots for sed regex
escaped_current=$(echo $current_version | sed 's/\./\\./g')
escaped_new=$(echo $new_version | sed 's/\./\\./g')

sed -i '' "s/Version-$escaped_current/Version-$escaped_new/" "$README"

# Update README.md (Changelog section)
# Replace the "Latest" header with new version, and demote old version
# We use a temp file to handle newlines properly with sed on mac
sed -i '' "s/### $escaped_current (Latest)/### $new_version (Latest)\\
\\
### $current_version/" "$README"

# 4. Generate CHANGELOG entry
# Get commits since last tag
last_tag="$current_version" 
# Ensure tag has 'v' if needed. The VERSION file has 'v' usually? 
# Let's check user's VERSION file: "v1.2.1-patch.17". So it has 'v'.
commits=$(git log "$last_tag"..HEAD --pretty=format:"- %s (%h)")

if [ -z "$commits" ]; then
    echo "No commits found since $last_tag. Using placeholder."
    commits="- No major changes."
fi

# Create temporary changelog content
temp_changelog="temp_changelog.md"
echo "## [$new_version] - $(date +%Y-%m-%d)" > "$temp_changelog"
echo "### Changed" >> "$temp_changelog"
echo "$commits" >> "$temp_changelog"
echo "" >> "$temp_changelog"

# Insert after line 7 (approx) or search for header
# We'll just insert after the semantic versioning link
sed -i '' "/Semantic Versioning/r $temp_changelog" "$CHANGELOG"
rm "$temp_changelog"

echo "------------------------------------------------"
echo "Updated $CHANGELOG with draft entries."
echo "Updated $VERSION_FILE, $PACKAGE_JSON, and $README."
echo "------------------------------------------------"
echo "Please REVIEW and EDIT $CHANGELOG manually now."
echo "You can add more details or organize comments."
echo ""
echo "Press ENTER to continue to COMMIT, TAG, and PUSH."
echo "Press Ctrl+C to abort (changes will remain staged/unstaged)."
read

# 5. Commit and Tag
echo "Committing..."
git add "$VERSION_FILE" "$PACKAGE_JSON" "$README" "$CHANGELOG"
git commit -m "chore: release $new_version"

echo "Tagging..."
git tag "$new_version"

echo "Pushing..."
git push origin HEAD --tags

echo "------------------------------------------------"
echo "Released $new_version successfully!"
echo "------------------------------------------------"
