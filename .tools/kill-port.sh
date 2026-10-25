#!/bin/bash

# Receive the port number as an argument.
PORT=${1:-3000}

# Find process IDs using the port.
PIDS=$(ss -lptn "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)

# Exit with a message if no process IDs were found.
if [ -z "$PIDS" ]; then
  echo "No process found using port $PORT"
  exit 0
fi

# Stop process groups for all matched PIDs.
for PID in $PIDS; do
  PGID=$(ps -o pgid= -p $PID 2>/dev/null | tr -d ' ')
  if [ -n "$PGID" ]; then
    echo "Killing process group $PGID (PID: $PID) on port $PORT"
    kill -9 -$PGID 2>/dev/null || true
  fi
done

echo "Port $PORT is now free"
