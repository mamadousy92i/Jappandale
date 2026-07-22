from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentResult:
    success: bool
    failure_reason: str = ""


class SimulatedPaymentProvider:
    """Fournisseur déterministe utilisé pour les parcours locaux."""

    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

    def process(self, outcome):
        if outcome == self.SUCCESS:
            return PaymentResult(success=True)
        return PaymentResult(
            success=False,
            failure_reason="La contribution n’a pas été confirmée.",
        )
