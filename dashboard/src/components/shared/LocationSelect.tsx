import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/input";
import { Field } from "./Field";
import { locationsApi } from "@/api/locations";

export interface LocationValue {
  division: string; // division name
  district: string; // district name
  upazila: string; // area name
}

// Division → District → Upazila, from the same data the storefront uses.
// Values are the ENGLISH NAMES the API expects.
export function LocationSelect({ value, onChange, error }: { value: LocationValue; onChange: (v: LocationValue) => void; error?: string }) {
  const divisions = useQuery({ queryKey: ["loc-divisions"], queryFn: locationsApi.divisions, staleTime: Infinity });
  const divId = divisions.data?.find((d) => d.name === value.division)?.id;
  const districts = useQuery({ queryKey: ["loc-districts", divId], queryFn: () => locationsApi.districts(divId!), enabled: !!divId, staleTime: Infinity });
  const distId = districts.data?.find((d) => d.name === value.district)?.id;
  const areas = useQuery({ queryKey: ["loc-areas", distId], queryFn: () => locationsApi.areas(distId!), enabled: !!distId, staleTime: Infinity });

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Division">
        <Select value={value.division} onChange={(e) => onChange({ division: e.target.value, district: "", upazila: "" })}>
          <option value="">Select…</option>
          {divisions.data?.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label="District" required error={error}>
        <Select value={value.district} disabled={!divId} onChange={(e) => onChange({ ...value, district: e.target.value, upazila: "" })}>
          <option value="">Select…</option>
          {districts.data?.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label="Upazila / thana">
        <Select value={value.upazila} disabled={!distId} onChange={(e) => onChange({ ...value, upazila: e.target.value })}>
          <option value="">Optional</option>
          {areas.data?.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
        </Select>
      </Field>
    </div>
  );
}
