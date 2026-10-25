
#!/bin/bash

# Port number (default: 3000).
PORT=${1:-3000}

# Timeout in seconds (default: 300 = 5 minutes).
TIMEOUT=${2:-300}

# Retry interval in seconds.
RETRY_INTERVAL=0.5

# Start time.
START_TIME=$(date +%s)

echo "Waiting for server on localhost:$PORT (timeout: ${TIMEOUT}s)..."

while true; do
  # Current time.
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  # Check for timeout.
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "ERROR: Timeout after ${TIMEOUT}s - Server not ready"
    exit 1
  fi

  # Check the server with curl; exit 0 on success, otherwise continue.
  if curl -s -f -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
    echo "SUCCESS: Server is ready on localhost:$PORT (took ${ELAPSED}s)"
    exit 0
  fi

  # Wait before retrying.
  echo "Server not ready yet... (elapsed: ${ELAPSED}s)"
  sleep $RETRY_INTERVAL
done
