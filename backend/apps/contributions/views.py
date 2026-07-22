from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Contribution
from .permissions import IsKycValidated
from .serializers import (
    ContributionCreateSerializer,
    ContributionSerializer,
    PaymentConfirmationSerializer,
)
from .services import process_simulated_payment


class ContributionCreateView(generics.CreateAPIView):
    serializer_class = ContributionCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsKycValidated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contribution = serializer.save()
        return Response(
            ContributionSerializer(contribution, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyContributionsView(generics.ListAPIView):
    serializer_class = ContributionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Contribution.objects.filter(contributor=self.request.user)
            .select_related("campaign", "contributor", "transaction")
            .order_by("-created_at")
        )


class ReceivedContributionsView(generics.ListAPIView):
    serializer_class = ContributionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Contribution.objects.filter(campaign__owner=self.request.user)
            .select_related("campaign", "contributor", "transaction")
            .order_by("-created_at")
        )


class ConfirmContributionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, reference):
        serializer = PaymentConfirmationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            contribution = Contribution.objects.get(
                public_reference=reference, contributor=request.user
            )
        except Contribution.DoesNotExist:
            return Response(
                {"detail": "Contribution introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contribution = process_simulated_payment(
            contribution=contribution,
            outcome=serializer.validated_data["outcome"],
        )
        contribution = Contribution.objects.select_related(
            "campaign", "contributor", "transaction"
        ).get(pk=contribution.pk)
        return Response(ContributionSerializer(contribution).data)
