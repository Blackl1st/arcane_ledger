#!/usr/bin/env bash
# Arcane Ledger - macOS / Linux Startup Script

# Navigate to the script directory
cd "$(dirname "$0")" || exit 1

echo "======================================================="
echo "  ARCANE LEDGER - D&D 5.5e (2024) DM DASHBOARD"
echo "======================================================="

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 could not be found. Please install Python 3.10+."
    exit 1
fi

# Create virtual environment if it does not exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment in ./venv..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start the application
echo "Starting Arcane Ledger DM Dashboard Backend..."
python app.py
