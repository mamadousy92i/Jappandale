from django.urls import path

from .internal_views import InternalScoreView
from .views import MyScoreHistoryView, MyScoreView

urlpatterns = [
    path("mine/", MyScoreView.as_view(), name="score_mine"),
    path("mine/history/", MyScoreHistoryView.as_view(), name="score_history"),
    path("interne/<int:porteur_id>/", InternalScoreView.as_view(), name="score_internal"),
]
