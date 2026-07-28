from django.urls import path

from .views import MyScoreView

urlpatterns = [
    path("mine/", MyScoreView.as_view(), name="score_mine"),
]
