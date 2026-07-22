from dataclasses import dataclass


@dataclass(frozen=True)
class PaymentResult:
    success: bool
    failure_reason: str = ""


class SimulatedPaymentProvider:
    """Fournisseur déterministe utilisé pour démontrer succès et échec."""

    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

    def process(self, outcome):
        if outcome == self.SUCCESS:
            return PaymentResult(success=True)
        return PaymentResult(
            success=False,
            failure_reason="Paiement refusé par le simulateur.",
        )
