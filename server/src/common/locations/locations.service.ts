import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DISTRICT_ROWS,
  DIVISION_ROWS,
  UPAZILA_ROWS,
} from './bd-locations.data';

export interface Division {
  id: string;
  name: string;
  bnName: string;
  aliases: string[];
}
export interface District {
  id: string;
  divisionId: string;
  name: string;
  bnName: string;
  aliases: string[];
}
export interface Upazila {
  id: string;
  districtId: string;
  name: string;
  bnName: string;
  // upazila, or a city police-station area (thana) of a metropolitan city
  kind: 'upazila' | 'thana';
}

export interface ResolvedLocation {
  division: string | null;
  district: string | null;
  upazila: string | null;
}

export interface LocationSearchHit {
  type: 'division' | 'district' | 'upazila' | 'thana';
  id: string;
  name: string;
  bnName: string;
  division?: { id: string; name: string };
  district?: { id: string; name: string };
}

// Older / alternative English spellings of divisions.
const DIVISION_ALIASES: Record<string, string[]> = {
  barishal: ['Barisal'],
  chattogram: ['Chittagong', 'Chattagram'],
};

// Lower-cases and drops everything but letters/digits (Latin or Bangla), so
// "Cox's Bazar", "coxs-bazar" and "COXS BAZAR" are the same key.
export function locationKey(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
}

@Injectable()
export class LocationsService {
  private readonly divisions: Division[];
  private readonly districts: District[];
  private readonly upazilas: Upazila[];

  private readonly divisionByKey = new Map<string, Division>();
  private readonly districtByKey = new Map<string, District>();
  // districtId → key → upazila
  private readonly upazilaByKey = new Map<string, Map<string, Upazila>>();
  private readonly upazilasByDistrict = new Map<string, Upazila[]>();
  private readonly districtsByDivision = new Map<string, District[]>();
  private readonly divisionById = new Map<string, Division>();
  private readonly districtById = new Map<string, District>();

  constructor() {
    this.divisions = DIVISION_ROWS.map(([id, name, bnName]) => ({
      id,
      name,
      bnName,
      aliases: DIVISION_ALIASES[id] ?? [],
    }));
    this.districts = DISTRICT_ROWS.map(
      ([id, divisionId, name, bnName, aliases]) => ({
        id,
        divisionId,
        name,
        bnName,
        aliases: [...aliases],
      }),
    );
    this.upazilas = UPAZILA_ROWS.map(([districtId, name, bnName, kind]) => ({
      id: `${districtId}-${locationKey(name)}`,
      districtId,
      name,
      bnName,
      kind: kind === 't' ? 'thana' : 'upazila',
    }));

    for (const d of this.divisions) {
      this.divisionById.set(d.id, d);
      for (const k of [d.id, d.name, d.bnName, ...d.aliases]) {
        this.divisionByKey.set(locationKey(k), d);
      }
    }
    for (const d of this.districts) {
      this.districtById.set(d.id, d);
      for (const k of [d.id, d.name, d.bnName, ...d.aliases]) {
        this.districtByKey.set(locationKey(k), d);
      }
      this.districtsByDivision.set(d.divisionId, [
        ...(this.districtsByDivision.get(d.divisionId) ?? []),
        d,
      ]);
    }
    for (const u of this.upazilas) {
      const keys =
        this.upazilaByKey.get(u.districtId) ?? new Map<string, Upazila>();
      for (const k of [u.id, u.name, u.bnName]) keys.set(locationKey(k), u);
      this.upazilaByKey.set(u.districtId, keys);
      this.upazilasByDistrict.set(u.districtId, [
        ...(this.upazilasByDistrict.get(u.districtId) ?? []),
        u,
      ]);
    }
  }

  getDivisions(): Division[] {
    return this.divisions;
  }

  findDivision(idOrName: string): Division | undefined {
    return this.divisionByKey.get(locationKey(idOrName));
  }

  findDistrict(idOrName: string): District | undefined {
    return this.districtByKey.get(locationKey(idOrName));
  }

  getDistrictsOf(division: Division): District[] {
    return this.districtsByDivision.get(division.id) ?? [];
  }

  getUpazilasOf(district: District): Upazila[] {
    return this.upazilasByDistrict.get(district.id) ?? [];
  }

