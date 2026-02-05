"""
Storage management for test runs.

This module handles CRUD operations for test runs, storing them as
JSON files in the data/tests/ directory.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from ..types import TestRun, TestSummary

logger = logging.getLogger(__name__)


class TestStorage:
    """Manages persistence of test runs to JSON files."""
    
    def __init__(self, data_dir: Path = Path("/app/data/tests")):
        """
        Initialize test storage.
        
        Args:
            data_dir: Directory where test JSON files are stored
        """
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Test storage initialized at {self.data_dir}")
    
    def _get_test_path(self, test_id: str) -> Path:
        """Get the file path for a test ID."""
        return self.data_dir / f"{test_id}.json"
    
    def create_test(self, test: TestRun) -> None:
        """
        Create a new test run.
        
        Args:
            test: TestRun object to persist
        """
        test_path = self._get_test_path(test.id)
        
        with open(test_path, 'w') as f:
            json.dump(test.model_dump(mode='json'), f, indent=2, default=str)
        
        logger.info(f"Created test run: {test.id}")
    
    def get_test(self, test_id: str) -> Optional[TestRun]:
        """
        Retrieve a test run by ID.
        
        Args:
            test_id: Test ID to retrieve
            
        Returns:
            TestRun object if found, None otherwise
        """
        test_path = self._get_test_path(test_id)
        
        if not test_path.exists():
            logger.warning(f"Test not found: {test_id}")
            return None
        
        try:
            with open(test_path, 'r') as f:
                data = json.load(f)
            
            return TestRun(**data)
        
        except Exception as e:
            logger.error(f"Failed to load test {test_id}: {e}")
            return None
    
    def update_test(self, test: TestRun) -> None:
        """
        Update an existing test run.
        
        Args:
            test: Updated TestRun object
        """
        test_path = self._get_test_path(test.id)
        
        with open(test_path, 'w') as f:
            json.dump(test.model_dump(mode='json'), f, indent=2, default=str)
        
        logger.info(f"Updated test run: {test.id}")
    
    def list_tests(self, limit: Optional[int] = 10) -> List[TestSummary]:
        """
        List all test runs, sorted by start time (newest first).
        
        Args:
            limit: Maximum number of tests to return
            
        Returns:
            List of TestSummary objects
        """
        test_files = sorted(
            self.data_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        summaries = []
        for test_file in test_files[:limit] if limit else test_files:
            try:
                with open(test_file, 'r') as f:
                    data = json.load(f)
                
                test = TestRun(**data)
                summary = TestSummary(
                    id=test.id,
                    label=test.label,
                    start_time=test.start_time,
                    duration_minutes=test.duration_minutes,
                    status=test.status,
                    agent_count=len(test.agents),
                    profile=test.profile
                )
                summaries.append(summary)
            
            except Exception as e:
                logger.error(f"Failed to load test from {test_file}: {e}")
                continue
        
        logger.info(f"Listed {len(summaries)} test(s)")
        return summaries
    
    def get_current_running_test(self) -> Optional[TestRun]:
        """
        Get the currently running test (if any).
        
        Returns:
            TestRun object if a running test exists, None otherwise
        """
        for test_file in self.data_dir.glob("*.json"):
            try:
                with open(test_file, 'r') as f:
                    data = json.load(f)
                
                test = TestRun(**data)
                if test.status == "running":
                    return test
            
            except Exception as e:
                logger.error(f"Failed to check test {test_file}: {e}")
                continue
        
        return None
