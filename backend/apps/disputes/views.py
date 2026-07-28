from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.notifications.services import notify_admins

from .models import Dispute
from .serializers import DisputeCreateSerializer, DisputeSerializer


class DisputeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return DisputeSerializer

    def get_queryset(self):
        return (
            Dispute.objects.filter(reporter=self.request.user)
            .select_related("contribution__campaign")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = DisputeCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        contribution = serializer.validated_data["contribution"]
        dispute = Dispute.objects.create(
            contribution=contribution,
            reporter=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data["details"],
        )
        notify_admins(
            subject="Nouveau litige ouvert",
            message=(
                f"{request.user.email} a ouvert un litige sur une contribution de "
                f"{contribution.amount} FCFA à propos de « {contribution.campaign.title} »."
            ),
            action_url="/administration",
        )
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)
