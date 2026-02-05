"""
SD-WAN Traffic Generator MCP Server.

This is the main entry point for the Model Context Protocol (MCP) server
that orchestrates multiple SD-WAN traffic generator instances via natural language.
"""

import asyncio
import logging
import os
import sys
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Import all MCP tools
from .tools.agents import list_agents_tool
from .tools.tests import (
    start_traffic_test_tool,
    stop_traffic_test_tool,
    get_test_status_tool,
    list_tests_tool
)
from .tools.profiles import set_traffic_profile_tool

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Initialize MCP server
app = Server("sdwan-mcp-server")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """
    List all available MCP tools.
    
    Returns:
        List of Tool objects describing available operations
    """
    return [
        Tool(
            name="list_agents",
            description="List all configured SD-WAN traffic generator agents with their current status",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="start_traffic_test",
            description="Start a coordinated traffic generation test across multiple agents",
            inputSchema={
                "type": "object",
                "properties": {
                    "agents": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of agent IDs to include in the test"
                    },
                    "profile": {
                        "type": "string",
                        "description": "Traffic profile name (voice, iot, enterprise)"
                    },
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Test duration in minutes"
                    },
                    "label": {
                        "type": "string",
                        "description": "Optional user-defined label for the test"
                    }
                },
                "required": ["agents", "profile", "duration_minutes"]
            }
        ),
        Tool(
            name="stop_traffic_test",
            description="Stop a running traffic generation test and collect final statistics",
            inputSchema={
                "type": "object",
                "properties": {
                    "test_id": {
                        "type": "string",
                        "description": "ID of the test to stop"
                    }
                },
                "required": ["test_id"]
            }
        ),
        Tool(
            name="get_test_status",
            description="Get current status of a test run (if test_id is omitted, returns current running test)",
            inputSchema={
                "type": "object",
                "properties": {
                    "test_id": {
                        "type": "string",
                        "description": "Test ID to check (optional, defaults to current running test)"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="list_tests",
            description="List recent test runs",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of tests to return (default: 10)"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="set_traffic_profile",
            description="Set the traffic profile for a specific agent",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "ID of the agent to update"
                    },
                    "profile": {
                        "type": "string",
                        "description": "Profile name (voice, iot, enterprise)"
                    }
                },
                "required": ["agent_id", "profile"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """
    Execute an MCP tool.
    
    Args:
        name: Tool name to execute
        arguments: Tool arguments
        
    Returns:
        List of TextContent responses
    """
    try:
        logger.info(f"Executing tool: {name} with arguments: {arguments}")
        
        if name == "list_agents":
            result = await list_agents_tool()
        
        elif name == "start_traffic_test":
            result = await start_traffic_test_tool(**arguments)
        
        elif name == "stop_traffic_test":
            result = await stop_traffic_test_tool(**arguments)
        
        elif name == "get_test_status":
            result = await get_test_status_tool(**arguments)
        
        elif name == "list_tests":
            result = await list_tests_tool(**arguments)
        
        elif name == "set_traffic_profile":
            result = await set_traffic_profile_tool(**arguments)
        
        else:
            raise ValueError(f"Unknown tool: {name}")
        
        # Format result as JSON string
        import json
        result_text = json.dumps(result, indent=2, default=str)
        
        logger.info(f"Tool {name} completed successfully")
        return [TextContent(type="text", text=result_text)]
    
    except Exception as e:
        logger.error(f"Tool {name} failed: {e}", exc_info=True)
        error_msg = f"Error executing {name}: {str(e)}"
        return [TextContent(type="text", text=error_msg)]


async def main():
    """Main entry point for the MCP server."""
    logger.info("Starting SD-WAN MCP Server...")
    logger.info(f"Log level: {log_level}")
    
    # Run server with stdio transport (for Claude Desktop)
    async with stdio_server() as (read_stream, write_stream):
        logger.info("MCP Server ready (stdio transport)")
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)
