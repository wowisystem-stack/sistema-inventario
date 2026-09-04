from typing import Optional

import models


def log_action(
    db,
    actor: Optional["models.User"],
    action: str,
    description: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
) -> None:
    """Registra una entrada de auditoría en la misma transacción del caller.

    No hace commit: se agrega al Session y queda persistida junto con el
    db.commit() que el endpoint ya ejecuta para su propia operación.
    """
    db.add(models.ActivityLog(
        actor_id=actor.id if actor else None,
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
    ))
