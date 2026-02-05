"""MCP tools for managing traffic generation test runs."""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from ..lib.agent_client import AgentClient
from ..lib.config import load_agents
from ..lib.storage import TestStorage
from ..types import Agent, AgentStats, AgentStatus, TestRun, TestStatus, TestSummary

logger = logging.getLogger(__name__)

# Initialize storage
storage = TestStorage()


async def start_traffic_test_tool(
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
        
    Returns:
        Dictionary with test_id and message
        
    Example:
        Input: agents=["paris", "london"], profile="voice", duration_minutes=3
        Output: {"test_id": "test-20260205-1015", "message": "Test started on 2 agents"}
    """
    try:
        # Load agent configurations
        all_agents = {agent.id: agent for agent in load_agents()}
        
        # Validate requested agents exist
        invalid_agents = [aid for aid in agents if aid not in all_agents]
        if invalid_agents:
            raise ValueError(f"Unknown agent IDs: {', '.join(invalid_agents)}")
        
        # Generate test ID
        test_id = f"test-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Create test run
        test = TestRun(
            id=test_id,
            start_time=datetime.now(),
            agents=agents,
            profile=profile,
            duration_minutes=duration_minutes,
            label=label,
            status="running"
        )
        
        # Start traffic on each agent
        started_agents = []
        for agent_id in agents:
            agent = all_agents[agent_id]
            try:
                async with AgentClient(agent) as client:
                    await client.start_traffic()
                    started_agents.append(agent_id)
            except Exception as e:
                logger.error(f"Failed to start traffic on {agent_id}: {e}")
                # Continue with other agents
        
        # Save test run
        storage.create_test(test)
        
        message = f"Test started on {len(started_agents)}/{len(agents)} agent(s)"
        logger.info(f"Test {test_id}: {message}")
        
        return {
            "test_id": test_id,
            "message": message,
            "started_agents": started_agents
        }
    
    except Exception as e:
        logger.error(f"Failed to start traffic test: {e}")
        raise RuntimeError(f"Failed to start traffic test: {e}")


async def stop_traffic_test_tool(test_id: str) -> dict:
    """
    Stop a running traffic generation test and collect final statistics.
    
    Args:
        test_id: ID of the test to stop
        
    Returns:
        Dictionary with test_id and final_stats
        
    Example:
        Input: test_id="test-20260205-1015"
        Output: {
            "test_id": "test-20260205-1015",
            "final_stats": {
                "paris": {"total_requests": 1250, "success_rate": 98.5, ...},
                "london": {"total_requests": 1180, "success_rate": 99.1, ...}
            }
        }
    """
    try:
        # Load test
        test = storage.get_test(test_id)
        if not test:
            raise ValueError(f"Test not found: {test_id}")
        
        if test.status != "running":
            raise ValueError(f"Test {test_id} is not running (status: {test.status})")
        
        # Load agent configurations
        all_agents = {agent.id: agent for agent in load_agents()}
        
        # Stop traffic and collect stats
        final_stats = {}
        for agent_id in test.agents:
            if agent_id not in all_agents:
                logger.warning(f"Agent {agent_id} not found in configuration")
                continue
            
            agent = all_agents[agent_id]
            try:
                async with AgentClient(agent) as client:
                    # Stop traffic
                    await client.stop_traffic()
                    
                    # Get final stats
                    stats = await client.get_stats()
                    final_stats[agent_id] = stats.model_dump()
            
            except Exception as e:
                logger.error(f"Failed to stop traffic on {agent_id}: {e}")
        
        # Update test
        test.status = "completed"
        test.end_time = datetime.now()
        test.final_stats = final_stats
        storage.update_test(test)
        
        logger.info(f"Test {test_id} completed")
        
        return {
            "test_id": test_id,
            "final_stats": final_stats
        }
    
    except Exception as e:
        logger.error(f"Failed to stop traffic test: {e}")
        raise RuntimeError(f"Failed to stop traffic test: {e}")


async def get_test_status_tool(test_id: Optional[str] = None) -> dict:
    """
    Get current status of a test run.
    
    Args:
        test_id: Test ID to check. If None, returns current running test.
        
    Returns:
        Dictionary with test status and agent statistics
        
    Example:
        Output: {
            "id": "test-20260205-1015",
            "status": "running",
            "elapsed_seconds": 125,
            "agents": [
                {
                    "id": "paris",
                    "name": "Paris Branch",
                    "status": "running",
                    "stats": {"total_requests": 850, "success_rate": 98.2, ...}
                }
            ]
        }
    """
    try:
        # Get test
        if test_id:
            test = storage.get_test(test_id)
        else:
            test = storage.get_current_running_test()
        
        if not test:
            if test_id:
                raise ValueError(f"Test not found: {test_id}")
            else:
                raise ValueError("No running test found")
        
        # Calculate elapsed time
        elapsed = (datetime.now() - test.start_time).total_seconds()
        
        # Load agent configurations
        all_agents = {agent.id: agent for agent in load_agents()}
        
        # Get current stats from each agent
        agent_statuses = []
        for agent_id in test.agents:
            if agent_id not in all_agents:
                continue
            
            agent = all_agents[agent_id]
            try:
                async with AgentClient(agent) as client:
                    status_data = await client.get_status()
                    stats = await client.get_stats()
                    
                    agent_status = AgentStatus(
                        id=agent.id,
                        name=agent.name,
                        status="running" if status_data.get('trafficRunning') else "stopped",
                        url=str(agent.url),
                        stats=stats
                    )
                    agent_statuses.append(agent_status.model_dump())
            
            except Exception as e:
                logger.error(f"Failed to get status for {agent_id}: {e}")
        
        # Build response
        test_status = TestStatus(
            id=test.id,
            status=test.status,
            elapsed_seconds=int(elapsed),
            agents=agent_statuses
        )
        
        return test_status.model_dump()
    
    except Exception as e:
        logger.error(f"Failed to get test status: {e}")
        raise RuntimeError(f"Failed to get test status: {e}")


async def list_tests_tool(limit: Optional[int] = 10) -> List[dict]:
    """
    List recent test runs.
    
    Args:
        limit: Maximum number of tests to return (default: 10)
        
    Returns:
        List of test summary dictionaries
        
    Example:
        Output: [
            {
                "id": "test-20260205-1015",
                "label": "Voice quality test",
                "start_time": "2026-02-05T10:15:00",
                "duration_minutes": 3,
                "status": "completed",
                "agent_count": 2,
                "profile": "voice"
            }
        ]
    """
    try:
        summaries = storage.list_tests(limit=limit)
        return [summary.model_dump(mode='json') for summary in summaries]
    
    except Exception as e:
        logger.error(f"Failed to list tests: {e}")
        raise RuntimeError(f"Failed to list tests: {e}")
