#!/bin/sh
set -e

# Create .yarn/releases directory if it doesn't exist
mkdir -p .yarn/releases

# Download Yarn binary if it doesn't exist
if [ ! -f .yarn/releases/yarn-3.6.1.cjs ]; then
  echo "Downloading Yarn 3.6.1..."
  curl -sL https://github.com/yarnpkg/berry/releases/download/@yarnpkg/cli/3.6.1/packages/berry-cli/bin/berry.js -o .yarn/releases/yarn-3.6.1.cjs
  chmod +x .yarn/releases/yarn-3.6.1.cjs
  echo "Yarn 3.6.1 has been downloaded and made executable."
else
  echo "Yarn 3.6.1 is already set up."
fi

# Set Yarn version in .yarnrc.yml
echo "nodeLinker: node-modules" > .yarnrc.yml
echo "yarnPath: .yarn/releases/yarn-3.6.1.cjs" >> .yarnrc.yml

echo "Yarn setup complete!"
