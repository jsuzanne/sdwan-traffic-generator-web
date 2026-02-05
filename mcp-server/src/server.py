"""
SD-WAN Traffic Generator MCP Server.

This is the main entry point for the Model Context Protocol (MCP) server
that orchestrates multiple SD-WAN traffic generator instances.

Supports both SSE (Server-Sent Events) and STDIO transports.
"""

import logging
import os
import sys
from typing import Optional, List

# CRITICAL: All logs to stderr to avoid polluting stdio
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr  # NEVER use stdout
)

logger = logging.getLogger(__name__)

try:
    from fastmcp import FastMCP
except ImportError:
    logger.error("Failed to import fastmcp. Please install it with: pip install fastmcp")
    sys.exit(1)

# Import actual tool implementations
from .tools.agents import list_agents_tool
from .tools.tests import (
    start_traffic_test_tool,
    stop_traffic_test_tool,
    get_test_status_tool,
    list_tests_tool
)
from .tools.profiles import set_traffic_profile_tool

# Initialize FastMCP
mcp = FastMCP("sdwan-mcp-server")


# -----------------------------------------------------------------------------
# Tool Definitions
# -----------------------------------------------------------------------------

@mcp.tool()
async def list_agents() -> List[dict]:
    """
    List all configured SD-WAN traffic generator agents with their current status.
    """
    return await list_agents_tool()


@mcp.tool()
async def start_traffic_test(
    agents: List[str],
    profile: str,
    duration_minutes: int,
    label: Optional[str] = None
) -> dict:
    """
    Start a coordinated traffic generation test across multiple agents.
    
    Args:
        agents: List of agent IDs to include in the test
        profile: Traffic profile name (voice, iot, enterprise)
        duration_minutes: Test duration in minutes
        label: Optional user-defined label for the test
    """
    return await start_traffic_test_tool(
        agents=agents,
        profile=profile,
        duration_minutes=duration_minutes,
        label=label
    )


@mcp.tool()
async def stop_traffic_test(test_id: str) -> dict:
    """
    Stop a running traffic generation test and collect final statistics.
    
    Args:
        test_id: ID of the test to stop
    """
    return await stop_traffic_test_tool(test_id=test_id)


@mcp.tool()
async def get_test_status(test_id: Optional[str] = None) -> dict:
    """
    Get current status of a test run.
    
    Args:
        test_id: Test ID to check (optional, defaults to current running test)
    """
    return await get_test_status_tool(test_id=test_id)


@mcp.tool()
async def list_tests(limit: int = 10) -> List[dict]:
    """
    List recent test runs.
    
    Args:
        limit: Maximum number of tests to return (default: 10)
    """
    return await list_tests_tool(limit=limit)


@mcp.tool()
async def set_traffic_profile(agent_id: str, profile: str) -> dict:
    """
    Set the traffic profile for a specific agent.
    
    Args:
        agent_id: ID of the agent to update
        profile: Profile name (voice, iot, enterprise)
    """
    return await set_traffic_profile_tool(agent_id=agent_id, profile=profile)


# -----------------------------------------------------------------------------
# Main Entry Point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    # Read configuration from environment
    transport = os.getenv("MCP_TRANSPORT", "sse").lower()
    port = int(os.getenv("MCP_PORT", "3100"))
    host = os.getenv("MCP_HOST", "0.0.0.0")
    
    logger.info(f"Starting MCP server with {transport} transport")
    
    if transport == "sse":
        logger.info(f"SSE endpoint: http://{host}:{port}/sse")
        logger.info(f"Health check: http://{host}:{port}/health")
        logger.info("For Claude Desktop, use: npx -y @modelcontextprotocol/inspector http://localhost:3100/sse")
        mcp.run(transport="sse", port=port, host=host)
    else:
        logger.info("STDIO transport (direct Claude Desktop connection)")
        logger.info("Communicating via stdin/stdout")
        mcp.run(transport="stdio")
