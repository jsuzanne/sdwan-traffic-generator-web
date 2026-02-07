#!/usr/bin/env python3
import sys
import json
import httpx
import asyncio
from typing import Any

async def main():
    base_url = "http://localhost:3100"
    
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Create SSE session
        response = await client.get("/sse", headers={"Accept": "text/event-stream"})
        session_url = None
        
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                session_url = f"{base_url}{line[6:]}"
                break
        
        if not session_url:
            print("Failed to get session URL", file=sys.stderr)
            sys.exit(1)
        
        # Read from stdin, post to MCP, print responses
        async def read_stdin():
            loop = asyncio.get_event_loop()
            while True:
                line = await loop.run_in_executor(None, sys.stdin.readline)
                if not line:
                    break
                try:
                    msg = json.loads(line)
                    resp = await client.post(session_url, json=msg)
                    print(json.dumps(resp.json()))
                    sys.stdout.flush()
                except Exception as e:
                    print(f"Error: {e}", file=sys.stderr)
        
        await read_stdin()

if __name__ == "__main__":
    asyncio.run(main())

