const { db, R } = require('./circuito');
async function conciliar(payment) {
  return db.sequelize.transaction(async (t) => {
    const pago = await db.Pago.findOne({
      where: { externalReference: String(payment.external_reference || '') },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!pago) return null;
    if (String(payment.collector_id) !== String(process.env.MP_COLLECTOR_ID))
      R.fail(
        409,
        'La operación no pertenece a la cuenta receptora configurada.',
      );
    const previo = await db.OperacionPago.findOne({
      where: { paymentId: String(payment.id) },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (previo && Number(previo.pagoId) !== Number(pago.id))
      R.fail(409, 'Referencia de operación inconsistente.');
    // Notificaciones repetidas y fuera de orden no revierten un estado más reciente.
    if (
      previo &&
      +new Date(previo.actualizadoProveedor) >=
        +new Date(payment.date_last_updated)
    )
      return pago;
    const valid = R.conciliable(payment, pago);
    const values = {
      pagoId: pago.id,
      paymentId: String(payment.id),
      estado: payment.status,
      monto: Number(payment.transaction_amount).toFixed(2),
      actualizadoProveedor: payment.date_last_updated || new Date(),
      rawPayment: payment,
    };
    if (previo) await previo.update(values, { transaction: t });
    else await db.OperacionPago.create(values, { transaction: t });
    const ops = await db.OperacionPago.findAll({
      where: { pagoId: pago.id },
      transaction: t,
    });
    const aprobadas = ops.filter((x) => x.estado === 'approved');
    const doble = aprobadas.length > 1;
    const aprobada = aprobadas[0];
    const elegido = aprobada?.rawPayment || payment;
    const parcial = Number(elegido.transaction_amount_refunded || 0) > 0;
    const ok =
      !doble &&
      !parcial &&
      R.conciliable(elegido, pago) &&
      elegido.status === 'approved';
    // Un rechazo de un segundo intento no borra un pago aprobado.
    const pending = ['pending', 'in_process', 'authorized'].includes(
      elegido.status,
    );
    await pago.update(
      {
        paymentId: String(elegido.id),
        estadoPago: elegido.status,
        estadoConciliacion: ok
          ? 'ok'
          : !valid || doble || parcial || !pending
            ? 'requiere_revision'
            : 'pendiente',
        payerEmail: elegido.payer?.email || null,
        paymentMethodId: elegido.payment_method_id || null,
        paymentTypeId: elegido.payment_type_id || null,
        fechaAprobacion: elegido.date_approved || null,
        rawPayment: elegido,
      },
      { transaction: t },
    );
    if (pago.cargoId)
      await db.CargoInscripcion.update(
        {
          estado: ok
            ? 'pagado'
            : pending && valid && !doble && !parcial
              ? 'pendiente'
              : 'requiere_revision',
        },
        { where: { id: pago.cargoId }, transaction: t },
      );
    return pago;
  });
}
module.exports = { conciliar };
