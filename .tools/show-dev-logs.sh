
#!/bin/bash

# Number of lines to show (default: 50).
LINES=${1:-50}

# Move to the parent of the .tools directory.
cd "$(dirname "$0")/.." || exit 1

echo "=== Development Server Logs (last $LINES lines) ==="
echo ""

if [ -f "dev_server.log" ]; then
  echo "--- STDOUT (dev_server.log) ---"
  tail -n "$LINES" dev_server.log
  echo ""
else
  echo "--- STDOUT (dev_server.log) ---"
  echo "Log file not found"
  echo ""
fi

if [ -f "dev_server_error.log" ]; then
  echo "--- STDERR (dev_server_error.log) ---"
  tail -n "$LINES" dev_server_error.log
  echo ""
else
  echo "--- STDERR (dev_server_error.log) ---"
  echo "Log file not found"
  echo ""
fi
