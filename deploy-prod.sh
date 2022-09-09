set -e

SEMANTIC_VERSION="minor"
while getopts "s:" option; do
  case $option in
  s)
    SEMANTIC_VERSION=${OPTARG}
    ;;
  esac
done


npm version $SEMANTIC_VERSION
npm publish