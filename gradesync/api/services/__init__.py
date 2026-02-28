"""
External Service Integrations

Unified module for all external service clients and sync operations.

Available Services:
- Gradescope: Assignment and grade management
- iClicker: Attendance tracking
- PrairieLearn: Online assessment platform

Usage:
    from api.services.gradescope import GradescopeClient, GradescopeSync
    from api.services.iclicker import IClickerClient, IClickerSync
    from api.services.prairielearn import PrairieLearnClient, PrairieLearnSync
"""

# Import all service clients for convenience
from .gradescope import GradescopeClient, GradescopeSync
from .iclicker import IClickerClient, IClickerSync
from .prairielearn import PrairieLearnClient, PrairieLearnSync, CourseInfo, AssessmentInfo

__all__ = [
    # Gradescope
    'GradescopeClient',
    'GradescopeSync',
    # iClicker
    'IClickerClient',
    'IClickerSync',
    # PrairieLearn
    'PrairieLearnClient',
    'PrairieLearnSync',
    'CourseInfo',
    'AssessmentInfo',
]
