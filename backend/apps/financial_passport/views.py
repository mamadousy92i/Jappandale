from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.scoring.permissions import IsPorteur

from .models import PassportExport
from .pdf import render_passport_pdf
from .services import build_passport_data


class MyPassportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        return Response(build_passport_data(request.user))


class MyPassportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def post(self, request):
        snapshot = build_passport_data(request.user)
        export = PassportExport.objects.create(porteur=request.user, snapshot=snapshot)
        verification_path = reverse(
            "passport_verify", kwargs={"verification_id": export.verification_id}
        )
        verification_url = request.build_absolute_uri(verification_path)
        pdf_bytes = render_passport_pdf(
            snapshot=snapshot,
            verification_id=export.verification_id,
            verification_url=verification_url,
            generated_at=export.generated_at,
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="passeport-financier-{export.verification_id}.pdf"'
        )
        return response


class MyPassportExportsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def get(self, request):
        exports = PassportExport.objects.filter(porteur=request.user)[:10]
        return Response(
            [
                {
                    "verification_id": export.verification_id,
                    "generated_at": export.generated_at,
                    "is_shared": export.is_shared,
                    "shared_at": export.shared_at,
                }
                for export in exports
            ]
        )


class PassportSharingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPorteur]

    def patch(self, request, verification_id):
        export = get_object_or_404(
            PassportExport, porteur=request.user, verification_id=verification_id
        )
        is_shared = request.data.get("is_shared")
        if not isinstance(is_shared, bool):
            return Response(
                {"is_shared": ["Ce champ doit être un booléen."]}, status=400
            )
        export.is_shared = is_shared
        export.shared_at = timezone.now() if is_shared else None
        export.save(update_fields=["is_shared", "shared_at"])
        return Response(
            {
                "verification_id": export.verification_id,
                "generated_at": export.generated_at,
                "is_shared": export.is_shared,
                "shared_at": export.shared_at,
            }
        )


class PassportVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, verification_id):
        export = get_object_or_404(
            PassportExport, verification_id=verification_id, is_shared=True
        )
        return Response(
            {
                "valide": True,
                "porteur": export.snapshot.get("porteur_name"),
                "genere_le": export.generated_at,
                "resume": export.snapshot,
            }
        )
