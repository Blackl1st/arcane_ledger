#!/usr/bin/env bash
# Arcane Ledger - macOS Desktop Launcher
cd "$(dirname "$0")" || exit 1

if command -v python3 &> /dev/null; then
    python3 desktop_launcher.py
elif command -v python &> /dev/null; then
    python desktop_launcher.py
else
    echo "Error: Python 3 is required. Please install Python 3.10+ from python.org"
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi
