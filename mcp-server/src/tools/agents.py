"""MCP tool: list_agents - List all configured traffic generator agents."""

import logging
from typing import List

from ..lib.agent_client import AgentClient
from ..lib.config import load_agents
from ..types import AgentStatus

logger = logging.getLogger(__name__)


async def list_agents_tool() -> List[dict]:
    """
    List all configured SD-WAN traffic generator agents with their current status.
    
    This tool reads the agents configuration and queries each agent's status endpoint
    to provide real-time information about all available traffic generators.
    
    Returns:
        List of agent status dictionaries containing id, name, status, and url
        
    Example:
        [
            {
                "id": "paris",
                "name": "Paris Branch",
                "status": "running",
                "url": "http://sdwan-web-ui-paris:8080"
            },
            {
                "id": "london",
                "name": "London Branch",
                "status": "stopped",
                "url": "http://sdwan-web-ui-london:8080"
            }
        ]
    """
    try:
        agents = load_agents()
        agent_statuses = []
        
        for agent in agents:
            try:
                async with AgentClient(agent) as client:
                    status_data = await client.get_status()
                    
                    # Determine status from API response
                    traffic_running = status_data.get('trafficRunning', False)
                    status = "running" if traffic_running else "stopped"
                    
                    agent_status = AgentStatus(
                        id=agent.id,
                        name=agent.name,
                        status=status,
                        url=str(agent.url)
                    )
                    agent_statuses.append(agent_status.model_dump())
            
            except Exception as e:
                logger.error(f"Failed to get status for agent {agent.id}: {e}")
                # Return error status for unreachable agents
                agent_status = AgentStatus(
                    id=agent.id,
                    name=agent.name,
                    status="error",
                    url=str(agent.url)
                )
                agent_statuses.append(agent_status.model_dump())
        
        logger.info(f"Listed {len(agent_statuses)} agent(s)")
        return agent_statuses
    
    except Exception as e:
        logger.error(f"Failed to list agents: {e}")
        raise RuntimeError(f"Failed to list agents: {e}")
