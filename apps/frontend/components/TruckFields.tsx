export function TruckFields({
  truck,
  showGps = false,
}: {
  truck?: {
    plateNumber?: string | null;
    trailerPlateNumber?: string | null;
    country?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    cargoWeight?: number | null;
    currentLocation?: string | null;
    gpsNumber?: string | null;
  };
  // Operator-only — GPS number is as important as the plate number, so it
  // sits right next to it, but only the operator's own truck forms ever
  // render this input (admin's separate truck editor doesn't).
  showGps?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Field name="plateNumber" label="Truck plate number" defaultValue={truck?.plateNumber} />
      {showGps && <Field name="gpsNumber" label="GPS number" defaultValue={truck?.gpsNumber} />}
      <Field name="trailerPlateNumber" label="Trailer plate number" defaultValue={truck?.trailerPlateNumber} />
      <Field name="country" label="Country" defaultValue={truck?.country} />
      <Field name="driverName" label="Driver name" defaultValue={truck?.driverName} />
      <Field name="driverPhone" label="Driver phone" defaultValue={truck?.driverPhone} />
      <Field name="cargoWeight" label="Gross weight (tons)" type="number" defaultValue={truck?.cargoWeight} />
      <div className="col-span-2 sm:col-span-4">
        <Field name="currentLocation" label="Current location" defaultValue={truck?.currentLocation} />
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        step={type === "number" ? "0.01" : undefined}
        name={name}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
