import { BadRequestException } from '@nestjs/common';
import {
  DISTRICT_ROWS,
  DIVISION_ROWS,
  UPAZILA_ROWS,
} from './bd-locations.data';
import { LocationsService, locationKey } from './locations.service';

describe('Bangladesh locations data', () => {
  const service = new LocationsService();

  it('has the official number of divisions and districts', () => {
    expect(DIVISION_ROWS).toHaveLength(8);
    expect(DISTRICT_ROWS).toHaveLength(64);
    const { upazilas, thanas } = service.counts();
    expect(upazilas + thanas).toBe(UPAZILA_ROWS.length);
    expect(upazilas).toBeGreaterThanOrEqual(490);
  });

  it('every district belongs to a known division and has upazilas', () => {
    const divisions = new Set(DIVISION_ROWS.map((d) => d[0]));
    for (const [id, divisionId] of DISTRICT_ROWS) {
      expect(divisions.has(divisionId)).toBe(true);
      const district = service.findDistrict(id)!;
      expect(service.getUpazilasOf(district).length).toBeGreaterThan(0);
    }
  });

  it('every upazila belongs to a known district', () => {
    const districts = new Set(DISTRICT_ROWS.map((d) => d[0]));
    for (const [districtId] of UPAZILA_ROWS) {
      expect(districts.has(districtId)).toBe(true);
    }
  });

  it('ids and per-district names are unique', () => {
    const ids = service
      .getTree()
      .flatMap((d) => d.districts.flatMap((x) => x.upazilas.map((u) => u.id)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(DISTRICT_ROWS.map((d) => d[0])).size).toBe(64);
  });

  it('has clean English and Bangla names everywhere', () => {
    const rows: readonly (readonly (string | readonly string[])[])[] = [
      ...DIVISION_ROWS,
      ...DISTRICT_ROWS,
      ...UPAZILA_ROWS,
    ];
    for (const row of rows) {
      for (const value of row) {
        if (typeof value !== 'string') continue;
        expect(value).toBe(value.trim());
        expect(value).not.toMatch(/\s{2,}/);
        // no control characters (tabs, newlines, ...)
        expect([...value].some((c) => c.charCodeAt(0) < 32)).toBe(false);
        expect(value.length).toBeGreaterThan(0);
      }
    }
    // Bangla names contain Bangla letters
    for (const row of UPAZILA_ROWS) expect(row[2]).toMatch(/[\u0980-\u09FF]/);
  });
});

describe('LocationsService.resolve', () => {
  const service = new LocationsService();

  it('returns canonical names and infers the division', () => {
    expect(
      service.resolve({ district: 'comilla', upazila: 'burichong' }),
    ).toEqual({
      division: 'Chattogram',
      district: 'Cumilla',
      upazila: 'Burichong',
    });
  });

  it('accepts Bangla names, ids and old spellings', () => {
    expect(service.resolve({ district: 'কুমিল্লা' }).district).toBe('Cumilla');
    expect(service.resolve({ district: 'jessore' }).district).toBe('Jashore');
    expect(service.resolve({ division: 'Barisal' }).division).toBe('Barishal');
    expect(service.resolve({ district: 'cox-s-bazar' }).district).toBe(
      "Cox's Bazar",
    );
  });

  it('allows empty input (nothing chosen)', () => {
    expect(service.resolve({})).toEqual({
      division: null,
      district: null,
      upazila: null,
    });
    expect(
      service.resolve({ division: '  ', district: '' }).district,
    ).toBeNull();
  });

  it.each([
    [{ division: 'Atlantis' }],
    [{ district: 'Atlantis' }],
    [{ division: 'Sylhet', district: 'Dhaka' }],
    [{ upazila: 'Savar' }],
    [{ district: 'Cumilla', upazila: 'Savar' }],
  ])('rejects %j', (input) => {
    expect(() => service.resolve(input)).toThrow(BadRequestException);
  });
});

describe('LocationsService.search', () => {
  const service = new LocationsService();

  it('finds by English, old spelling and Bangla', () => {
    expect(service.search('savar')[0]).toMatchObject({
      name: 'Savar',
      type: 'upazila',
    });
    expect(service.search('comilla')[0]).toMatchObject({
      name: 'Cumilla',
      type: 'district',
    });
    expect(service.search('সাভার').some((h) => h.name === 'Savar')).toBe(true);
  });

  it('ranks exact and prefix matches first and respects the limit', () => {
    const hits = service.search('dhaka', 2);
    expect(hits).toHaveLength(2);
    expect(hits.map((h) => h.type)).toEqual(['division', 'district']);
    expect(hits[0].name).toBe('Dhaka');
  });

  it('ignores 1-character queries', () => {
    expect(service.search('d')).toEqual([]);
  });
});

describe('locationKey', () => {
  it('treats punctuation and case as irrelevant', () => {
    expect(locationKey("Cox's Bazar")).toBe(locationKey('COXS-bazar'));
  });
});