  // The whole hierarchy, for clients that prefer one cached request.
  getTree() {
    return this.divisions.map((div) => ({
      ...div,
      districts: this.getDistrictsOf(div).map((dist) => ({
        id: dist.id,
        name: dist.name,
        bnName: dist.bnName,
        upazilas: this.getUpazilasOf(dist).map((u) => ({
          id: u.id,
          name: u.name,
          bnName: u.bnName,
          kind: u.kind,
        })),
      })),
    }));
  }

  counts() {
    return {
      divisions: this.divisions.length,
      districts: this.districts.length,
      upazilas: this.upazilas.filter((u) => u.kind === 'upazila').length,
      thanas: this.upazilas.filter((u) => u.kind === 'thana').length,
    };
  }

  // Autocomplete over names (English, old spellings, Bangla). Prefix matches
  // rank before substring matches; districts before upazilas.
  search(rawQuery: string, limit = 15): LocationSearchHit[] {
    const q = locationKey(rawQuery);
    if (q.length < 2) return [];

    const hits: { rank: number; hit: LocationSearchHit }[] = [];
    const score = (keys: string[], typeRank: number) => {
      let best = Infinity;
      for (const k of keys) {
        if (k === q) best = Math.min(best, 0);
        else if (k.startsWith(q)) best = Math.min(best, 1);
        else if (k.includes(q)) best = Math.min(best, 2);
      }
      return best === Infinity ? null : best * 10 + typeRank;
    };

    for (const d of this.divisions) {
      const r = score([d.name, d.bnName, ...d.aliases].map(locationKey), 0);
      if (r !== null) {
        hits.push({
          rank: r,
          hit: { type: 'division', id: d.id, name: d.name, bnName: d.bnName },
        });
      }
    }
    for (const d of this.districts) {
      const keys = [d.name, d.bnName, ...d.aliases].map(locationKey);
      const r = score(keys, 1);
      if (r !== null) {
        const div = this.divisionById.get(d.divisionId)!;
        hits.push({
          rank: r,
          hit: {
            type: 'district',
            id: d.id,
            name: d.name,
            bnName: d.bnName,
            division: { id: div.id, name: div.name },
          },
        });
      }
    }
    for (const u of this.upazilas) {
      const r = score([u.name, u.bnName].map(locationKey), 2);
      if (r !== null) {
        const dist = this.districtById.get(u.districtId)!;
        const div = this.divisionById.get(dist.divisionId)!;
        hits.push({
          rank: r,
          hit: {
            type: u.kind,
            id: u.id,
            name: u.name,
            bnName: u.bnName,
            division: { id: div.id, name: div.name },
            district: { id: dist.id, name: dist.name },
          },
        });
      }
    }

    return hits
      .sort((a, b) => a.rank - b.rank || a.hit.name.localeCompare(b.hit.name))
      .slice(0, limit)
      .map((h) => h.hit);
  }

  // Validates a division / district / upazila combination from an address
  // form and returns the canonical English names. Each value may be an id,
  // English name, old spelling or Bangla name. Missing parents are filled in
  // from the child (district → division); mismatches are rejected.
  resolve(input: {
    division?: string | null;
    district?: string | null;
    upazila?: string | null;
  }): ResolvedLocation {
    const out: ResolvedLocation = {
      division: null,
      district: null,
      upazila: null,
    };
    const clean = (v?: string | null) => v?.trim() || undefined;
    const divisionIn = clean(input.division);
    const districtIn = clean(input.district);
    const upazilaIn = clean(input.upazila);

    let division: Division | undefined;
    let district: District | undefined;

    if (divisionIn) {
      division = this.findDivision(divisionIn);
      if (!division) {
        throw new BadRequestException(`Unknown division "${divisionIn}"`);
      }
    }
    if (districtIn) {
      district = this.findDistrict(districtIn);
      if (!district) {
        throw new BadRequestException(`Unknown district "${districtIn}"`);
      }
      if (division && district.divisionId !== division.id) {
        throw new BadRequestException(
          `${district.name} district is not in ${division.name} division`,
        );
      }
      division = this.divisionById.get(district.divisionId);
    }
    if (upazilaIn) {
      if (!district) {
        throw new BadRequestException('Choose a district before the upazila');
      }
      const upazila = this.upazilaByKey
        .get(district.id)
        ?.get(locationKey(upazilaIn));
      if (!upazila) {
        throw new BadRequestException(
          `"${upazilaIn}" is not an upazila/thana of ${district.name} district`,
        );
      }
      out.upazila = upazila.name;
    }

    out.division = division?.name ?? null;
    out.district = district?.name ?? null;
    return out;
  }
}
