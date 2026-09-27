from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    SessionViewSet, ScanViewSet, FlagViewSet,
    sync_scans_batch, final_results, export_final_results,
)

router = DefaultRouter()
router.register("sessions", SessionViewSet, basename="session")
router.register("scans", ScanViewSet, basename="scan")
router.register("flags", FlagViewSet, basename="flag")

# NOTE: explicit paths MUST come before router.urls — the router's detail
# pattern (<prefix>/<pk>/) would otherwise swallow scans/batch/ as pk="batch"
# and reject the POST with 405.
urlpatterns = [
    path("scans/batch/", sync_scans_batch, name="sync-scans-batch"),
    path("final-results/", final_results, name="final-results"),
    path("final-results/export/", export_final_results, name="export-final-results"),
] + router.urls
