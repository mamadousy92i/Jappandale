from rest_framework import serializers

from .models import KycDocument


class KycDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )

    class Meta:
        model = KycDocument
        fields = ["id", "document_type", "document_type_display", "file", "uploaded_at"]
        read_only_fields = ["id", "document_type_display", "uploaded_at"]
