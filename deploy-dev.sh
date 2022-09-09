set -e

npm run build
npm version prerelease
npm publish --tag beta