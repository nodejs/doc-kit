# Clone the repository with no checkout and shallow history
git clone --depth 1 --filter=blob:none --sparse https://github.com/nodejs/node.git

# Move into the cloned directory
cd node

# Enable sparse checkout and specify the folder
git sparse-checkout set lib
git sparse-checkout set doc/api
git sparse-checkout set .

# Move back out
cd ..

# Install npm dependencies
npm ci

# Create the ./out directory
mkdir -p out
