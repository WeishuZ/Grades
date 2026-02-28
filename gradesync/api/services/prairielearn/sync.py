"""
PrairieLearn Sync Module

High-level sync operations for PrairieLearn gradebook data.
"""
from typing import Dict, Any, Optional
import logging
from .client import PrairieLearnClient

logger = logging.getLogger(__name__)


class PrairieLearnSync:
    """
    Sync PrairieLearn grades to database.
    
    Orchestrates:
    - PrairieLearn API access
    - Gradebook retrieval
    - Database persistence
    """
    
    def __init__(
        self,
        api_token: str
    ):
        """
        Initialize PrairieLearn sync.
        
        Args:
            api_token: PrairieLearn API token
        """
        self.pl_client = PrairieLearnClient(api_token=api_token)
    
    def sync_course(
        self,
        course_id: str,
        save_to_db: bool = True
    ) -> Dict[str, Any]:
        """
        Sync a PrairieLearn course.
        
        Args:
            course_id: PrairieLearn course instance ID
            save_to_db: Whether to save to database
            
        Returns:
            Dictionary with sync results
        """
        logger.info(f"Starting PrairieLearn sync for course {course_id}")
        
        try:
            # Get course info
            course_info = self.pl_client.get_course_info(course_id)
            logger.info(f"Course: {course_info.title}")
            
            # Get gradebook
            gradebook_df = self.pl_client.get_gradebook(course_id)
            
            # Get assessments
            assessments = self.pl_client.get_assessments(course_id)
            
            # TODO: Save to database if save_to_db
            
            results = {
                "success": True,
                "course_id": course_id,
                "course_title": course_info.title,
                "assessments_synced": len(assessments),
                "students_synced": len(gradebook_df)
            }
            
            logger.info(f"Sync completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            raise
        finally:
            self.pl_client.close()
    
    def close(self):
        """Close clients."""
        self.pl_client.close()
