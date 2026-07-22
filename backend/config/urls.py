from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.core.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/support/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/kyc/", include("apps.kyc.urls")),
    path("api/campaigns/", include("apps.campaigns.urls")),
    path("api/contributions/", include("apps.contributions.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/backoffice/", include("apps.backoffice.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
