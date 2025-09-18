#!/bin/bash

# Kill processes on ports 3000, 3001, and 3002 for the carbon-aware-llm-proxy app
# Usage: sudo ./kill-ports.sh

PORTS=(3000 3001 3002)

echo "🔍 Checking for processes on ports: ${PORTS[*]}"
echo ""

# Check if user has sudo privileges
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script requires sudo privileges to kill processes."
   echo "🔄 Please run with: sudo $0"
   exit 1
fi

for port in "${PORTS[@]}"; do
    echo "📍 Checking port $port..."

    # Find process IDs using the port
    PIDS=$(lsof -ti :$port 2>/dev/null)

    if [ -z "$PIDS" ]; then
        echo "   ✅ No process found on port $port"
    else
        echo "   🔍 Found processes on port $port:"
        echo "   $PIDS"

        # Kill each process
        for pid in $PIDS; do
            echo "   ⚡ Killing process $pid..."

            # Try to kill gracefully first
            if kill -15 "$pid" 2>/dev/null; then
                echo "      ✅ Sent SIGTERM to $pid"

                # Wait a bit to see if it dies gracefully
                sleep 2

                # Check if still running and force kill if needed
                if kill -0 "$pid" 2>/dev/null; then
                    echo "      ⚠️  Process still running, forcing kill..."
                    if kill -9 "$pid" 2>/dev/null; then
                        echo "      ✅ Force killed process $pid"
                    else
                        echo "      ❌ Failed to kill process $pid"
                    fi
                else
                    echo "      ✅ Process terminated gracefully"
                fi
            else
                echo "      ❌ Failed to send SIGTERM to $pid"
            fi
        done

        # Verify port is now free
        sleep 1
        REMAINING=$(lsof -ti :$port 2>/dev/null)
        if [ -z "$REMAINING" ]; then
            echo "   ✅ Port $port is now free"
        else
            echo "   ❌ Port $port still in use by: $REMAINING"
        fi
    fi
    echo ""
done

echo "🎯 Port cleanup complete!"
echo ""
echo "💡 To check if ports are now free, run:"
echo "   lsof -i :3000"
echo "   lsof -i :3001"
echo "   lsof -i :3002"