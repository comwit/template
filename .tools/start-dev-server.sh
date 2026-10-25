
#!/bin/bash

# Port number (default: 3000).
PORT=${1:-3000}

# Move to the parent of the .tools directory.
cd "$(dirname "$0")/.." || exit 1

# Stop processes currently using the port.
echo "Checking port $PORT..."
./.tools/kill-port.sh "$PORT"

# Briefly wait for process cleanup.
sleep 1

echo "Starting development server on port $PORT..."
setsid pnpm run dev > dev_server.log 2> dev_server_error.log &

echo "Development server started (PID: $!)"
echo "Logs: dev_server.log, dev_server_error.log"
