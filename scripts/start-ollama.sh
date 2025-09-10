#!/bin/sh

# Start Ollama server in the background
/usr/local/bin/ollama serve &

# Wait for server to start
while ! curl -s http://localhost:11434/api/tags >/dev/null; do
  echo "Waiting for Ollama to start..."
  sleep 1
done

# Pull the model
echo "Pulling Mistral model..."
/usr/local/bin/ollama pull mistral

# Keep container running
tail -f /dev/null
