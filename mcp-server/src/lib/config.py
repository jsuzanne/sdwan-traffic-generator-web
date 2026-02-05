"""
Configuration management for SD-WAN MCP Server.

This module handles loading and validating the agents configuration
from the config/agents.json file.
"""

import json
import logging
from pathlib import Path
from typing import List

from ..types import Agent, AgentConfig

logger = logging.getLogger(__name__)


def load_agents(config_path: Path = Path("/app/config/agents.json")) -> List[Agent]:
    """
    Load and validate agent configuration from JSON file.
    
    Args:
        config_path: Path to the agents.json configuration file
        
    Returns:
        List of validated Agent objects
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config file is invalid or fails validation
    """
    if not config_path.exists():
        logger.error(f"Configuration file not found: {config_path}")
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
        
        # Validate with Pydantic
        config = AgentConfig(**data)
        
        logger.info(f"Loaded {len(config.agents)} agent(s) from configuration")
        for agent in config.agents:
            logger.debug(f"  - {agent.id}: {agent.name} ({agent.url})")
        
        return config.agents
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in configuration file: {e}")
        raise ValueError(f"Invalid JSON in configuration file: {e}")
    
    except Exception as e:
        logger.error(f"Failed to load agent configuration: {e}")
        raise ValueError(f"Failed to load agent configuration: {e}")
