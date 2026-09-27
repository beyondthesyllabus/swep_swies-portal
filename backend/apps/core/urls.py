from rest_framework.routers import DefaultRouter
from .views import LevelViewSet, DepartmentViewSet, ActivityViewSet, OperatorAccessGrantViewSet

router = DefaultRouter()
router.register("levels", LevelViewSet)
router.register("departments", DepartmentViewSet)
router.register("activities", ActivityViewSet)
router.register("access-grants", OperatorAccessGrantViewSet, basename="accessgrant")

urlpatterns = router.urls
