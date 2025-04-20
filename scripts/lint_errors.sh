# #!/bin/bash

# # Script to capture TypeScript lint errors to a file
# # Usage: ./capture-lint-errors.sh [output_file] [directory_or_file]

# # Set default values
# OUTPUT_FILE=${1:-"lint-errors.log"}
# TARGET=${2:-"."}

# echo "Capturing lint errors to $OUTPUT_FILE..."
# echo "Analyzing: $TARGET"

# # Create or clear the output file
# > "$OUTPUT_FILE"

# # Run eslint with TypeScript configuration and redirect output to the file
# # Using --no-color to avoid ANSI color codes in the output file
# npx eslint --ext .ts,.tsx "$TARGET" --no-color > "$OUTPUT_FILE" 2>&1

# # Check if any errors were found
# if [ $? -eq 0 ]; then
#   echo "No lint errors found!"
#   # Clear the file since there were no errors
#   > "$OUTPUT_FILE"
# else
#   ERROR_COUNT=$(grep -c "error" "$OUTPUT_FILE")
#   WARNING_COUNT=$(grep -c "warning" "$OUTPUT_FILE")
  
#   echo "Lint check complete!"
#   echo "Found $ERROR_COUNT errors and $WARNING_COUNT warnings."
#   echo "Results saved to $OUTPUT_FILE"
# fi


#!/bin/bash

# Script to capture Oxlint errors to a file
# Usage: ./capture-oxlint-errors.sh [output_file] [directory_or_file]

# Set default values
OUTPUT_FILE=${1:-"logs/oxlint-errors.log"}
TARGET=${2:-"."}

echo "Capturing Oxlint errors to $OUTPUT_FILE..."
echo "Analyzing: $TARGET"

# Create or clear the output file
> "$OUTPUT_FILE"

# Run oxlint and redirect output to the file
npx oxlint "$TARGET" > "$OUTPUT_FILE" 2>&1

# Check if any errors were found
if [ $? -eq 0 ]; then
  echo "No lint errors found!"
  # Clear the file since there were no errors
  > "$OUTPUT_FILE"
else
  # Count errors - Oxlint format might be different, adjust the grep pattern as needed
  ERROR_COUNT=$(grep -c "error" "$OUTPUT_FILE")
  WARNING_COUNT=$(grep -c "warning" "$OUTPUT_FILE")
  
  echo "Lint check complete!"
  echo "Found approximately $ERROR_COUNT errors and $WARNING_COUNT warnings."
  echo "Results saved to $OUTPUT_FILE"
  
  # Display a summary of the most common issues (optional)
  echo -e "\nMost common issues:"
  grep -o "error .* " "$OUTPUT_FILE" | sort | uniq -c | sort -nr | head -5
fi
