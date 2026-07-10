set -e

# Determine the latest stable release tag on nodejs/node (skip pre-releases
# like `-rc`/`-nightly`, taking the highest version-sorted tag).
LATEST_TAG=$(git ls-remote --tags --refs --sort='-v:refname' \
  https://github.com/nodejs/node.git 'v*' \
  | awk -F/ '$NF !~ /-/ { print $NF; exit }')

if [ -z "$LATEST_TAG" ]; then
  echo "Could not determine the latest nodejs/node release tag" >&2
  exit 1
fi

# Persist the tag so the build step can use it as the docs version
echo "$LATEST_TAG" > .node-tag

echo "Building docs for nodejs/node $LATEST_TAG"

# Clone the repository at that tag with no checkout and shallow history
git clone --depth 1 --branch "$LATEST_TAG" --filter=blob:none --sparse \
  https://github.com/nodejs/node.git

# Move into the cloned directory
cd node

# Enable sparse checkout and specify the folder
git sparse-checkout set lib doc .

# Move back out
cd ..

# Install npm dependencies
npm ci

# Create the ./out directory
mkdir -p out
