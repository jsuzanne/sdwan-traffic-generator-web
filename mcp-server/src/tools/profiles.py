"""MCP tool: set_traffic_profile - Update agent traffic profile."""

import logging
from pathlib import Path
from typing import Optional

from ..lib.agent_client import AgentClient
from ..lib.config import load_agents

logger = logging.getLogger(__name__)


async def set_traffic_profile_tool(agent_id: str, profile: str) -> dict:
    """
    Set the traffic profile for a specific agent.
    
    This tool loads a traffic profile template from profiles/{profile}.txt
    and applies it to the specified agent by updating its applications.txt configuration.
    
    Args:
        agent_id: ID of the agent to update
        profile: Profile name (voice, iot, enterprise, etc.)
        
    Returns:
        Dictionary with agent_id, profile, and apps_count
        
    Example:
        Input: agent_id="paris", profile="voice"
        Output: {
            "agent_id": "paris",
            "profile": "voice",
            "apps_count": 4,
            "message": "Profile 'voice' applied to paris (4 applications)"
        }
    """
    try:
        # Load agent configuration
        agents = {agent.id: agent for agent in load_agents()}
        
        if agent_id not in agents:
            raise ValueError(f"Unknown agent ID: {agent_id}")
        
        agent = agents[agent_id]
        
        # Load profile template
        profile_path = Path(f"/app/profiles/{profile}.txt")
        if not profile_path.exists():
            raise ValueError(f"Profile not found: {profile}")
        
        with open(profile_path, 'r') as f:
            profile_content = f.read()
        
        # Count applications
        apps_count = len([line for line in profile_content.strip().split('\n') if line.strip()])
        
        # Update agent configuration
        async with AgentClient(agent) as client:
            await client.update_config(profile_content)
        
        message = f"Profile '{profile}' applied to {agent_id} ({apps_count} applications)"
        logger.info(message)
        
        return {
            "agent_id": agent_id,
            "profile": profile,
            "apps_count": apps_count,
            "message": message
        }
    
    except Exception as e:
        logger.error(f"Failed to set traffic profile: {e}")
        raise RuntimeError(f"Failed to set traffic profile: {e}")
