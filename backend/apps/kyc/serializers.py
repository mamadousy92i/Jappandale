from pathlib import Path

from PIL import Image, UnidentifiedImageError
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

    def validate_file(self, uploaded_file):
        if uploaded_file.size > 8 * 1024 * 1024:
            raise serializers.ValidationError("Le fichier ne doit pas dépasser 8 Mo.")

        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp", ".pdf"}:
            raise serializers.ValidationError(
                "Formats acceptés : JPG, PNG, WebP ou PDF."
            )

        try:
            if extension == ".pdf":
                if uploaded_file.read(5) != b"%PDF-":
                    raise serializers.ValidationError("Le document PDF est invalide.")
            else:
                Image.open(uploaded_file).verify()
        except (UnidentifiedImageError, OSError):
            raise serializers.ValidationError("Le fichier image est invalide.")
        finally:
            uploaded_file.seek(0)

        return uploaded_file
