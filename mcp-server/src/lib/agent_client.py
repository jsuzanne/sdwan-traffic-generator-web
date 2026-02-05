"""
HTTP client for communicating with SD-WAN traffic generator agents.

This module provides an async client for interacting with the REST APIs
of individual traffic generator instances.
"""

import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

import httpx

from ..types import Agent, AgentStats

logger = logging.getLogger(__name__)


class AgentClient:
    """Async HTTP client for a single SD-WAN traffic generator agent."""
    
    def __init__(self, agent: Agent, timeout: float = 10.0):
        """
        Initialize agent client.
        
        Args:
            agent: Agent configuration
            timeout: HTTP request timeout in seconds
        """
        self.agent = agent
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self._client = httpx.AsyncClient(timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
    
    def _generate_jwt_token(self) -> str:
        """
        Generate JWT token for authentication.
        
        Returns:
            JWT token string
        """
        payload = {
            'exp': datetime.utcnow() + timedelta(minutes=15),
            'iat': datetime.utcnow(),
            'sub': 'mcp-server'
        }
        return jwt.encode(payload, self.agent.jwt_secret, algorithm='HS256')
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers with JWT authentication."""
        token = self._generate_jwt_token()
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    async def get_status(self) -> Dict:
        """
        Get agent status.
        
        Returns:
            Status dictionary
            
        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.agent.url}/api/status"
        
        try:
            response = await self._client.get(url, headers=self._get_headers())
            response.raise_for_status()
            logger.debug(f"[{self.agent.id}] Status: {response.status_code}")
            return response.json()
        
        except Exception as e:
            logger.error(f"[{self.agent.id}] Failed to get status: {e}")
            raise
    
    async def start_traffic(self) -> Dict:
        """
        Start traffic generation on the agent.
        
        Returns:
            API response dictionary
            
        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.agent.url}/api/traffic/start"
        
        try:
            response = await self._client.post(url, headers=self._get_headers())
            response.raise_for_status()
            logger.info(f"[{self.agent.id}] Traffic started")
            return response.json()
        
        except Exception as e:
            logger.error(f"[{self.agent.id}] Failed to start traffic: {e}")
            raise
    
    async def stop_traffic(self) -> Dict:
        """
        Stop traffic generation on the agent.
        
        Returns:
            API response dictionary
            
        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.agent.url}/api/traffic/stop"
        
        try:
            response = await self._client.post(url, headers=self._get_headers())
            response.raise_for_status()
            logger.info(f"[{self.agent.id}] Traffic stopped")
            return response.json()
        
        except Exception as e:
            logger.error(f"[{self.agent.id}] Failed to stop traffic: {e}")
            raise
    
    async def get_stats(self) -> AgentStats:
        """
        Get current statistics from the agent.
        
        Returns:
            AgentStats object
            
        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.agent.url}/api/stats"
        
        try:
            response = await self._client.get(url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()
            
            # Parse stats from API response
            stats = AgentStats(
                total_requests=data.get('totalRequests', 0),
                success_rate=data.get('successRate', 0.0),
                top_app=data.get('topApp'),
                errors=data.get('totalErrors', 0),
                requests_by_app=data.get('requestsByApp', {}),
                errors_by_app=data.get('errorsByApp', {})
            )
            
            logger.debug(f"[{self.agent.id}] Stats: {stats.total_requests} requests, {stats.success_rate}% success")
            return stats
        
        except Exception as e:
            logger.error(f"[{self.agent.id}] Failed to get stats: {e}")
            raise
    
    async def update_config(self, applications: str) -> Dict:
        """
        Update agent's applications.txt configuration.
        
        Args:
            applications: Content for applications.txt
            
        Returns:
            API response dictionary
            
        Raises:
            httpx.HTTPError: If request fails
        """
        url = f"{self.agent.url}/api/config/apps"
        
        try:
            response = await self._client.post(
                url,
                headers=self._get_headers(),
                json={'content': applications}
            )
            response.raise_for_status()
            logger.info(f"[{self.agent.id}] Configuration updated")
            return response.json()
        
        except Exception as e:
            logger.error(f"[{self.agent.id}] Failed to update config: {e}")
            raise
