import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LocationsService } from '../../common/locations';
import { SearchLocationsDto } from './locations.dto';

// Reference data that changes about once a decade: let browsers and CDNs
// keep it for a day.
const CACHE = 'public, max-age=86400';

@ApiTags('Customer - Locations')
@Public()
@Controller('customer/locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('divisions')
  @Header('Cache-Control', CACHE)
  @ApiOperation({ summary: 'All 8 divisions (English + Bangla names)' })
  divisions() {
    return this.locations.getDivisions();
  }

  @Get('divisions/:division/districts')
  @Header('Cache-Control', CACHE)
  @ApiOperation({
    summary: 'Districts of a division. :division is its id or name (dhaka)',
  })
  districts(@Param('division') divisionKey: string) {
    const division = this.locations.findDivision(divisionKey);
    if (!division) throw new NotFoundException('Division not found');
    return this.locations.getDistrictsOf(division);
  }

  @Get('districts/:district/upazilas')
  @Header('Cache-Control', CACHE)
  @ApiOperation({
    summary:
      'Upazilas (and city thanas) of a district. :district is its id, name or old spelling (cumilla / comilla)',
  })
  upazilas(@Param('district') districtKey: string) {
    const district = this.locations.findDistrict(districtKey);
    if (!district) throw new NotFoundException('District not found');
    return this.locations.getUpazilasOf(district);
  }

  @Get('tree')
  @Header('Cache-Control', CACHE)
  @ApiOperation({
    summary:
      'Whole hierarchy in one response (about 50 KB), for client-side caching',
  })
  tree() {
    return this.locations.getTree();
  }

  @Get('search')
  @ApiOperation({
    summary:
      'Find an area by typing (English, old spelling or Bangla): districts, upazilas, thanas',
  })
  search(@Query() q: SearchLocationsDto) {
    return this.locations.search(q.q, q.limit);
  }
}
